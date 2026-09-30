import http from 'node:http';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FreegmaStore} from './store.mjs';
import {VERSION} from '../shared/design.mjs';
import {callTool} from './tools.mjs';
import {buildRoot} from './paths.mjs';
export const defaultBuild=buildRoot;
export function embedOrigins(value=process.env.FREEGMA_EMBED_ORIGINS||'http://127.0.0.1:4320,http://127.0.0.1:4318,http://localhost:4320'){return value.split(',').filter(Boolean).map(v=>{const u=new URL(v.trim());if(!['http:','https:'].includes(u.protocol)||u.origin!==v.trim())throw Error('Embedding origins must be HTTP(S) origins without paths.');return u.origin;});}
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
export function createServer({store=new FreegmaStore(),build=process.env.FREEGMA_BUILD||defaultBuild}={}){
  const downloads=new Map(),parents=embedOrigins();
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'self' "+parents.join(' '));
    try{
      const host=req.headers.host||'';if(!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host))return json(res,403,{error:'Local Freegma host required.'});
      if(req.headers.origin){const origin=new URL(req.headers.origin);if(origin.host!==host||!['http:','https:'].includes(origin.protocol))return json(res,403,{error:'Cross-origin request rejected.'});}
      const url=new URL(req.url,'http://'+host),route=url.pathname;
      const sourceDownload=route.match(/^\/api\/source-downloads\/([a-f0-9-]+)$/);
      if(sourceDownload&&req.method==='GET'){
        const file=downloads.get(sourceDownload[1]);
        if(!file||file.expires<Date.now()){downloads.delete(sourceDownload[1]);return json(res,404,{error:'Download expired. Click Download again.'});}
        res.writeHead(200,{'Content-Type':file.filename.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','Content-Disposition':`attachment; filename="${file.filename}"`,'Cache-Control':'no-store'});
        return res.end(file.content);
      }
      if(route==='/api/health')return json(res,200,{ok:true,application:'Freegma',version:VERSION});
      const portable=route.match(/^\/api\/files\/(workspace|board)\/([\w-]+)$/);
      if(portable&&req.method==='GET'){const file=store.exportFree(portable[2],portable[1]);res.setHeader('Content-Disposition',`attachment; filename="${file.filename}"`);return json(res,200,file.package);}
      if(route.startsWith('/assets/')){const a=store.asset(route.slice(8));res.writeHead(200,{'Content-Type':a.mime,'Cache-Control':'public, max-age=31536000, immutable'});return res.end(a.bytes);}
      let body={};if(!['GET','HEAD'].includes(req.method)){if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'JSON content type required.'});let bytes=0,chunks=[],limit=route==='/api/files/import'||route==='/api/tools'?128*1024*1024:12*1024*1024;for await(const chunk of req){bytes+=chunk.length;if(bytes>limit)return json(res,413,{error:'Request exceeds file size limit.'});chunks.push(chunk);}try{body=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{return json(res,400,{error:'Invalid JSON.'});}}
      if(route==='/api/source-downloads'&&req.method==='POST'){
        if(typeof body.filename!=='string'||!/^([A-Z][A-Za-z0-9]{0,108})\.(jsx|css)$/.test(body.filename)||typeof body.content!=='string')return json(res,400,{error:'Supply a component JSX or CSS filename and source text.'});
        if(Buffer.byteLength(body.content)>4*1024*1024)return json(res,413,{error:'Source download exceeds 4 MB.'});
        for(const [id,file] of downloads)if(file.expires<Date.now())downloads.delete(id);
        while(downloads.size>=8)downloads.delete(downloads.keys().next().value);
        const id=randomUUID();downloads.set(id,{filename:body.filename,content:body.content,expires:Date.now()+300000});
        return json(res,201,{url:'/api/source-downloads/'+id});
      }
      if(route==='/api/files/import' &&req.method==='POST')return json(res,201,store.importFree(body.package,body.workspaceId));
      if(route==='/api/workspaces'&&req.method==='GET')return json(res,200,{workspaces:store.workspaces()});
      if(route==='/api/workspaces'&&req.method==='POST')return json(res,201,store.createWorkspace(body.name,body.parentId));
      const deletion=route.match(/^\/api\/(boards|workspaces)\/([\w-]+)\/deletion$/);
      if(deletion&&req.method==='GET')return json(res,200,store.deletionPreview(deletion[1]==='boards'?'board':'workspace',deletion[2]));
      const deleteTarget=route.match(/^\/api\/(boards|workspaces)\/([\w-]+)$/);
      if(deleteTarget&&req.method==='DELETE')return json(res,200,store.deleteDesign(deleteTarget[1]==='boards'?'board':'workspace',deleteTarget[2],body));
      const comments=route.match(/^\/api\/boards\/([\w-]+)\/comments$/);
      if(comments&&req.method==='GET')return json(res,200,store.listComments({boardId:comments[1]},url.origin));
      if(comments&&req.method==='POST')return json(res,200,store.comment(comments[1],body.expectedCommentsRevision,body.actor,body.operation));
      const workspaceComments=route.match(/^\/api\/workspaces\/([\w-]+)\/comments$/);
      if(workspaceComments&&req.method==='GET')return json(res,200,store.listComments({workspaceId:workspaceComments[1]},url.origin));
      const colors=route.match(/^\/api\/workspaces\/([\w-]+)\/colors$/);
      if(colors&&req.method==='GET')return json(res,200,store.colors(colors[1]));
      if(colors&&req.method==='POST')return json(res,200,store.updateColors(colors[1],body.expectedRevision,body.operation));
      const w=route.match(/^\/api\/workspaces\/([\w-]+)(\/boards|\/components)?$/);
      if(w){if(w[2]==='/boards'&&req.method==='GET')return json(res,200,{boards:store.boards(w[1])});if(w[2]==='/boards'&&req.method==='POST')return json(res,201,store.createBoard(w[1],body.name,body.document));if(w[2]==='/components'&&req.method==='GET')return json(res,200,{components:store.components(w[1])});if(!w[2]&&req.method==='PATCH'){if(Object.hasOwn(body,'parentId'))return json(res,200,store.setWorkspaceParent(w[1],body.parentId));return json(res,200,store.renameWorkspace(w[1],body.name));}}
      const b=route.match(/^\/api\/boards\/([\w-]+)(\/operations|\/document|\/history|\/undo|\/redo|\/export)?$/);
      if(b){if(!b[2]&&req.method==='GET')return json(res,200,store.getBoard(b[1]));if(!b[2]&&req.method==='PATCH')return json(res,200,store.meta(b[1],body.expectedRevision,body));if(b[2]==='/operations'&&req.method==='POST')return json(res,200,store.mutate(b[1],body.expectedRevision,body.operations,body.label));if(b[2]==='/document'&&req.method==='PUT')return json(res,200,store.replace(b[1],body.expectedRevision,body.document));if(b[2]==='/history'&&req.method==='GET')return json(res,200,{history:store.history(b[1])});if(['/undo','/redo'].includes(b[2])&&req.method==='POST')return json(res,200,store.travel(b[1],body.expectedRevision,b[2].slice(1),body.expectedPaletteRevision));if(b[2]==='/export'&&req.method==='GET')return json(res,200,store.export(b[1],url.searchParams.get('nodeId'),url.searchParams.get('name')??undefined));}
      if(route==='/api/tools'&&req.method==='POST')return json(res,200,callTool(store,body.name,body.arguments));
      if(route.startsWith('/api/'))return json(res,404,{error:'Endpoint not found.'});
      const file=['/app.js','/app.css','/theme.js'].includes(route)?path.join(build,route.slice(1)):path.join(build,'index.html');
      if(!fs.existsSync(file))return json(res,503,{error:'Build Freegma first: node freegma/scripts/build.mjs'});
      res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-cache'});if(req.method==='HEAD')return res.end();fs.createReadStream(file).pipe(res);
    }catch(e){json(res,e.status||500,{error:e.message});}
  });return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const server=createServer(),port=Number(process.env.FREEGMA_PORT||4330);server.listen(port,'127.0.0.1',()=>console.log(`Freegma ${VERSION} · http://127.0.0.1:${port} · SQLite workspace storage`));
}
