import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {origins,publicSettings,requestOrigin,proxyBuildConfig,EDITOR_ROUTE} from '../server/public-access.mjs';
import {createServer} from '../server/http.mjs';
import {FreegmaStore} from '../server/store.mjs';
import {BRAND_ROUTE} from '../shared/brand-assets.mjs';
test('public access is opt-in and forwarded mutations require an explicitly allowed origin',()=>{
 const local={headers:{host:'127.0.0.1:4330'}},remote={headers:{...local.headers,'cf-connecting-ip':'192.0.2.1'}};
 assert.equal(requestOrigin(local),'http://127.0.0.1:4330');
 assert.throws(()=>requestOrigin(remote),e=>e.status===403);
 assert.equal(requestOrigin(remote,['https://studio.example']),'https://studio.example');
 for(const origin of ['https://evil.example','null','https://studio.example/path'])assert.throws(()=>requestOrigin({headers:{...remote.headers,origin}},['https://studio.example']),e=>e.status===403);
 assert.equal(requestOrigin({headers:{...remote.headers,origin:'https://studio.example'}},['https://studio.example']),'https://studio.example');
 assert.throws(()=>requestOrigin({headers:{host:'evil.example'}},['https://studio.example']),e=>e.status===403);
 assert.throws(()=>origins('https://studio.example; frame-ancestors *'));
});
test('public origin configuration reloads without restarting the editor and rejects unsafe values',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-public-')),file=path.join(folder,'public.json');
 try{fs.writeFileSync(file,JSON.stringify({origins:['https://first.example'],embedOrigins:['https://dashboard.example']}));const read=publicSettings({FREEGMA_PUBLIC_CONFIG:file});assert.equal(read().origins[0],'https://first.example');
 fs.writeFileSync(file,JSON.stringify({origins:['https://second.example'],embedOrigins:[]}));fs.utimesSync(file,new Date(),new Date(Date.now()+2000));assert.equal(read().origins[0],'https://second.example');
 fs.writeFileSync(file,JSON.stringify({origins:['javascript:alert(1)']}));fs.utimesSync(file,new Date(),new Date(Date.now()+4000));assert.throws(()=>read());
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('Vercel forwards every path and method to the tunnel without publishing a local database',()=>{
 const config=proxyBuildConfig('https://example.trycloudflare.com');assert.equal(config.version,3);assert.deepEqual(config.routes,[{src:BRAND_ROUTE,dest:'https://example.trycloudflare.com/$1',headers:{'Cache-Control':'public, max-age=3600'}},{src:EDITOR_ROUTE,dest:'https://example.trycloudflare.com/$1',headers:{'Cache-Control':'no-cache'}},{src:'/(.*)',dest:'https://example.trycloudflare.com/$1',headers:{'Cache-Control':'no-store'}}]);
 const editor=new RegExp('^'+EDITOR_ROUTE+'$');for(const route of ['/app.js','/app.css','/theme.js'])assert.ok(editor.test(route));for(const route of ['/api/boards','/appXjs','/app.js/extra','/w/project/b/board'])assert.equal(editor.test(route),false);
 const brand=new RegExp('^'+BRAND_ROUTE+'$');assert.ok(brand.test('/favicon.ico'));assert.ok(brand.test('/site.webmanifest'));assert.equal(brand.test('/api/boards'),false);assert.equal(brand.test('/faviconXico'),false);
 for(const upstream of ['', 'http://localhost:4330','https://user:secret@example.com','https://example.com/path','https://example.com?query=1'])assert.throws(()=>proxyBuildConfig(upstream));
});
test('public HTTP editor shares local revisions, accepts saves and downloads, rejects cross-origin saves',async()=>{
 const store=new FreegmaStore(':memory:',{seed:false}),workspace=store.createWorkspace('Public test'),board=store.createBoard(workspace.id,'Public board');
 const server=createServer({store,access:()=>({origins:['https://studio.example'],embedOrigins:['https://dashboard.example']})});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port,headers={'cf-connecting-ip':'192.0.2.1',origin:'https://studio.example','content-type':'application/json'};
 try{
 const response=await fetch(base+'/api/boards/'+board.id,{headers});assert.equal(response.status,200);assert.match(response.headers.get('content-security-policy'),/frame-ancestors.*https:\/\/dashboard.example/);
 const save=await fetch(base+'/api/boards/'+board.id+'/operations',{method:'POST',headers,body:JSON.stringify({expectedRevision:board.revision,operations:[{op:'add',node:{type:'text',text:'Public edit'}}]})});assert.equal(save.status,200);assert.equal(store.getBoard(board.id).document.nodes[0].text,'Public edit');
 const denied=await fetch(base+'/api/boards/'+board.id+'/operations',{method:'POST',headers:{...headers,origin:'https://evil.example'},body:'{}'});assert.equal(denied.status,403);
 const download=await fetch(base+'/api/files/board/'+board.id,{headers});assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/\.free/);
 }finally{await new Promise(resolve=>server.close(resolve));store.close();}
});
