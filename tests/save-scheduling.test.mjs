import test from 'node:test';import assert from 'node:assert/strict';import {createSaveQueue,SAVE_LIMITS} from '../client/save-queue.mjs';
const wireBytes=v=>new TextEncoder().encode(JSON.stringify(v)).length;
const action=(x,text)=>({kind:'design',label:'色 🟣 "quoted"',operations:[{op:'update',id:'frame',patch:{x,text}}]});
function fixture(limits){let board={id:'board',revision:1,document:{nodes:[{id:'frame',x:0,text:''}]}},visible=board,serial=0;const requests=[],timers=new Map(),apply=(b,a)=>({...b,document:{nodes:[{id:'frame',...a.operations[0].patch}]}}),q=createSaveQueue({getBoard:()=>board,apply,onBoard:b=>visible=b,limits:{...SAVE_LIMITS,...limits},now:()=>0,id:()=>`batch-${++serial}`,setTimer:(fn,ms)=>{timers.set(1,{fn,ms});return 1;},clearTimer:id=>timers.delete(id),send:async r=>{requests.push(structuredClone(r));for(const a of r.actions)board=apply(board,a);return board={...board,revision:board.revision+r.actions.length};}});q.accept(board);return {q,requests,timers,get visible(){return visible;}};}
test('cached pending sizes preserve exact Unicode/escaping byte limits, array boundaries and independent action ownership',async()=>{
 const first=action(1,'🟣色é"\\\n\ud800'),second=action(2,'ééé'),pair=structuredClone([first,second]),exact=wireBytes(pair),f=fixture({maxPendingBytes:exact,maxBytes:exact+1});
 try{f.q.enqueue(first);f.q.enqueue(second);assert.throws(()=>f.q.enqueue(action(3,'')),/Too many/);assert.equal(f.q.draft.actions.length,2);first.operations[0].patch.text='External change';const draft=f.q.draft;draft.actions[1].operations[0].patch.text='Changed draft copy';await f.q.flush();assert.deepEqual(f.requests.map(r=>r.actions.length),[2]);assert.equal(wireBytes(f.requests[0].actions),exact);assert.equal(f.requests[0].actions[0].operations[0].patch.text,'🟣色é"\\\n\ud800');assert.equal(f.visible.document.nodes[0].text,'ééé');
  f.q.enqueue(action(3,'New action after acknowledgement'));await f.q.flush();assert.equal(f.requests.length,2);assert.equal(f.q.pending,false);
 }finally{f.q.dispose();}
 const tooSmall=fixture({maxPendingBytes:exact-1});try{tooSmall.q.enqueue(pair[0]);assert.throws(()=>tooSmall.q.enqueue(pair[1]),/Too many/);assert.equal(tooSmall.q.draft.actions.length,1);}finally{tooSmall.q.dispose();}
});
test('request-prefix byte accounting retains the existing conservative separator rule and flush revisions',async()=>{
 const a=action(1,'🟣'),b=action(2,'🟣'),exact=wireBytes([a,b]);
 for(const [limit,counts]of [[exact,[1,1]],[exact+1,[2]]]){const f=fixture({maxBytes:limit});try{f.q.enqueue(a);f.q.enqueue(b);await f.q.flush();assert.deepEqual(f.requests.map(r=>r.actions.length),counts);assert.equal(f.requests[0].expectedRevision,1);if(counts.length===2)assert.equal(f.requests[1].expectedRevision,2);assert.equal(f.visible.document.nodes[0].x,2);}finally{f.q.dispose();}}
});
