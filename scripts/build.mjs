import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {sourceRoot,buildRoot} from '../server/paths.mjs';
import {VERSION} from '../shared/design.mjs';
const output=process.env.FREEGMA_BUILD||buildRoot;
await fs.mkdir(output,{recursive:true});
await build({entryPoints:[path.join(sourceRoot,'client/theme-init.mjs')],bundle:true,format:'iife',target:['chrome110','firefox115','safari16'],outfile:path.join(output,'theme.js'),minify:true,logLevel:'info'});
await build({entryPoints:[path.join(sourceRoot,'client/App.jsx')],bundle:true,format:'esm',target:['chrome110','firefox115','safari16'],outfile:path.join(output,'app.js'),minify:true,define:{'process.env.NODE_ENV':'"production"'},logLevel:'info'});
const publicRoot=path.join(sourceRoot,'client/public');
for(const name of await fs.readdir(publicRoot)){
  if(name.endsWith('.webmanifest'))await fs.writeFile(path.join(output,name),(await fs.readFile(path.join(publicRoot,name),'utf8')).replaceAll('__FREEGMA_VERSION__',VERSION));
  else await fs.copyFile(path.join(publicRoot,name),path.join(output,name));
}
await fs.writeFile(path.join(output,'index.html'),(await fs.readFile(path.join(sourceRoot,'client/index.html'),'utf8')).replaceAll('__FREEGMA_VERSION__',VERSION));
console.log('Freegma built: '+output);
