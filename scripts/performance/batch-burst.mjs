// Local-only, equal completed edits and undo history. Separate from the pinned
// original workload: compares the old sequential endpoint with one edit batch.
import fs from 'node:fs';import path from 'node:path';import {performance} from 'node:perf_hooks';
import {FreegmaStore} from '../../server/store.mjs';import {createServer} from '../../server/http.mjs';import {createFixtures} from './fixtures.mjs';
const folder=path.resolve('logs/performance-20261001'),output=path.join(folder,'round-04-burst.json');if(fs.existsSync(output))throw Error('Preserve prior measurement; choose another output.');
const fixture=createFixtures(path.join(folder,'fixture')),results={date:new Date().toISOString(),scenario:'12 completed edits, same large dashboard, individual undo retained',network:'localhost only',modes:{}};
let final;
for(const mode of ['sequential','batched']){
 const run=path.join(folder,'burst-'+mode+'-'+Date.now());fs.cpSync(path.join(folder,'fixture'),path.join(run,'data'),{recursive:true});const s=new FreegmaStore(path.join(run,'data/freegma.sqlite'),{seed:false});const server=createServer({store:s,access:()=>({origins:[],embedOrigins:[]})});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 let requests=0,requestBytes=0,responseBytes=0,publishes=0;const flush=s.files.flush.bind(s.files);s.files.flush=(...a)=>{const changed=flush(...a);if(changed)publishes++;return changed;};
 async function post(route,body){const content=JSON.stringify(body);requests++;requestBytes+=Buffer.byteLength(content);const response=await fetch(origin+route,{method:'POST',headers:{'Content-Type':'application/json'},body:content,signal:AbortSignal.timeout(120000)});const bytes=Buffer.from(await response.arrayBuffer());responseBytes+=bytes.length;if(!response.ok)throw Error(bytes.toString());return JSON.parse(bytes);}
 try{
  let b=s.getBoard(fixture.designBoard);const actions=Array.from({length:12},(_,i)=>({kind:'design',label:'Burst action '+i,operations:[{op:'update',id:'screen_0_title',patch:{text:'Burst edit '+i}}]}));const start=performance.now();
  if(mode==='sequential')for(const a of actions)b=await post('/api/boards/'+b.id+'/operations',{expectedRevision:b.revision,operations:a.operations,label:a.label});
  else b=await post('/api/boards/'+b.id+'/edit-batches',{expectedRevision:b.revision,batchId:'performance-burst-04',actions});
  results.modes[mode]={elapsedMs:performance.now()-start,requests,requestBytes,responseBytes,publishes,historyCount:s.history(b.id).length,finalRevision:b.revision};
  if(final&&JSON.stringify(final)!==JSON.stringify(b.document))throw Error('Final documents differ');final=b.document;
  if(b.document.nodes.find(n=>n.id==='screen_0_title').text!=='Burst edit 11')throw Error('Lost final edit');const undo=s.travel(b.id,b.revision,'undo');if(undo.document.nodes.find(n=>n.id==='screen_0_title').text!=='Burst edit 10')throw Error('Individual undo lost');
  console.log(mode,JSON.stringify(results.modes[mode]));
 }finally{await new Promise(r=>server.close(r));s.close();}
}
fs.writeFileSync(output,JSON.stringify(results,null,2));console.log('Saved:',output);
