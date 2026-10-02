import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';

// Run entirely locally. Pass a frozen module directory to capture the baseline.
const args=process.argv.slice(2),value=k=>{const i=args.indexOf(k);return i<0?undefined:args[i+1];};
const modulePath=path.resolve(value('--module')||'shared/design.mjs');
const output=path.resolve(value('--output'));
if(fs.existsSync(output))throw Error('Preserve measurements; choose a new output file.');
const {generateReact,VERSION}=await import(pathToFileURL(modulePath));
const source=JSON.parse(fs.readFileSync('logs/performance-20261001/fixture/workspaces/workspace_af537e40cb894df8/b/board_974d7e1fe2584a3b.free','utf8')).document;
const maximum={version:1,nodes:Array.from({length:4},(_,batch)=>source.nodes.map(n=>({...n,id:'copy_'+batch+'_'+n.id,parentId:n.parentId?'copy_'+batch+'_'+n.parentId:null,x:n.parentId?n.x:n.x+batch*20000}))).flat()};
const normalize=result=>JSON.stringify(result).replace(/Generated from Freegma [\d.]+/g,'Generated from Freegma VERSION');
const digest=result=>createHash('sha256').update(normalize(result)).digest('hex');
const fixtures=[
 {name:'design2480',document:source,rootId:null},
 {name:'design9920',document:maximum,rootId:null},
 {name:'selectedFrame',document:source,rootId:'screen_0'},
 // Reverse storage order to exercise root/child discovery independent of parent order.
 {name:'reversed9920',document:{...maximum,nodes:[...maximum.nodes].reverse()},rootId:null},
 {name:'empty',document:{version:1,nodes:[]},rootId:null}
];
const metrics={};
for(const {name,document,rootId} of fixtures){
 const n=document.nodes.length>9000?5:15,warmups=document.nodes.length>9000?1:3;
 for(let i=0;i<warmups;i++)generateReact(document,rootId,'Performance export');
 const samples=[];let result;
 for(let i=0;i<n;i++){const start=performance.now();result=generateReact(document,rootId,'Performance export');samples.push(performance.now()-start);}
 const sorted=[...samples].sort((a,b)=>a-b);
 metrics[name]={layers:document.nodes.length,rootId,warmups,n,medianMs:sorted[Math.floor(n/2)],p95Ms:sorted[Math.ceil(n*.95)-1],samples,digest:digest(result),outputBytes:Buffer.byteLength(normalize(result)),filename:result.filename,cssFilename:result.cssFilename};
 console.log(name,JSON.stringify({...metrics[name],samples:undefined}));
}
const baselinePath=value('--baseline');
if(baselinePath){const baseline=JSON.parse(fs.readFileSync(baselinePath));for(const [name,metric]of Object.entries(metrics))if(metric.digest!==baseline.metrics[name].digest)throw Error('Export changed: '+name);}
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({date:new Date().toISOString(),version:VERSION,localOnly:true,scope:'Local React/CSS generation CPU time; not browser latency or Vercel load.',metrics},null,2),{flag:'wx'});
