import test from 'node:test';
import assert from 'node:assert/strict';
import {FreegmaStore} from '../server/store.mjs';
import {makeNode} from '../shared/design.mjs';
import {studioDocument} from '../shared/studio-designs.mjs';
import {linkStudioProject} from '../scripts/link-studio-components.mjs';
import {createServer} from '../server/http.mjs';
import {callTool} from '../server/tools.mjs';

test('saved master edits and undo/redo automatically update descendant instances, preserving labels and ordering',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const p=s.createProject('Product','light-dark'),c=s.components(p.workspace.id).find(c=>c.name==='Button');
  let master=s.getBoard(s.boards(p.workspace.id).find(b=>b.name==='Shared components').id);
  let child=s.createBoard(p.children[0].id,'Light board');const insert=s.insertComponent(child.id,child.revision,c.id,{x:240,y:50});child=insert.board;
  const label=child.document.nodes.find(n=>n.type==='text');child=s.mutate(child.id,child.revision,[{op:'override',id:label.id,property:'text',enabled:true},{op:'update',id:label.id,patch:{text:'My local label'}}]);
  const beforeOrder=s.getBoard(p.board.id).document.nodes.map(n=>n.id);
  master=s.mutate(master.id,master.revision,[{op:'update',id:'shared_button',patch:{radius:24,paddingLeft:30,name:'Action button'}}]);
  for(const boardId of [child.id,p.board.id]){const b=s.getBoard(boardId);for(const n of b.document.nodes.filter(n=>n.componentId===c.id))assert.equal(n.radius,24);}
  assert.equal(s.getBoard(child.id).document.nodes.find(n=>n.id===label.id).text,'My local label');
  assert.deepEqual(s.getBoard(p.board.id).document.nodes.map(n=>n.id),beforeOrder);
  master=s.travel(master.id,master.revision,'undo');assert.equal(s.getBoard(child.id).document.nodes[0].radius,8);
  master=s.travel(master.id,master.revision,'redo');assert.equal(s.getBoard(child.id).document.nodes[0].radius,24);
  const ref=s.componentReference(child.id,label.id);assert.equal(ref.id,c.id);assert.equal(ref.master.nodeId,'shared_button');assert.equal(ref.ownerId,p.workspace.id);assert.equal(ref.name,'Action button');assert.equal(ref.usageCount,3);assert.ok(ref.overrides.includes('text'));
 }finally{s.close();}
});

test('a master and its instances on the same board commit once and retain redo',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const w=s.createWorkspace('Same board');let b=s.createBoard(w.id,'Master',{nodes:[makeNode('frame',{id:'source',radius:7})]});const saved=s.saveComponent(b.id,b.revision,'source','Box');b=s.insertComponent(b.id,saved.board.revision,saved.component.id).board;
  const cursor=s.readBoard(b.id).cursor;b=s.mutate(b.id,b.revision,[{op:'update',id:'source',patch:{radius:19}}]);assert.equal(s.readBoard(b.id).cursor,cursor+1);assert.equal(b.document.nodes[1].radius,19);
  b=s.travel(b.id,b.revision,'undo');assert.equal(b.document.nodes[1].radius,7);assert.equal(b.canRedo,true);
  b=s.travel(b.id,b.revision,'redo');assert.equal(b.document.nodes[1].radius,19);
  const revision=b.revision;b=s.mutate(b.id,b.revision,[{op:'update',id:'source',patch:{x:100}}]);assert.equal(b.revision,revision+1);assert.equal(b.document.nodes[1].x,100); // placement remains its own 100
 }finally{s.close();}
});

test('automatic propagation is transactional when an instance update fails',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const p=s.createProject('Rollback','light-dark'),master=s.getBoard(s.boards(p.workspace.id).find(b=>b.name==='Shared components').id),before=s.getBoard(p.board.id);
  const write=s.writeBoard.bind(s);s.writeBoard=(board,...args)=>{if(board.id===p.board.id)throw Error('Injected failure');return write(board,...args);};
  assert.throws(()=>s.mutate(master.id,master.revision,[{op:'update',id:'shared_button',patch:{radius:80}}]),/Injected/);
  assert.equal(s.getBoard(master.id).revision,master.revision);assert.deepEqual(s.getBoard(p.board.id).document,before.document);
  assert.equal(s.component(s.components(p.workspace.id).find(c=>c.name==='Button').id).definition.nodes[0].radius,8);
 }finally{s.close();}
});

test('studio migration creates real parent references without altering appearance, layout, order or IDs',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const root=s.createWorkspace('Freegma'),light=s.createWorkspace('Light Mode',root.id),dark=s.createWorkspace('Dark Mode',root.id),originals=[];
  for(const [ws,mode] of [[light,'light'],[dark,'dark']])originals.push(s.createBoard(ws.id,'Layer inspector & spacing',studioDocument(mode,'Layer inspector & spacing')));
  const result=linkStudioProject(s,root.id);assert.equal(result.boards,2);assert.ok(result.instances>30);assert.ok(result.components>3);
  const clean=n=>{const copy=structuredClone(n);for(const k of ['componentId','componentMasterId','sourceId','overrides'])delete copy[k];return copy;};
  for(const b of originals){const migrated=s.getBoard(b.id);assert.deepEqual(migrated.document.nodes.map(clean),b.document.nodes.map(clean));const button=migrated.document.nodes.find(n=>n.name==='Copy link'&&n.componentId),ref=s.componentReference(b.id,button.id);assert.equal(ref.ownerId,root.id);assert.equal(ref.master.boardId,result.masterBoardId);}
  const migrated=s.getBoard(originals[0].id),button=migrated.document.nodes.find(n=>n.name==='Copy link'&&n.componentId),ref=s.componentReference(migrated.id,button.id);let master=s.getBoard(ref.master.boardId);master=s.mutate(master.id,master.revision,[{op:'update',id:ref.master.nodeId,patch:{radius:17}}]);
  for(const b of originals){const n=s.getBoard(b.id).document.nodes.find(n=>n.name==='Copy link'&&n.componentId);assert.equal(n.radius,17);assert.equal(n.width,108);}
  assert.throws(()=>linkStudioProject(s,root.id),/already exists/);
 }finally{s.close();}
});

test('HTTP and MCP expose the same component references, including child selections',async()=>{
 const s=new FreegmaStore(':memory:',{seed:false}),p=s.createProject('References','light-dark'),node=p.board.document.nodes.find(n=>n.sourceId&&n.type==='text'),server=createServer({store:s});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const http=await fetch(`http://127.0.0.1:${server.address().port}/api/boards/${p.board.id}/components/${node.id}`);assert.equal(http.status,200);assert.deepEqual(await http.json(),callTool(s,'freegma_component_reference',{boardId:p.board.id,nodeId:node.id}));assert.equal(s.componentReference(p.board.id,'example'),null);}finally{await new Promise(r=>server.close(r));s.close();}
});
