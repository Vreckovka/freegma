import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {FreegmaStore} from '../server/store.mjs';import {makeNode} from '../shared/design.mjs';
function fixture(){const store=new FreegmaStore(':memory:',{seed:false}),workspace=store.createWorkspace('Validation safety'),board=store.createBoard(workspace.id,'Board',{nodes:[makeNode('frame',{id:'frame'})]});return {store,workspace,board};}
test('an invalid intermediate operation cannot be repaired later inside a batch action',()=>{
 const {store,board}=fixture();try{
  const bytes=fs.readFileSync(board.filePath),history=store.history(board.id);
  assert.throws(()=>store.mutateBatch(board.id,board.revision,'invalid-intermediate',[{kind:'design',label:'Invalid then repair',operations:[{op:'update',id:'frame',patch:{width:-1}},{op:'update',id:'frame',patch:{width:200}}]}]));
  assert.deepEqual(store.getBoard(board.id),board);assert.deepEqual(store.history(board.id),history);assert.deepEqual(fs.readFileSync(board.filePath),bytes);
 }finally{store.close();}
});
test('batched design edits still reject missing assets and roll back prior valid actions',()=>{
 const {store,board}=fixture();try{
  const bytes=fs.readFileSync(board.filePath);
  assert.throws(()=>store.mutateBatch(board.id,board.revision,'missing-asset-batch',[{kind:'design',label:'Move',operations:[{op:'update',id:'frame',patch:{x:100}}]},{kind:'design',label:'Missing asset',operations:[{op:'add',node:makeNode('image',{id:'image',src:'/assets/missing_asset'})}]}]));
  assert.deepEqual(store.getBoard(board.id),board);assert.deepEqual(fs.readFileSync(board.filePath),bytes);
 }finally{store.close();}
});
test('batched edits preserve component property locks and atomic rollback',()=>{
 const {store,board}=fixture();try{
  const saved=store.saveComponent(board.id,board.revision,'frame','Shared frame');
  const placed=store.insertComponent(board.id,saved.board.revision,saved.component.id,{x:400,y:200}).board;
  const instance=placed.document.nodes.find(node=>node.componentId===saved.component.id),bytes=fs.readFileSync(board.filePath);
  assert.throws(()=>store.mutateBatch(board.id,placed.revision,'locked-property-batch',[{kind:'design',label:'Move ordinary frame',operations:[{op:'update',id:'frame',patch:{x:20}}]},{kind:'design',label:'Locked color',operations:[{op:'update',id:instance.id,patch:{fill:'#ff0000'}}]}]),error=>error.status===423);
  assert.deepEqual(store.getBoard(board.id),placed);assert.deepEqual(fs.readFileSync(board.filePath),bytes);
 }finally{store.close();}
});
