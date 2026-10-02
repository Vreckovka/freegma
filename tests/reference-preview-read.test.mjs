import test from 'node:test';import assert from 'node:assert/strict';
import {readReferencePreview} from '../client/reference-preview-read.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('100 concurrent references share one read; completed reads do not cache stale source data',async()=>{
 const gate=deferred();let reads=0,value={revision:1,document:{nodes:[{id:'source',text:'Before'}]}};
 const api=async()=>{reads++;await gate.promise;return value;};
 const pending=Array.from({length:100},()=>readReferencePreview(api,'board','frame'));
 assert(pending.every(p=>p===pending[0]));await Promise.resolve();assert.equal(reads,1);gate.resolve();
 const results=await Promise.all(pending);assert(results.every(result=>result===value));
 value={revision:2,document:{nodes:[{id:'source',text:'After'}]}};
 assert.equal(await readReferencePreview(api,'board','frame'),value);assert.equal(reads,2);
});
test('different frames, boards and API clients keep independent pending reads',async()=>{
 const gate=deferred(),urls=[];const api=async url=>{urls.push(url);await gate.promise;return url;},other=async url=>{await gate.promise;return 'other '+url;};
 const reads=[readReferencePreview(api,'board','one'),readReferencePreview(api,'board','two'),readReferencePreview(api,'other','one'),readReferencePreview(other,'board','one')];
 assert.equal(new Set(reads).size,4);await Promise.resolve();assert.equal(urls.length,3);gate.resolve();
 assert.deepEqual(await Promise.all(reads),['/api/boards/board/flow-preview?frameId=one','/api/boards/board/flow-preview?frameId=two','/api/boards/other/flow-preview?frameId=one','other /api/boards/board/flow-preview?frameId=one']);
});
test('failed shared requests reject every caller and allow a fresh retry',async()=>{
 const gate=deferred();let calls=0;const error=Object.assign(Error('Source unavailable'),{status:503});
 const api=()=>{calls++;return calls===1?gate.promise:Promise.resolve({revision:3});};
 const first=readReferencePreview(api,'board','frame'),second=readReferencePreview(api,'board','frame');
 const checks=[assert.rejects(first,e=>e===error),assert.rejects(second,e=>e===error)];gate.reject(error);await Promise.all(checks);
 assert.deepEqual(await readReferencePreview(api,'board','frame'),{revision:3});assert.equal(calls,2);
});
test('synchronous API errors are evicted without poisoning later reads',async()=>{
 let calls=0;const api=()=>{if(++calls===1)throw Error('Immediate failure');return {revision:4};};
 await assert.rejects(readReferencePreview(api,'board','frame'),/Immediate failure/);
 assert.deepEqual(await readReferencePreview(api,'board','frame'),{revision:4});assert.equal(calls,2);
});
