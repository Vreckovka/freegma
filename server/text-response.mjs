import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzip} from 'node:zlib';
import {promisify} from 'node:util';
const zip=promisify(gzip),threshold=1024;
export function acceptsGzip(header=''){
 const values=String(header).toLowerCase().split(',').map(part=>{const [name,...params]=part.trim().split(';');const quality=params.map(p=>p.trim()).find(p=>p.startsWith('q='));const q=quality?Number(quality.slice(2)):1;return {name:name.trim(),q:Number.isFinite(q)&&q>=0&&q<=1?q:0};});
 return (values.find(v=>v.name==='gzip')??values.find(v=>v.name==='*'))?.q>0;
}
async function compressed(bytes){try{const result=await zip(bytes,{level:3});return result.length<bytes.length?result:null;}catch{return null;}}
export async function sendText(req,res,status,body,headers){
 const bytes=Buffer.isBuffer(body)?body:Buffer.from(body),packed=bytes.length>=threshold&&acceptsGzip(req.headers['accept-encoding'])?await compressed(bytes):null;
 if(res.destroyed)return;
 res.writeHead(status,{...headers,Vary:'Accept-Encoding','Content-Length':(packed||bytes).length,...(packed?{'Content-Encoding':'gzip'}:{})});res.end(req.method==='HEAD'?undefined:packed||bytes);
}
const matches=(header,etag)=>String(header||'').split(',').some(tag=>tag.trim()==='*'||tag.trim().replace(/^W\//,'')===etag);
// Four build resources, shared across deep board URLs. Metadata invalidates the cache
// when a build replaces files; gzip work is shared between simultaneous requests.
export function editorAssets(build){
 const cache=new Map();
 return async(req,res,route)=>{
  const name=['/app.js','/app.css','/theme.js'].includes(route)?route.slice(1):'index.html',file=path.join(build,name);
  const stat=fs.statSync(file,{bigint:true}),signature=[stat.mtimeNs,stat.ctimeNs,stat.size,stat.ino].join(':');let entry=cache.get(name);
  if(!entry||entry.signature!==signature){const bytes=fs.readFileSync(file);entry={signature,bytes,etag:'"'+createHash('sha256').update(bytes).digest('hex')+'"'};if(bytes.length<=8*1024*1024)cache.set(name,entry);else cache.delete(name);}
  let packed=null;if(entry.bytes.length>=threshold&&acceptsGzip(req.headers['accept-encoding'])){entry.packed??=compressed(entry.bytes);packed=await entry.packed;}
  if(res.destroyed)return;
  const bytes=packed||entry.bytes,etag=packed?entry.etag.slice(0,-1)+'-gzip"':entry.etag;
  const headers={'Content-Type':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-cache',Vary:'Accept-Encoding',ETag:etag,...(packed?{'Content-Encoding':'gzip'}:{})};
  if(['GET','HEAD'].includes(req.method)&&matches(req.headers['if-none-match'],etag)){res.writeHead(304,headers);res.end();return;}
  res.writeHead(200,{...headers,'Content-Length':bytes.length});res.end(req.method==='HEAD'?undefined:bytes);
 };
}
