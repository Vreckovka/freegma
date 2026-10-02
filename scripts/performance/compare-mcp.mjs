import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(process.argv[2]||'logs/mcp-tokens-20261002'),label=process.argv[3];if(!label||!/^[a-z0-9-]+$/.test(label))throw Error('Supply a run label.');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'baseline.json'),'utf8')),current=JSON.parse(fs.readFileSync(path.join(root,label+'.json'),'utf8'));
if(JSON.stringify(baseline.fixture)!==JSON.stringify(current.fixture)||JSON.stringify(baseline.tokenizer)!==JSON.stringify(current.tokenizer))throw Error('Fixture or tokenizer changed; cannot compare.');
const rows=[],totals={},n=x=>x.toLocaleString('en-US',{maximumFractionDigits:2});
for(const [key,title]of Object.entries({toolDefinitions:'Tool definitions',designRead:'Selected design frame read',designMutation:'Design edit receipt',flowRead:'Selected flow step and connections',flowMutation:'Flow edit receipt'})){
 const a=baseline.metrics[key],b=current.metrics[key];if(!a||!b)throw Error('Missing scenario '+key);totals[key]={before:a.responseTokens,after:b.responseTokens};rows.push(`| MCP ${title} · payload tokens | ${n(a.responseTokens)} | ${n(b.responseTokens)} | ${n((b.responseTokens/a.responseTokens-1)*100)}% |`);
}
for(const [key,field,title]of [['workflowTokens','responseTokens','workflow response tokens'],['workflowBytes','responseBytes','workflow response bytes']]){
 const a=Object.values(baseline.metrics).reduce((sum,v)=>sum+v[field],0),b=Object.values(current.metrics).reduce((sum,v)=>sum+v[field],0);totals[key]={before:a,after:b};rows.push(`| MCP ${title} | ${n(a)} | ${n(b)} | ${n((b/a-1)*100)}% |`);
}
const text=`Local stdio MCP comparison · ${label}\n\nFixed ${current.tokenizer.name} tokenizer (${current.tokenizer.package} ${current.tokenizer.version}); no model calls or Vercel load tests. Tokens count text plus structured content. Client rendering and actual billing may differ. The same task inspects one frame and one flow step, then edits each: baseline sends full boards, current scopes the reads and requests compact receipts. All full responses remain available; paged scope is explicit and is never presented as the entire board.\n\n| Measurement | Baseline v0.1.35 | Current | Change |\n| --- | ---: | ---: | ---: |\n${rows.join('\n')}\n`;
fs.writeFileSync(path.join(root,label+'-comparison.md'),text);fs.writeFileSync(path.join(root,label+'-comparison.json'),JSON.stringify({tokenizer:current.tokenizer,totals},null,2));console.log(text);
