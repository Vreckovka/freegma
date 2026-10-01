import test from 'node:test';
import assert from 'node:assert/strict';
import {createPollHub} from '../client/status-poll.mjs';

const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
function clock(){let time=0,id=0;const tasks=new Map();return {now:()=>time,setTimer:(fn,delay)=>{tasks.set(++id,{fn,at:time+delay});return id;},clearTimer:key=>tasks.delete(key),get size(){return tasks.size;},async advance(ms){const end=time+ms;while(true){const [key,task]=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0]||[];if(!task||task.at>end)break;tasks.delete(key);time=task.at;task.fn();await flush();}time=end;await flush();}};}
function setup(read,visible){const c=clock(),calls=[];return {c,calls,hub:createPollHub({...c,visible,read:async key=>{calls.push([key,c.now()]);return read?read(key):{revision:1};}})};}

test('many visible references share a single status read and unchanged polling backs off',async()=>{
 const {c,calls,hub}=setup(),seen=[];
 const stops=Array.from({length:40},()=>hub.subscribe('board',{onData:d=>seen.push(d.revision)}));
 await c.advance(40000);assert.deepEqual(calls.map(c=>c[1]),[3000,9000,21000]);assert.equal(seen.length,120);
 for(const stop of stops)stop();assert.equal(hub.size,0);assert.equal(c.size,0);
});
test('interaction resumes checks promptly without a burst for repeated input',async()=>{
 const {c,calls,hub}=setup();hub.subscribe('board',{onData:()=>{}});await c.advance(22000);
 hub.wake();hub.wake();await c.advance(1999);assert.equal(calls.length,3);await c.advance(1);assert.equal(calls.at(-1)[1],24000);
 await c.advance(1000);hub.wake();await c.advance(2000);assert.equal(calls.at(-1)[1],27000);
});
test('hidden documents make no requests and becoming visible refreshes immediately',async()=>{
 let visible=true;const {c,calls,hub}=setup(null,()=>visible);hub.subscribe('board',{onData:()=>{}});await c.advance(3000);
 visible=false;hub.wake();await c.advance(60000);assert.equal(calls.length,1);assert.equal(c.size,0);
 visible=true;hub.wake();await c.advance(0);assert.equal(calls.length,2);
});
test('unfinished edits block reads and suppress responses when an edit starts in flight',async()=>{
 let blocked=true,release;const {c,calls,hub}=setup(()=>new Promise(r=>release=r));let applied=0;
 hub.subscribe('board',{canPoll:()=>!blocked,onData:()=>applied++});await c.advance(9000);assert.equal(calls.length,0);
 blocked=false;hub.wake();await c.advance(0);assert.equal(calls.length,1);blocked=true;release({revision:2});await flush();assert.equal(applied,0);
 blocked=false;hub.wake();await c.advance(3000);release({revision:2});await flush();assert.equal(applied,1);
});
test('slow reads and refresh callbacks never overlap, including activity during a request',async()=>{
 let release,finish;const {c,calls,hub}=setup(()=>new Promise(r=>release=r));let seen=0;
 hub.subscribe('board',{onData:()=>{seen++;return new Promise(r=>finish=r);}});await c.advance(3000);
 hub.wake();await c.advance(60000);assert.equal(calls.length,1);release({revision:1});await flush();assert.equal(seen,1);
 hub.wake();await c.advance(60000);assert.equal(calls.length,1);finish();await flush();await c.advance(2999);assert.equal(calls.length,1);await c.advance(1);assert.equal(calls.length,2);
});
test('unsubscribed and replacement views do not receive stale callbacks or duplicate reads',async()=>{
 let release;const {c,calls,hub}=setup(()=>new Promise(r=>release=r));let old=0,next=0;
 const stop=hub.subscribe('board',{onData:()=>old++});await c.advance(3000);stop();
 hub.subscribe('board',{onData:()=>next++});await c.advance(3000);assert.equal(calls.length,1);release({revision:2});await flush();assert.equal(old,0);assert.equal(next,1);
});
test('remote changes reset backoff and failed reads retry without breaking other subscribers',async()=>{
 let revision=1,fail=false;const {c,calls,hub}=setup(()=>{if(fail)throw Error('Offline');return {revision};}),events=[];
 hub.subscribe('board',{onData:(d,info)=>events.push([d.revision,info.changed]),onError:async()=>{throw Error('Subscriber failed');}});
 await c.advance(9000);revision=2;await c.advance(12000);assert.deepEqual(events.at(-1),[2,true]);await c.advance(3000);assert.equal(calls.at(-1)[1],24000);
 fail=true;await c.advance(6000);fail=false;hub.wake();await c.advance(3000);assert.deepEqual(events.at(-1),[2,false]);
});
