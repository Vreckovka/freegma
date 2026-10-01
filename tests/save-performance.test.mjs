import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FreegmaStore} from '../server/store.mjs';
import {makeNode,subtree} from '../shared/design.mjs';
import {materializeSchematics,resolveDocument} from '../shared/colors.mjs';
import {validateBoard} from '../server/files.mjs';

test('unchanged completed actions preserve revision, file bytes and redo history',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const w=s.createWorkspace('Performance'),original=s.createBoard(w.id,'Board',{nodes:[makeNode('frame',{id:'frame'})]});
  const edited=s.mutate(original.id,original.revision,[{op:'update',id:'frame',patch:{x:90}}]);
  const undone=s.travel(edited.id,edited.revision,'undo'),bytes=fs.readFileSync(undone.filePath),stamp=fs.statSync(undone.filePath,{bigint:true}).mtimeNs;
  const same=s.mutate(undone.id,undone.revision,[{op:'update',id:'frame',patch:{x:0}}]);
  assert.deepEqual(same,undone);assert.equal(same.canRedo,true);assert.deepEqual(fs.readFileSync(same.filePath),bytes);assert.equal(fs.statSync(same.filePath,{bigint:true}).mtimeNs,stamp);
  assert.equal(s.travel(same.id,same.revision,'redo').document.nodes[0].x,90);
  assert.throws(()=>s.mutate(same.id,original.revision,[]),e=>e.status===409);
 }finally{s.close();}
});
test('unchanged flow drags do not create history; valid changes remain atomic and undoable',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  let b=s.createFlowWorkspace('Flows').board;
  b=s.mutateFlow(b.id,b.revision,[{op:'addNode',node:{id:'start',kind:'start',title:'Start',explanation:'',x:30,y:50}}]);
  const same=s.mutateFlow(b.id,b.revision,[{op:'updateNode',id:'start',patch:{x:30}}]);assert.equal(same.revision,b.revision);assert.equal(s.history(b.id).length,1);
  const moved=s.mutateFlow(b.id,b.revision,[{op:'updateNode',id:'start',patch:{x:80}}]);assert.equal(moved.revision,b.revision+1);assert.equal(s.travel(b.id,moved.revision,'undo').document.flow.nodes[0].x,30);
 }finally{s.close();}
});
test('targeted frame previews preserve colors, generated schematics and source immutability',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const w=s.createWorkspace('Colors');let b=s.createBoard(w.id,'Board',{nodes:[makeNode('frame',{id:'outer'}),makeNode('frame',{id:'inner',parentId:'outer',x:100,fill:'#101219',colorBindings:[{path:'fill',token:'background',source:'#101219'}]}),makeNode('text',{id:'label',parentId:'inner'})]});
  b=s.insertColorSchematic(b.id,b.revision,{x:1000,y:0}).board;
  for(const id of ['inner',b.document.nodes.find(n=>n.colorSchematic).id]){
   const expected=subtree(materializeSchematics(resolveDocument(b.document,b.palette),b.palette,makeNode),id),actual=s.flowPreview(b.id,id);
   assert.deepEqual(actual.document,expected);
  }
  assert.deepEqual(s.getBoard(b.id).document,b.document);assert.throws(()=>s.flowPreview(b.id,'missing'),e=>e.status===404);
 }finally{s.close();}
});
test('staged validation is reused only for identical bytes and detects an invalid restage',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const w=s.createWorkspace('Cached validation'),b=s.createBoard(w.id,'Board');let calls=0;const check=value=>{calls++;return validateBoard(value);};
  assert.throws(()=>s.transaction(()=>{
   const raw=s.readBoard(b.id),file=s.ref('board',b.id).path;s.files.stage(file,raw);
   const first=s.files.validated(file,check);first.name='Do not leak';assert.equal(s.files.validated(file,check).name,'Board');assert.equal(calls,1);
   s.files.stage(file,{...raw,revision:0});s.files.validated(file,check);
  }),/metadata/);
  assert.equal(calls,2);assert.deepEqual(s.getBoard(b.id),b);
 }finally{s.close();}
});
