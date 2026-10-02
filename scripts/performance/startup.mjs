import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {performance} from 'node:perf_hooks';import {execFileSync} from 'node:child_process';
import {FreegmaStore} from '../../server/store.mjs';import {DesignFiles} from '../../server/files.mjs';import {VERSION} from '../../shared/design.mjs';
const label=process.argv[2]||'baseline',root=path.resolve('logs/startup-20261002'),fixtureRoot=path.resolve('logs/performance-20261001/fixture'),fixture=JSON.parse(fs.readFileSync(path.join(fixtureRoot,'fixture.json'))),file=path.join(root,label+'.json');
if(!/^(baseline|round-\d+)$/.test(label)||fs.existsSync(file))throw Error('Preserve existing profiles.');
let decodedBoards=new Set();const decode=DesignFiles.prototype.decoded;DesignFiles.prototype.decoded=function(relative){if(relative.includes('/b/'))decodedBoards.add(relative);return decode.call(this,relative);};
const samples=[];
for(let i=0;i<3;i++){
 const data=path.join(root,label+'-data-'+i);if(fs.existsSync(data))throw Error('Profile data exists.');fs.cpSync(fixtureRoot,data,{recursive:true});decodedBoards=new Set();let store;
 try{
  const start=performance.now();store=new FreegmaStore(path.join(data,'freegma.sqlite'),{seed:false,storageRoot:path.join(data,'workspaces')});const startupMs=performance.now()-start,boardsDecodedAtStartup=decodedBoards.size;
  const viewStart=performance.now();store.workspaces();store.boards(fixture.designWorkspace);const board=store.getBoard(fixture.designBoard),firstViewMs=performance.now()-viewStart,boardsDecodedAfterFirstView=decodedBoards.size;
  const flowStart=performance.now();store.boards(fixture.flowWorkspace);const flow=store.getBoard(fixture.flowBoard),secondViewMs=performance.now()-flowStart;
  samples.push({startupMs,firstViewMs,startupAndFirstViewMs:startupMs+firstViewMs,secondViewMs,boardsDecodedAtStartup,boardsDecodedAfterFirstView,designDigest:createHash('sha256').update(JSON.stringify(board.document)).digest('hex'),flowDigest:createHash('sha256').update(JSON.stringify(flow.document)).digest('hex')});
 }finally{store?.close();}
}
const result={label,version:VERSION,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),localOnly:true,fixture,samples,note:'Three fresh isolated stores. First view includes workspace list, selected workspace board list and full design read. Combined startup plus first view prevents hiding deferred work.'};fs.writeFileSync(file,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
