import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from '../server/http.mjs';
import {FreegmaStore} from '../server/store.mjs';
import {BRAND_ASSETS} from '../shared/brand-assets.mjs';
import {VERSION} from '../shared/design.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
test('approved brand assets have valid dimensions and font-independent matching marks',()=>{
 const publicRoot=path.join(root,'client/public');
 const svg=fs.readFileSync(path.join(publicRoot,'logo.svg'),'utf8');assert.match(svg,/viewBox="0 0 32 34"/);assert.match(svg,/#ae9bff/);assert.match(svg,/#181322/);assert.match(svg,/<path /);assert.doesNotMatch(svg,/<text/);
 assert.equal(fs.readFileSync(path.join(root,'docs/media/mark.svg'),'utf8'),svg);
 for(const [name,size] of [['favicon-32.png',32],['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512]]){const png=fs.readFileSync(path.join(publicRoot,name));assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
 const ico=fs.readFileSync(path.join(publicRoot,'favicon.ico'));assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);for(let i=0;i<3;i++){const entry=6+16*i;assert.equal(ico[entry],[16,32,48][i]);const offset=ico.readUInt32LE(entry+12),bytes=ico.readUInt32LE(entry+8);assert.ok(offset+bytes<=ico.length);assert.equal(ico.subarray(offset,offset+8).toString('hex'),'89504e470d0a1a0a');}
 const manifest=JSON.parse(fs.readFileSync(path.join(publicRoot,'site.webmanifest'),'utf8'));assert.equal(manifest.name,'Freegma');for(const icon of manifest.icons)assert.ok(fs.existsSync(path.join(publicRoot,icon.src.split('?')[0])));
});
test('icons are real cached files on deep board URLs, with HEAD and conditional requests',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-brand-')),store=new FreegmaStore(':memory:',{seed:false});
 for(const name of Object.keys(BRAND_ASSETS))fs.copyFileSync(path.join(root,'client/public',name),path.join(folder,name));fs.writeFileSync(path.join(folder,'index.html'),fs.readFileSync(path.join(root,'client/index.html'),'utf8').replaceAll('__FREEGMA_VERSION__',VERSION));
 const server=createServer({store,build:folder,access:()=>({})});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
  const page=await fetch(base+'/w/workspace_demo/b/board_demo');assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes('/favicon.svg?v='+VERSION));assert.match(html,/rel="apple-touch-icon"/);assert.doesNotMatch(html,/__FREEGMA_VERSION__/);
  for(const [name,mime] of Object.entries(BRAND_ASSETS)){
   const response=await fetch(base+'/'+name+'?v='+VERSION);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),mime);assert.match(response.headers.get('cache-control'),/immutable/);const etag=response.headers.get('etag'),bytes=await response.arrayBuffer();assert.equal(bytes.byteLength,fs.statSync(path.join(folder,name)).size);
   const head=await fetch(base+'/'+name,{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);assert.equal(head.headers.get('etag'),etag);
   const cached=await fetch(base+'/'+name,{headers:{'if-none-match':etag}});assert.equal(cached.status,304);assert.equal((await cached.arrayBuffer()).byteLength,0);
  }
  const denied=await fetch(base+'/logo.svg',{method:'POST'});assert.equal(denied.status,405);assert.equal(denied.headers.get('allow'),'GET, HEAD');
 }finally{await new Promise(resolve=>server.close(resolve));store.close();fs.rmSync(folder,{recursive:true,force:true});}
});
