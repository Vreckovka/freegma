import test from 'node:test';
import assert from 'node:assert/strict';
import {createSaveQueue,SAVE_LIMITS} from '../client/save-queue.mjs';
import {applyOptimisticEdit} from '../client/optimistic-edits.mjs';
import {makeNode} from '../shared/design.mjs';
const action=x=>({kind:'design',label:'Move '+x,operations:[{op:'update',id:'frame',patch:{x}}]});
function fixture(options={}){
 let board={id:'board',revision:1,document:{nodes:[makeNode('frame',{id:'frame'})]}},time=0,serial=0,nextId=0,visible=board,states=[],requests=[];const timers=new Map();
 const q=createSaveQueue({getBoard:()=>board,apply:applyOptimisticEdit,onBoard:b=>{visible=b;},onState:s=>states.push(s),now:()=>time,id:()=>`batch-${++nextId}`,setTimer:(fn,ms)=>{const id=++serial;timers.set(id,{fn,at:time+ms});return id;},clearTimer:id=>timers.delete(id),send:async request=>{requests.push(request);for(const a of request.actions)board=applyOptimisticEdit(board,a);board={...board,revision:board.revision+request.actions.length};return board;},...options});q.accept(board);
 return {q,requests,states,timers,get visible(){return visible;},get board(){return board;},async tick(ms){time+=ms;for(const [id,t]of [...timers])if(t.at<=time){timers.delete(id);t.fn();}await new Promise(r=>setImmediate(r));}};
}
test('edits publish immediately, debounce quiet bursts, retain every undo action, and suppress no-op saves',async()=>{
 const f=fixture();f.q.enqueue(action(10));assert.equal(f.visible.document.nodes[0].x,10);assert.equal(f.requests.length,0);
 await f.tick(400);f.q.enqueue(action(20));await f.tick(400);assert.equal(f.requests.length,0);await f.tick(100);
 assert.equal(f.requests.length,1);assert.equal(f.requests[0].actions.length,2);assert.equal(f.q.state.phase,'saved');
 f.q.enqueue(action(20));await f.tick(600);assert.equal(f.requests.length,1);
});
test('continuous completed edits reach the maximum wait instead of postponing forever',async()=>{
 const f=fixture();f.q.enqueue(action(1));for(let i=2;i<=5;i++){await f.tick(400);f.q.enqueue(action(i));}await f.tick(400);assert.equal(f.requests.length,1);assert.equal(f.requests[0].actions.length,5);
});
test('an acknowledgement rebases newer edits; only one request runs and next revision comes from the acknowledgement',async()=>{
 const flights=[];const f=fixture({send:request=>new Promise((resolve,reject)=>flights.push({request,resolve,reject}))});
 f.q.enqueue(action(10));await f.tick(500);assert.equal(flights.length,1);f.q.enqueue(action(40));await f.tick(1000);assert.equal(flights.length,1);
 flights[0].resolve({...f.board,revision:2,document:{nodes:[makeNode('frame',{id:'frame',x:10,width:300})]}});await new Promise(r=>setImmediate(r));
 assert.equal(f.visible.document.nodes[0].x,40);assert.equal(f.visible.document.nodes[0].width,300);
 const flushed=f.q.flush();await new Promise(r=>setImmediate(r));assert.equal(flights[1].request.expectedRevision,2);assert.equal(flights[1].request.actions.length,1);
 flights[1].resolve({...f.visible,revision:3});await flushed;assert.equal(f.q.pending,false);assert.equal(f.visible.document.nodes[0].x,40);
});
test('lost replies retry the exact batch identity, while later additions and deletions remain visible',async()=>{
 let calls=0,requests=[],saved={id:'board',revision:2,document:{nodes:[makeNode('frame',{id:'frame',x:10})]}};const f=fixture({send:async r=>{requests.push(structuredClone(r));if(++calls===1)throw Error('Lost reply');if(calls>2){for(const a of r.actions)saved=applyOptimisticEdit(saved,a);saved={...saved,revision:saved.revision+r.actions.length};}return saved;}});
 f.q.enqueue(action(10));await assert.rejects(f.q.flush(),/Lost reply/);f.q.enqueue({kind:'design',label:'Add text',operations:[{op:'add',node:makeNode('text',{id:'new',text:'Retained'})}]});
 assert.equal(f.q.state.phase,'error');assert.equal(f.q.draft.actions.length,2);assert.equal(f.visible.document.nodes[1].text,'Retained');
 await f.q.retry();assert.deepEqual(requests[0],requests[1]);assert.equal(requests[2].expectedRevision,2);assert.equal(f.visible.document.nodes[1].text,'Retained');assert.equal(f.q.pending,false);
});
test('a rebase failure keeps the complete draft and batch for recovery instead of dropping acknowledged actions',async()=>{
 const f=fixture({send:async()=>({id:'board',revision:2,document:{nodes:[]}})});f.q.enqueue(action(10));const flush=f.q.flush();f.q.enqueue(action(30));await assert.rejects(flush);
 assert.equal(f.q.draft.actions.length,2);assert.equal(f.q.draft.failedBatch.actions.length,1);assert.equal(f.visible.document.nodes[0].x,30);
});
test('acknowledgements stay deferred during unfinished gestures and are published when safe',async()=>{
 let safe=false;const f=fixture({canPublish:()=>safe});f.q.enqueue(action(10));const optimistic=f.visible;await f.q.flush();assert.equal(f.visible,optimistic);assert.equal(f.q.board.revision,2);safe=true;f.q.publish();assert.equal(f.visible.revision,2);
});
test('newly created nodes can be edited or removed while an earlier save is in flight',async()=>{
 const flights=[];const f=fixture({send:request=>new Promise(resolve=>flights.push({request,resolve}))});f.q.enqueue(action(10));const flushed=f.q.flush();
 f.q.enqueue({kind:'design',label:'Add',operations:[{op:'add',node:makeNode('text',{id:'temporary',text:'New'})}]});f.q.enqueue({kind:'design',label:'Edit',operations:[{op:'update',id:'temporary',patch:{text:'Changed'}}]});f.q.enqueue({kind:'design',label:'Remove',operations:[{op:'remove',id:'temporary'}]});
 flights[0].resolve({...f.board,revision:2,document:{nodes:[makeNode('frame',{id:'frame',x:10})]}});await new Promise(r=>setImmediate(r));assert.equal(flights[1].request.actions.length,3);assert.equal(f.visible.document.nodes.length,1);
 flights[1].resolve({...f.visible,revision:5});await flushed;assert.equal(f.q.state.saved,4);assert.equal(f.q.state.total,4);
});
test('count limits split flushed bursts, and backlog bounds retain existing unsaved edits',async()=>{
 const f=fixture({limits:{...SAVE_LIMITS,maxActions:2,maxPendingActions:5}});for(let i=1;i<=5;i++)f.q.enqueue(action(i));assert.throws(()=>f.q.enqueue(action(6)),/Too many/);assert.equal(f.q.draft.actions.length,5);
 await f.q.flush();assert.deepEqual(f.requests.map(r=>r.actions.length),[2,2,1]);assert.deepEqual(f.requests.map(r=>r.expectedRevision),[1,3,5]);assert.equal(f.visible.document.nodes[0].x,5);assert.equal(f.timers.size,0);
});
test('byte bounds split request bodies and failed conflicts never discard or auto-retry the draft',async()=>{
 const f=fixture({limits:{...SAVE_LIMITS,maxBytes:150},send:async()=>{throw Object.assign(Error('Conflict'),{status:409});}});f.q.enqueue(action(10));f.q.enqueue(action(20));await assert.rejects(f.q.flush(),/Conflict/);assert.equal(f.q.draft.failedBatch.actions.length,1);assert.equal(f.q.draft.actions.length,2);await f.tick(10000);assert.equal(f.timers.size,0);assert.equal(f.visible.document.nodes[0].x,20);
});
test('synchronous transport failures retain their original error; UI callbacks cannot turn a committed acknowledgement into a retry',async()=>{
 const f=fixture({send:()=>{throw Error('Transport unavailable');}});f.q.enqueue(action(10));await assert.rejects(f.q.flush(),/Transport unavailable/);assert.equal(f.q.draft.actions.length,1);
 const g=fixture({onBoard:()=>{throw Error('View unavailable');},onState:()=>{throw Error('Status unavailable');},onError:()=>{throw Error('Reporter unavailable');}});g.q.enqueue(action(10));await g.q.flush();assert.equal(g.requests.length,1);assert.equal(g.q.state.phase,'saved');assert.equal(g.q.board.document.nodes[0].x,10);assert.equal(g.q.draft.failedBatch,null);
});
