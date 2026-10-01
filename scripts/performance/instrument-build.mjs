import fs from 'node:fs';import path from 'node:path';
const dir=path.resolve(process.argv[2]||'logs/performance-20261001/baseline-build'),probe=fs.readFileSync(new URL('./browser-probe.js',import.meta.url),'utf8'),file=path.join(dir,'app.js');
const original=fs.readFileSync(file,'utf8');if(!original.includes('freegma-performance'))fs.appendFileSync(file,'\n'+probe);
console.log('Instrumented local laboratory build:',dir);
