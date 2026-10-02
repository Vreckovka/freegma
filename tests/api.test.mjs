import test from 'node:test';import assert from 'node:assert/strict';import {createApi,createBoardLoader} from '../client/api.mjs';
const ok=value=>({ok:true,json:async()=>value});
test('read deadline covers stuck headers and stuck bodies, aborts and permits a fresh read',async()=>{
 for(const stuck of [()=>new Promise(()=>{}),()=>Promise.resolve({ok:true,json:()=>new Promise(()=>{})})]){
  let calls=0,signal;const api=createApi((url,options)=>{signal=options.signal;return ++calls===1?stuck():Promise.resolve(ok({id:'same'}));},{readTimeoutMs:15});
  await assert.rejects(api('/same'),e=>e.readTimeout===true);assert.equal(signal.aborted,true);assert.deepEqual(await api('/same'),{id:'same'});assert.equal(calls,2);
 }
});
test('caller cancellation releases a pending read and writes retain the supplied signal',async()=>{
 const controller=new AbortController();let received;const api=createApi((url,options)=>{received=options;return url==='/read'?new Promise(()=>{}):Promise.resolve(ok({saved:true}));},{readTimeoutMs:1000});
 const reading=api('/read','GET',undefined,{signal:controller.signal});controller.abort(new Error('Navigation left'));await assert.rejects(reading,/Navigation left/);assert.equal(received.signal.aborted,true);
 const writeSignal=new AbortController().signal;assert.deepEqual(await api('/write','POST',{x:1},{signal:writeSignal}),{saved:true});assert.equal(received.signal,writeSignal);assert.equal(received.method,'POST');assert.equal(received.body,'{"x":1}');
});
test('board loading shares a read, retries one transient failure, evicts failures and never retries rejection',async()=>{
 let release,calls=0;const loader=createBoardLoader(async()=>{calls++;if(calls===1)return new Promise((resolve,reject)=>{release=reject;});return {id:'same',revision:1};});
 const first=loader.load('same');assert.equal(loader.load('same'),first);assert.equal(calls,1);release(Object.assign(new Error('Timeout'),{readTimeout:true}));assert.deepEqual(await first,{id:'same',revision:1});assert.equal(calls,2);assert.equal(loader.size,0);
 let failures=0;const rejected=createBoardLoader(async()=>{failures++;throw Object.assign(new Error('Unavailable'),{status:503});});await assert.rejects(rejected.load('same'),/Unavailable/);assert.equal(failures,2);assert.equal(rejected.size,0);await assert.rejects(rejected.load('same'));assert.equal(failures,4);
 let invalid=0;const denied=createBoardLoader(async()=>{invalid++;throw Object.assign(new Error('Not found'),{status:404});});await assert.rejects(denied.load('missing'),/Not found/);assert.equal(invalid,1);
});
