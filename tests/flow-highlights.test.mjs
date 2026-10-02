import test from 'node:test';
import assert from 'node:assert/strict';
import {flowEndpointIds,flowFrameHighlights,highlightLayers} from '../client/flow-highlights.mjs';
test('source trigger, enclosing frames and destination are highlighted without unrelated layers',()=>{
 const nodes=[{id:'home',type:'frame'},{id:'section',type:'frame',parentId:'home'},{id:'group',type:'group',parentId:'section'},{id:'button',type:'rectangle',parentId:'group'},{id:'other',type:'text',parentId:'section'},{id:'details',type:'frame'}];
 const h=highlightLayers(nodes,flowEndpointIds({fromFrameId:'section',triggerId:'button',toFrameId:'details'}));
 assert.deepEqual([...h.highlighted].sort(),['button','details','home','section']);
 assert.ok(h.path.has('group'));assert.ok(!h.highlighted.has('group'));assert.ok(!h.path.has('other'));
});
test('live references highlight both roots while the trigger belongs only to the source',()=>{
 const edge={from:'source_ref',to:'target_ref',trigger:{elementId:'button'}};
 assert.deepEqual(flowFrameHighlights(edge,'source_ref'),['source_ref','button']);
 assert.deepEqual(flowFrameHighlights(edge,'target_ref'),['target_ref']);
 assert.deepEqual(flowFrameHighlights(edge,'unrelated'),[]);
 assert.deepEqual(flowEndpointIds(edge),['source_ref','button','target_ref']);
});
test('self loops deduplicate endpoints and missing/cyclic ancestors are safe',()=>{
 assert.deepEqual(flowFrameHighlights({fromFrameId:'a',toFrameId:'a',triggerId:'button'},'a'),['a','button']);
 const nodes=new Map([['a',{id:'a',type:'frame',parentId:'b'}],['b',{id:'b',type:'group',parentId:'a'}]]);
 assert.deepEqual([...highlightLayers(nodes,['a','missing']).highlighted],['a']);
 assert.equal(highlightLayers(nodes,null).path.size,0);
});
