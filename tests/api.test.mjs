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

test('retry replaces a stuck same-board read immediately, even if transport ignores cancellation',async()=>{
 const flights=[],loader=createBoardLoader((id,options)=>new Promise(resolve=>flights.push({id,options,resolve})));
 const old=loader.load('same'),rejected=assert.rejects(old,e=>e.name==='AbortError');
 const fresh=loader.load('same',{restart:true});await rejected;
 assert.equal(flights.length,2);assert.equal(flights[0].options.signal.aborted,true);
 assert.notEqual(flights[0].options.requestId,flights[1].options.requestId);
 flights[0].resolve({id:'same',revision:1});await new Promise(r=>setImmediate(r));
 assert.equal(loader.size,1);assert.equal(loader.load('same'),fresh);
 flights[1].resolve({id:'same',revision:2});assert.equal((await fresh).revision,2);assert.equal(loader.size,0);
});

test('navigation cancels obsolete reads without a retry; transient retry uses a new request identity',async()=>{
 const calls=[],loader=createBoardLoader((id,options)=>{calls.push({id,options});return id==='old'?new Promise(()=>{}):Promise.resolve({id});});
 const old=loader.load('old'),rejected=assert.rejects(old,e=>e.name==='AbortError');
 const next=loader.load('next');loader.cancelExcept('next');await rejected;await next;
 assert.equal(calls.length,2);assert.equal(loader.size,0);
 const attempts=[],retry=createBoardLoader(async(id,options)=>{attempts.push(options);if(attempts.length===1)throw Object.assign(Error('Interrupted'),{readTimeout:true});return {id};});
 await retry.load('same');assert.notEqual(attempts[0].requestId,attempts[1].requestId);
});

test('API reads bypass browser cache while writes keep their existing fetch policy',async()=>{
 const options=[],api=createApi(async(url,o)=>{options.push(o);return ok({id:'same'});});
 await api('/same','GET',undefined,{cache:'force-cache'});await api('/same','POST',{name:'Changed'});
 assert.equal(options[0].cache,'no-store');assert.equal(options[1].cache,undefined);
});
