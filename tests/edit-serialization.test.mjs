import test from 'node:test';import assert from 'node:assert/strict';
import {createStepCache} from '../client/step-cache.mjs';import {createSaveQueue} from '../client/save-queue.mjs';import {applyOptimisticEdit} from '../client/optimistic-edits.mjs';import {makeNode} from '../shared/design.mjs';
const board=text=>({id:'board',revision:1,document:{version:1,nodes:[makeNode('text',{id:'text',text})]}});
const size=b=>new TextEncoder().encode(JSON.stringify(b.document)).length;
const record=(cache,before,after)=>cache.record(before,after,{before:JSON.stringify(before.document),after:JSON.stringify(after.document)});
test('lent serialization preserves exact UTF-8 history limits and drops oversized steps',()=>{
 const a=board('🟣色é "quoted" \\ \n \ud800'),b=board('A different 🟣 color'),budget=size(a)+size(b);
 for(const bytes of [budget,budget-1]){
  const cache=createStepCache({limits:{steps:20,bytes,ttlMs:1000},now:()=>0});record(cache,a,b);
  assert.deepEqual(cache.count,{undo:bytes===budget?1:0,redo:0,bytes:bytes===budget?budget:0});
  if(bytes===budget){assert.equal(cache.peek('undo').before,a.document);assert.equal(cache.peek('undo').after,b.document);cache.move('undo');assert.equal(cache.count.bytes,budget);assert.equal(cache.peek('redo').after,b.document);}
 }
});
test('reused weights preserve eviction, redo clearing and expiry across new completed edits',()=>{
 let now=0;const a=board('first'),b=board('second'),c=board('third'),d=board('fourth'),cache=createStepCache({limits:{steps:2,bytes:100000,ttlMs:100},now:()=>now});
 record(cache,a,b);record(cache,b,c);record(cache,c,d);assert.equal(cache.count.undo,2);assert.equal(cache.count.bytes,size(b)+2*size(c)+size(d));
 cache.move('undo');assert.equal(cache.count.redo,1);record(cache,c,a);assert.equal(cache.count.redo,0);assert.equal(cache.count.bytes,size(b)+2*size(c)+size(a));
 now=101;assert.equal(cache.peek('undo'),null);assert.deepEqual(cache.count,{undo:0,redo:0,bytes:0});
 record(cache,a,b);assert.equal(cache.count.bytes,size(a)+size(b));cache.clear();assert.deepEqual(cache.count,{undo:0,redo:0,bytes:0});
});
test('a no-op or rejected edit keeps the last usable undo step while an acknowledgement is in flight',async()=>{
 const original=board('🟣 original'),flights=[];let visible=original;
 const q=createSaveQueue({getBoard:()=>original,apply:applyOptimisticEdit,onBoard:b=>visible=b,setTimer:()=>1,clearTimer:()=>{},send:r=>new Promise(resolve=>flights.push({r,resolve}))});q.accept(original);
 const edit=text=>({kind:'design',label:'Text edit',operations:[{op:'update',id:'text',patch:{text}}]});
 try{q.enqueue(edit('色 new'));const saving=q.flush();q.enqueue(edit('色 new'));assert.equal(q.draft.actions.length,1);
  assert.throws(()=>q.enqueue({kind:'design',label:'Invalid',operations:[{op:'update',id:'missing',patch:{text:'invalid'}}]}));assert.equal(q.draft.actions.length,1);
  assert.ok(q.history('undo'));assert.equal(visible.document.nodes[0].text,'🟣 original');
  flights[0].resolve({...applyOptimisticEdit(original,edit('色 new')),revision:2});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(visible.document.nodes[0].text,'🟣 original');assert.equal(flights[1].r.actions.length,1);assert.equal(flights[1].r.actions[0].kind,'history');assert.equal(Object.hasOwn(flights[1].r.actions[0],'localStep'),false);
  flights[1].resolve({...original,revision:3});await saving;assert.equal(q.pending,false);assert.equal(visible.document.nodes[0].text,'🟣 original');
 }finally{q.dispose();}
});
