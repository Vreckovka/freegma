import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {FreegmaStore} from '../server/store.mjs';import {validateBoard,boardPath} from '../server/files.mjs';import {encodeFree,decodeFree} from '../server/free-format.mjs';import {makeNode} from '../shared/design.mjs';
function fixture(){const store=new FreegmaStore(':memory:',{seed:false}),workspace=store.createWorkspace('Published snapshots'),board=store.createBoard(workspace.id,'Board',{nodes:[makeNode('frame',{id:'frame'})]});return {store,workspace,board,file:boardPath(workspace.id,board.id)};}
test('successful publishes retain exact validated snapshots without decoding them again',()=>{
 const {store:s,board:b,file}=fixture();try{let decodes=0;const decode=s.files.decoded.bind(s.files);s.files.decoded=relative=>{if(relative===file)decodes++;return decode(relative);};
 const changed=s.mutate(b.id,b.revision,[{op:'update',id:'frame',patch:{x:80}}]),after=decodes;assert.ok(after>0);const read=s.getBoard(b.id);assert.deepEqual(read,changed);read.document.nodes[0].x=999;assert.equal(s.getBoard(b.id).document.nodes[0].x,80);assert.equal(decodes,after);
 assert.deepEqual(s.readBoard(b.id),decodeFree(fs.readFileSync(changed.filePath)).value);assert.equal(decodes,after);const undo=s.travel(b.id,changed.revision,'undo');assert.equal(undo.document.nodes[0].x,0);assert.equal(s.travel(b.id,undo.revision,'redo').document.nodes[0].x,80);assert.equal(s.files.cacheBytes,[...s.files.cache.values()].reduce((n,e)=>n+e.bytes,0));
 }finally{s.close();}
});
test('changed files and different validators cannot reuse a published validation result',()=>{
 const {store:s,board:b,file}=fixture();try{const changed=s.mutate(b.id,b.revision,[{op:'update',id:'frame',patch:{x:80}}]);const stricter=value=>{validateBoard(value);throw Error('Additional validator required');};assert.throws(()=>s.files.validated(file,stricter),/Additional validator/);
 const native=s.readBoard(b.id);native.history[0].seq=99;fs.writeFileSync(changed.filePath,encodeFree(native));assert.throws(()=>s.getBoard(b.id),/Invalid board history/);
 }finally{s.close();}
});
test('unvalidated restages and mismatched published bytes cannot inherit earlier validation',()=>{
 const {store:s,board:b,file}=fixture();try{const native=s.readBoard(b.id);s.files.pending=new Map();s.files.stage(file,native);s.files.validated(file,validateBoard,false);const invalid=encodeFree({...native,revision:0});s.files.publish({file,base64:invalid.toString('base64')});s.files.pending=null;assert.throws(()=>s.readBoard(b.id),/Invalid board metadata/);
 // Restaging changes the byte identity and therefore the available validation.
 s.files.pending=new Map();s.files.stage(file,native);s.files.validated(file,validateBoard,false);s.files.stage(file,invalid);s.files.flush();s.files.pending=null;assert.throws(()=>s.readBoard(b.id),/Invalid board metadata/);
 }finally{s.files.pending=null;s.close();}
});
test('recovery after a publish/commit failure invalidates promoted snapshots and retains complete history',()=>{
 const {store:s,board:b}=fixture();try{const exec=s.db.exec.bind(s.db);let failCommit=true;s.db.exec=sql=>{if(sql==='COMMIT'&&failCommit){failCommit=false;throw Error('Injected commit failure');}return exec(sql);};
 assert.throws(()=>s.mutate(b.id,b.revision,[{op:'update',id:'frame',patch:{x:77}}]),/Injected commit failure/);assert.ok(fs.existsSync(s.files.resolve('.transaction.json')));const recovered=s.getBoard(b.id);assert.equal(recovered.revision,b.revision+1);assert.equal(recovered.document.nodes[0].x,77);assert.equal(fs.existsSync(s.files.resolve('.transaction.json')),false);assert.equal(s.travel(b.id,recovered.revision,'undo').document.nodes[0].x,0);assert.deepEqual(s.readBoard(b.id),decodeFree(fs.readFileSync(recovered.filePath)).value);
 }finally{s.close();}
});
