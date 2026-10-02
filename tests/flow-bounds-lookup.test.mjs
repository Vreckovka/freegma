import test from 'node:test';import assert from 'node:assert/strict';
import {createFlowBoundsLookup} from '../client/flow-bounds-lookup.mjs';
test('a geometry pass reads each endpoint once, including absent and shared endpoints',()=>{
 const calls=[],value={left:12,top:18,width:20,height:30},lookup=createFlowBoundsLookup(id=>{calls.push(id);return id==='missing'?null:value;});
 for(let i=0;i<1000;i++){assert.equal(lookup('frame'),value);assert.equal(lookup('missing'),null);}assert.deepEqual(calls,['frame','missing']);
});
test('a new pass observes changed measurements; failed reads are not cached',()=>{
 let width=10,failed=true;const read=()=>{if(failed){failed=false;throw Error('Transient measurement');}return {width};},first=createFlowBoundsLookup(read);
 assert.throws(()=>first('frame'));assert.equal(first('frame').width,10);width=70;assert.equal(first('frame').width,10);assert.equal(createFlowBoundsLookup(read)('frame').width,70);
});
