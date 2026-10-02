import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {performance} from 'node:perf_hooks';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const args=process.argv.slice(2),value=k=>{const i=args.indexOf(k);return i<0?undefined:args[i+1];};
const output=path.resolve(value('--output')||'logs/history-travel-20261002/current.json'),source=path.resolve(value('--module')||'server/store.mjs'),fixtureRoot=path.resolve('logs/performance-20261001/fixture'),fixture=JSON.parse(fs.readFileSync(path.join(fixtureRoot,'fixture.json'))),data=output.slice(0,-5)+'-data';
if(fs.existsSync(output)||fs.existsSync(data))throw Error('Preserve existing measurements; choose a new output.');
const {FreegmaStore}=await import(pathToFileURL(source));fs.mkdirSync(path.dirname(output),{recursive:true});fs.cpSync(fixtureRoot,data,{recursive:true});
const store=new FreegmaStore(path.join(data,'freegma.sqlite'),{seed:false,storageRoot:path.join(data,'workspaces')}),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const stats=s=>{const times=s.map(x=>x.ms).sort((a,b)=>a-b);return {medianMs:times[Math.floor(times.length/2)],p95Ms:times[Math.ceil(times.length*.95)-1],n:s.length};};
try{
 let board=store.getBoard(fixture.designBoard);const initial=store.readBoard(board.id),samples={undo:[],redo:[]};
 for(const direction of ['undo','redo'])for(let i=0;i<6;i++){
  const raw=store.readBoard(board.id,false),entry=raw.history.find(h=>h.seq===(direction==='undo'?raw.cursor:raw.cursor+1)),expected=hash(direction==='undo'?entry.before:entry.after),start=performance.now();
  board=store.travel(board.id,board.revision,direction,board.palette.revision);samples[direction].push({ms:performance.now()-start});
  assert.equal(hash(board.document),expected,'Each transition restores the exact snapshot.');
 }
 const final=store.readBoard(board.id);assert.equal(final.cursor,initial.cursor);assert.equal(final.revision,initial.revision+12);assert.deepEqual(final.document,initial.document);
 const historyWithoutTravelDates=history=>history.map(({undoneAt,...entry})=>entry);assert.deepEqual(historyWithoutTravelDates(final.history),historyWithoutTravelDates(initial.history));
 const result={localOnly:true,source,fixture,metrics:{undo:stats(samples.undo),redo:stats(samples.redo)},samples,documentDigest:hash(final.document),historyDigest:hash(historyWithoutTravelDates(final.history)),note:'Store CPU plus durable local writes; six Undo then six Redo actions on a warm fixed board. Browser latency and Vercel are not measured.'};
 const baseline=value('--baseline');if(baseline){const before=JSON.parse(fs.readFileSync(baseline));assert.deepEqual(before.fixture,fixture);assert.equal(result.documentDigest,before.documentDigest);assert.equal(result.historyDigest,before.historyDigest);}
 fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify({metrics:result.metrics,documentDigest:result.documentDigest,historyDigest:result.historyDigest}));
}finally{store.close();}
