import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';import {createHash} from 'node:crypto';
import {createFlowRoutingCache} from '../../client/flow-routing-cache.mjs';
import {VERSION} from '../../shared/design.mjs';
const root=path.resolve('logs/flow-layout-20261002'),label=process.argv[2];if(!/^round-[0-9]+$/.test(label||''))throw Error('Supply a fresh round label.');
const output=path.join(root,label+'.json');if(fs.existsSync(output))throw Error('Preserve prior measurements.');
const fixtures=JSON.parse(fs.readFileSync(path.join(root,'fixture.json'))),baseline=JSON.parse(fs.readFileSync(path.join(root,'baseline.json'))),metrics={};
const summary=samples=>{const sorted=[...samples].sort((a,b)=>a-b);return {medianMs:sorted[15],p95Ms:sorted[28],samples};};
for(const {name,nodes,edges}of fixtures){
 assert.equal(nodes.length,baseline.metrics[name].nodes);assert.equal(edges.length,baseline.metrics[name].edges);
 const rebuild=[],hits=[];let paths;for(let i=0;i<3;i++)createFlowRoutingCache()(nodes,edges);
 for(let i=0;i<30;i++){const route=createFlowRoutingCache(),start=performance.now();paths=route(nodes,edges);rebuild.push(performance.now()-start);const hitStart=performance.now();assert.equal(route(nodes,edges,edges[i%edges.length].id),paths);hits.push(performance.now()-hitStart);}
 const digest=createHash('sha256').update(JSON.stringify(paths)).digest('hex');assert.equal(digest,baseline.metrics[name].digest,'Geometry changed for '+name);
 metrics[name]={rebuild:summary(rebuild),unchanged:summary(hits),digest,nodes:nodes.length,edges:edges.length};
}
fs.writeFileSync(output,JSON.stringify({version:VERSION,label,localOnly:true,metrics},null,2),{flag:'wx'});
const number=n=>n.toLocaleString('en-US',{maximumFractionDigits:4}),rows=[];
for(const [name,m]of Object.entries(metrics))for(const [key,title]of [['rebuild','route rebuild'],['unchanged','unchanged geometry / selection']])rows.push(`| **${m.nodes} steps / ${m.edges} arrows · ${title}** | **${number(baseline.metrics[name].medianMs)} ms** | **${number(baseline.metrics[name].medianMs)} ms** | **${number(m[key].medianMs)} ms** |`);
const report=`Local geometry CPU comparison · ${label}\n\nSeparate frozen v${baseline.version} snapshot (${baseline.commit}). Thirty samples per workload, after three warmups. Baseline and Improved are the same pre-optimization capture because this is the first geometry round. Current contains this round's indexed rebuilds and unchanged-input cache hits. All route data matches the frozen SHA-256 digests exactly. These are pure geometry timings, not complete browser rendering latency or Vercel measurements.\n\n| Measurement | Baseline | Improved | Current |\n| --- | ---: | ---: | ---: |\n${rows.join('\n')}\n`;
fs.writeFileSync(path.join(root,label+'-comparison.md'),report);console.log(report);
