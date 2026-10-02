import test from 'node:test';import assert from 'node:assert/strict';
import {FreegmaStore} from '../server/store.mjs';import {makeNode} from '../shared/design.mjs';import {instanceLockStoreMethods} from '../server/instance-locks-store.mjs';
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
test('ordinary and compound edit preparation keep all input layers independent, including a failed later action',()=>{
 const input={version:1,nodes:[makeNode('frame',{id:'frame'}),makeNode('text',{id:'label',parentId:'frame',text:'Original'})]},before=structuredClone(input),context={...instanceLockStoreMethods};freeze(input);
 const operations=[{op:'update',id:'label',patch:{text:'Changed'}},{op:'update',id:'frame',patch:{x:40}},{op:'reorder',id:'label',index:0}];const result=context.lockedOperations(input,operations);assert.equal(result.nodes[1].text,'Changed');assert.equal(result.nodes[0].x,40);assert.deepEqual(input,before);result.nodes[0].x=900;assert.equal(input.nodes[0].x,0);
 assert.throws(()=>context.lockedOperations(input,[...operations,{op:'update',id:'missing',patch:{text:'Bad'}}]),/Layer not found/);assert.deepEqual(input,before);assert.throws(()=>context.lockedOperations(input,[]),/Supply 1/);assert.deepEqual(input,before);
});
test('first or later override expansion cannot mutate a borrowed instance or leak changes after failure',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const p=s.createProject('Owned overrides','light-dark'),instance=p.board.document.nodes.find(n=>n.componentId&&n.name==='Button');let board=s.mutate(p.board.id,p.board.revision,[{op:'override',id:instance.id,property:'cssOverrides',enabled:true},{op:'update',id:instance.id,patch:{cssOverrides:{'box-shadow':'0 1px 2px #123456','text-shadow':'0 1px 1px #654321'}}}]);
 const input=board.document,before=structuredClone(input);freeze(input);const reset={op:'override',id:instance.id,property:'cssOverrides.box-shadow',enabled:false},root=input.nodes.find(n=>!n.parentId&&!n.componentId),move={op:'update',id:root.id,patch:{x:root.x+10}};
 for(const operations of [[reset],[move,reset]]){const result=s.lockedOperations(input,operations),node=result.nodes.find(n=>n.id===instance.id);assert.deepEqual(input,before);assert.deepEqual(node.overrides,['cssOverrides.text-shadow']);assert.equal(node.cssOverrides['text-shadow'],'0 1px 1px #654321');assert.equal(Object.hasOwn(node.cssOverrides,'box-shadow'),false);}
 for(const operations of [[reset],[move,reset]])assert.throws(()=>s.lockedOperations(input,[...operations,{op:'update',id:instance.id,patch:{gap:90}}]),e=>e.status===423);
 assert.deepEqual(input,before);assert.deepEqual(s.getBoard(board.id).document,before);
 }finally{s.close();}
});
