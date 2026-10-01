import fs from 'node:fs';
import path from 'node:path';
const [folder='logs/performance-20261001',label]=process.argv.slice(2);
if(!label||!/^[a-z0-9-]+$/.test(label))throw Error('Supply the measured round label.');
const root=path.resolve(folder),rows=[],number=v=>v.toLocaleString('en-US',{maximumFractionDigits:2});
function row(name,a,b,unit){rows.push(`| ${name} | ${number(a)} ${unit} | ${number(b)} ${unit} | ${a?number((b/a-1)*100)+'%':'—'} |`);}
for(const scene of ['flow','design']){
 const read=run=>JSON.parse(fs.readFileSync(path.join(root,`browser-${run}-${scene}.json`),'utf8'));
 const base=read('baseline'),current=read(label);
 if(JSON.stringify(base.viewport)!==JSON.stringify(current.viewport))throw Error('Browser viewports differ.');
 if(base.observedAt<40000||current.observedAt<40000)throw Error('Wait for the fixed idle window to complete before capturing results.');
 row(scene+' · initial render ready',base.readyMs,current.readyMs,'ms');
 row(scene+' · mounted DOM',base.domNodes,current.domNodes,'nodes');
 row(scene+' · mounted design layers',base.renderedLayers,current.renderedLayers,'layers');
 const idle=data=>data.resources.filter(r=>r.start>=10000&&r.start<40000);
 row(scene+' · idle requests / 30 seconds',idle(base).length,idle(current).length,'requests');
 row(scene+' · idle response bodies / 30 seconds',idle(base).reduce((n,r)=>n+r.bytes,0),idle(current).reduce((n,r)=>n+r.bytes,0),'B');
 // A fixed startup window can undercount polling when a slow render blocks
 // timers. Also compare a quiet window relative to each scene's readiness.
 const settled=data=>{
  if(!Number.isFinite(data.readyMs)||data.observedAt<data.readyMs+23000)throw Error('Capture at least 23 seconds after render readiness.');
  return data.resources.filter(r=>r.start>=data.readyMs+3000&&r.start<data.readyMs+23000);
 };
 row(scene+' · settled requests / 20 seconds',settled(base).length,settled(current).length,'requests');
 row(scene+' · settled response bodies / 20 seconds',settled(base).reduce((n,r)=>n+r.bytes,0),settled(current).reduce((n,r)=>n+r.bytes,0),'B');
 const startup=data=>data.longTasks.filter(t=>t.start<10000).reduce((n,t)=>n+t.duration,0);
 row(scene+' · initial long-task time',startup(base),startup(current),'ms');
}
const report=`Local browser comparison · ${label}\n\nOriginal source baseline is preserved separately. Same 1280×720 viewport and initial scenes: design automatically fitted to all forty screens; flow at 100% with its first context card. Startup idle window covers 10–40 seconds after navigation; settled traffic covers 3–23 seconds after each scene becomes ready. Slow rendering can suppress startup polling, so fewer startup requests alone are not a network improvement. Readiness is one run per scene, so timing changes are indicative; DOM and request counts are stronger regression checks. Backend benchmarking must finish before collecting browser runs.\n\n| Measurement | Original baseline | Current | Change |\n| --- | ---: | ---: | ---: |\n${rows.join('\n')}\n`;
fs.writeFileSync(path.join(root,label+'-browser-comparison.md'),report);console.log(report);
