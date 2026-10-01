import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(process.argv[2]||'logs/performance-20261001'),label=process.argv[3];if(!label||!/^[a-z0-9-]+$/.test(label))throw Error('Supply the directory and measured run label.');
const base=JSON.parse(fs.readFileSync(path.join(root,'baseline.json'),'utf8')),current=JSON.parse(fs.readFileSync(path.join(root,label+'.json'),'utf8'));
if(JSON.stringify(base.fixture)!==JSON.stringify(current.fixture))throw Error('Different fixtures cannot be compared.');
const rows=[],number=n=>n.toLocaleString('en-US',{maximumFractionDigits:2});
function row(name,a,b,unit){rows.push(`| ${name} | ${number(a)} ${unit} | ${number(b)} ${unit} | ${a?number((b/a-1)*100)+'%':'—'} |`);}
row('Cold startup',base.metrics.coldStartupMs,current.metrics.coldStartupMs,'ms');
for(const [key,name] of Object.entries({designRead:'Design read',boardStatus:'Unchanged board status',workspaceCatalog:'Workspace list',boardCatalog:'Board list',framePreview:'Frame preview',flowRead:'Flow read',designSave:'Completed design save',unchangedSave:'Unchanged action',flowSave:'Completed flow save'})){
 const a=base.metrics[key],b=current.metrics[key];if(a.n!==b.n)throw Error('Sample counts differ for '+key);
 row(name+' · median',a.medianMs,b.medianMs,'ms');row(name+' · p95',a.p95Ms,b.p95Ms,'ms');row(name+' · response',a.responseBytes,b.responseBytes,'B');
}
row('Design file after fixed save sequence',base.metrics.designFileBytes,current.metrics.designFileBytes,'B');
const text=`Local-only performance comparison · ${label}\n\nBaseline: ${base.commit}. Current: ${current.commit}. Fixed fixture and sample counts verified. Negative percentages indicate reductions. HTTP body bytes exclude headers; browser idle traffic is recorded separately. Local absolute file-path metadata varies with the benchmark output directory; tiny response-size differences from those paths do not represent design-content growth. Warm reads and cold startup are separate workloads.\n\n| Measurement | Original baseline | Current | Change |\n| --- | ---: | ---: | ---: |\n${rows.join('\n')}\n`;
fs.writeFileSync(path.join(root,label+'-comparison.md'),text);console.log(text);
