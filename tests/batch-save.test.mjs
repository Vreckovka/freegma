import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {FreegmaStore} from '../server/store.mjs';import {makeNode} from '../shared/design.mjs';
const move=x=>({kind:'design',label:'Move '+x,operations:[{op:'update',id:'frame',patch:{x}}]});
function fixture(){const s=new FreegmaStore(':memory:',{seed:false}),w=s.createWorkspace('Batch'),b=s.createBoard(w.id,'Board',{nodes:[makeNode('frame',{id:'frame'})]});return {s,b};}
test('one atomic publish saves a burst but each completed action keeps its own undo step',()=>{
 const {s,b}=fixture();try{let flushes=0;const flush=s.files.flush.bind(s.files);s.files.flush=(...a)=>{flushes++;return flush(...a);};const saved=s.mutateBatch(b.id,b.revision,'batch-burst-1',[move(10),move(20),move(30)]);
 assert.equal(flushes,1);assert.equal(saved.revision,b.revision+3);assert.deepEqual(s.history(b.id).map(h=>h.label),['Move 30','Move 20','Move 10']);
 let undo=s.travel(b.id,saved.revision,'undo');assert.equal(undo.document.nodes[0].x,20);undo=s.travel(b.id,undo.revision,'undo');assert.equal(undo.document.nodes[0].x,10);assert.equal(s.travel(b.id,undo.revision,'redo').document.nodes[0].x,20);
 }finally{s.close();}
});
test('a late invalid action rolls back all edits, receipts and history; stale revisions cannot overwrite the board',()=>{
 const {s,b}=fixture();try{const bytes=fs.readFileSync(b.filePath);assert.throws(()=>s.mutateBatch(b.id,b.revision,'batch-invalid',[move(10),{kind:'design',label:'Invalid',operations:[{op:'update',id:'missing',patch:{x:20}}]}]));assert.deepEqual(s.getBoard(b.id),b);assert.deepEqual(fs.readFileSync(b.filePath),bytes);
 const saved=s.mutateBatch(b.id,b.revision,'batch-valid-1',[move(50)]);assert.throws(()=>s.mutateBatch(b.id,b.revision,'batch-stale-1',[move(100)]),e=>e.status===409);assert.equal(s.getBoard(b.id).document.nodes[0].x,50);assert.equal(saved.revision,b.revision+1);
 }finally{s.close();}
});
test('durable batch identity survives restart and rejects reuse with another payload',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-batch-'));let s;try{s=new FreegmaStore(path.join(folder,'index.sqlite'),{seed:false});const w=s.createWorkspace('Restart'),b=s.createBoard(w.id,'Board',{nodes:[makeNode('frame',{id:'frame'})]}),actions=[move(42)],saved=s.mutateBatch(b.id,b.revision,'batch-durable',actions);s.close();s=new FreegmaStore(path.join(folder,'index.sqlite'),{seed:false});const stamp=fs.statSync(saved.filePath,{bigint:true}).mtimeNs;
 assert.equal(s.mutateBatch(b.id,b.revision,'batch-durable',actions).revision,saved.revision);assert.equal(fs.statSync(saved.filePath,{bigint:true}).mtimeNs,stamp);assert.throws(()=>s.mutateBatch(b.id,b.revision,'batch-durable',[move(43)]),e=>e.status===409);
 }finally{s?.close();fs.rmSync(folder,{recursive:true,force:true});}
});
test('all-no-op batches preserve file bytes, revision and redo',()=>{
 const {s,b}=fixture();try{const changed=s.mutate(b.id,b.revision,move(10).operations),undone=s.travel(b.id,changed.revision,'undo'),bytes=fs.readFileSync(b.filePath);const same=s.mutateBatch(b.id,undone.revision,'batch-no-ops',[move(0),move(0)]);assert.deepEqual(same,undone);assert.equal(same.canRedo,true);assert.deepEqual(fs.readFileSync(b.filePath),bytes);}finally{s.close();}
});
test('flow and overlay actions batch atomically, including references, decision symbols and routing',()=>{
 const {s,b}=fixture();try{let f=s.createFlowWorkspace('Flows').board;f=s.mutateBatch(f.id,f.revision,'batch-flow-1',[{kind:'flow',label:'Start',operations:[{op:'addNode',node:{id:'start',kind:'start',title:'Start',explanation:'',x:0,y:0}}]},{kind:'flow',label:'Move',operations:[{op:'updateNode',id:'start',patch:{x:80}}]}]);assert.equal(f.document.flow.nodes[0].x,80);assert.equal(s.travel(f.id,f.revision,'undo').document.flow.nodes[0].x,0);
 const overlay=s.mutateBatch(b.id,b.revision,'batch-overlay',[{kind:'overlay',label:'Decision',operations:[{op:'addSymbol',symbol:{id:'decision',kind:'decision',title:'Allowed?',explanation:'',x:400,y:100}}]}]);assert.equal(overlay.document.flowOverlay.symbols[0].kind,'decision');
 assert.throws(()=>s.mutateBatch(b.id,overlay.revision,'batch-bad-ref',[{kind:'overlay',label:'Bad reference',operations:[{op:'addFrame',frame:{id:'bad',reference:{boardId:'missing',frameId:'missing'},x:0,y:0}}]}]));assert.equal(s.getBoard(b.id).revision,overlay.revision);
 }finally{s.close();}
});
test('batch edits respect instance locks and propagate final master changes',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const p=s.createProject('Reusable','light-dark'),master=s.getBoard(s.boards(p.workspace.id).find(b=>b.name==='Shared components').id),instance=p.board.document.nodes.find(n=>n.componentId&&n.name==='Button');assert.throws(()=>s.mutateBatch(p.board.id,p.board.revision,'batch-locked',[{kind:'design',label:'Locked',operations:[{op:'update',id:instance.id,patch:{fill:'#111111'}}]}]),e=>e.status===423);
 s.mutateBatch(master.id,master.revision,'batch-master',[{kind:'design',label:'Master',operations:[{op:'update',id:'shared_button',patch:{radius:15}}]},{kind:'design',label:'Master final',operations:[{op:'update',id:'shared_button',patch:{radius:19}}]}]);assert.equal(s.getBoard(p.board.id).document.nodes.find(n=>n.id===instance.id).radius,19);
 }finally{s.close();}
});
