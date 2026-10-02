import test from 'node:test';
import assert from 'node:assert/strict';
import {flowTriggerNodes} from '../client/flow-trigger-nodes.mjs';
import {belongsToFrame} from '../shared/flow-overlay.mjs';
test('closed transition editor does not inspect nodes or ancestry',()=>{
 const unreadable=new Proxy([],{get(){throw Error('Closed editor scanned nodes');}});
 assert.deepEqual(flowTriggerNodes(unreadable,null,undefined,null,[]),[]);
});
test('native trigger choices preserve order, nested membership and traversal limits',()=>{
 const nodes=[{id:'frame',parentId:null},{id:'nested',parentId:'frame'},{id:'button',parentId:'nested'},{id:'outside',parentId:null},{id:'cycle_a',parentId:'cycle_b'},{id:'cycle_b',parentId:'cycle_a'}];
 for(let i=0;i<110;i++)nodes.push({id:'deep_'+i,parentId:i?'deep_'+(i-1):'frame'});
 const map=new Map(nodes.map(n=>[n.id,n]));
 for(const source of ['frame','nested','outside','missing'])assert.deepEqual(flowTriggerNodes(nodes,map,source,null,[]),nodes.filter(n=>n.id!==source&&belongsToFrame(map,n.id,source)));
 const moved=nodes.map(n=>n.id==='button'?{...n,parentId:'outside'}:n);
 assert(!flowTriggerNodes(moved,new Map(moved.map(n=>[n.id,n])),'frame',null,[]).some(n=>n.id==='button'));
});
test('linked frame choices use the latest fetched source elements directly',()=>{
 const reference={id:'linked'},before=[{id:'one'}],after=[{id:'two'}];
 assert.equal(flowTriggerNodes(null,null,'linked',reference,before),before);
 assert.equal(flowTriggerNodes(null,null,'linked',reference,after),after);
});
