import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {performance} from 'node:perf_hooks';import {createFixtures} from './fixtures.mjs';import {FreegmaStore} from '../../server/store.mjs';import {createServer} from '../../server/http.mjs';
const args=process.argv.slice(2),value=k=>{const i=args.indexOf(k);return i<0?undefined:args[i+1];},label=value('--label')||'baseline';if(!/^[a-z0-9-]+$/.test(label))throw Error('Use a simple run label.');
const root=path.resolve(value('--root')||'logs/performance-20261001');if(fs.existsSync(path.join(root,label+'.json')))throw Error('This measurement already exists; use a new label and preserve the original.');
const fixtureRoot=path.join(root,'fixture'),fixture=createFixtures(fixtureRoot),runRoot=path.join(root,label+'-'+Date.now());fs.mkdirSync(runRoot,{recursive:true});
fs.cpSync(fixtureRoot,path.join(runRoot,'data'),{recursive:true});const db=path.join(runRoot,'data/freegma.sqlite');let started=performance.now(),store=new FreegmaStore(db,{seed:false}),coldStartup=performance.now()-started;
const server=createServer({store,access:()=>({origins:[],embedOrigins:[]})});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const results={label,commit:process.env.FREEGMA_PERF_COMMIT||'working-tree',date:new Date().toISOString(),machine:{platform:os.platform(),node:process.version,cpu:os.cpus()[0].model},fixture,metrics:{coldStartupMs:coldStartup},samples:{}};
async function request(route,method='GET',body){const text=body?JSON.stringify(body):undefined,t=performance.now(),r=await fetch(origin+route,{method,signal:AbortSignal.timeout(60000),headers:text?{'Content-Type':'application/json'}:undefined,body:text});const bytes=Buffer.from(await r.arrayBuffer()),elapsed=performance.now()-t;if(!r.ok)throw Error(bytes.toString());return {data:JSON.parse(bytes),ms:elapsed,requestBytes:text?Buffer.byteLength(text):0,responseBytes:bytes.length};}
function stats(samples){const times=samples.map(s=>s.ms).sort((a,b)=>a-b);return {medianMs:times[Math.floor(times.length/2)],p95Ms:times[Math.min(times.length-1,Math.ceil(times.length*.95)-1)],responseBytes:Math.round(samples.reduce((s,v)=>s+v.responseBytes,0)/samples.length),requestBytes:Math.round(samples.reduce((s,v)=>s+v.requestBytes,0)/samples.length),n:samples.length};}
async function measure(name,fn,n=15){const samples=[];for(let i=0;i<n;i++){const r=await fn(i);samples.push({ms:r.ms,responseBytes:r.responseBytes,requestBytes:r.requestBytes});}results.metrics[name]=stats(samples);results.samples[name]=samples;console.log(name,JSON.stringify(results.metrics[name]));}
try{
 await request('/api/boards/'+fixture.designBoard);await measure('designRead',()=>request('/api/boards/'+fixture.designBoard));
 await measure('boardStatus',()=>request('/api/boards/'+fixture.designBoard+'/status'));
 await measure('workspaceCatalog',()=>request('/api/workspaces'));
 await measure('boardCatalog',()=>request('/api/workspaces/'+fixture.designWorkspace+'/boards'));
 await measure('framePreview',()=>request('/api/boards/'+fixture.designBoard+'/flow-preview?frameId=screen_0'));
 await measure('flowRead',()=>request('/api/boards/'+fixture.flowBoard));
 let board=(await request('/api/boards/'+fixture.designBoard)).data;
 await measure('designSave',async i=>{const r=await request('/api/boards/'+board.id+'/operations','POST',{expectedRevision:board.revision,operations:[{op:'update',id:'screen_0_title',patch:{text:'Measured edit '+i}}],label:'Measured completed action'});board=r.data;return r;},12);
 await measure('unchangedSave',async()=>{const r=await request('/api/boards/'+board.id+'/operations','POST',{expectedRevision:board.revision,operations:[{op:'update',id:'screen_0_title',patch:{text:board.document.nodes.find(n=>n.id==='screen_0_title').text}}],label:'Unchanged action'});board=r.data;return r;},5);
 let flow=(await request('/api/boards/'+fixture.flowBoard)).data;
 await measure('flowSave',async i=>{const r=await request('/api/boards/'+flow.id+'/flow','POST',{expectedRevision:flow.revision,operations:[{op:'updateNode',id:'step_0',patch:{x:i+1}}],label:'Measured completed drag'});flow=r.data;return r;},12);
 results.metrics.designFileBytes=fs.statSync(path.join(runRoot,'data/workspaces',fixture.designWorkspace,'b',fixture.designBoard+'.free')).size;results.metrics.finalDesignRevision=board.revision;results.metrics.memoryRssBytes=process.memoryUsage().rss;
 fs.writeFileSync(path.join(runRoot,'result.json'),JSON.stringify(results,null,2));const pinned=path.join(root,label+'.json');if(label==='baseline'&&fs.existsSync(pinned))throw Error('Baseline already exists; preserved original.');fs.writeFileSync(pinned,JSON.stringify(results,null,2));console.log('Saved local benchmark:',pinned);
}finally{await new Promise(r=>server.close(r));store.close();}
