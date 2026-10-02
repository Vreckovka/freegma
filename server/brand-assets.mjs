import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {BRAND_ASSETS} from '../shared/brand-assets.mjs';
import {VERSION} from '../shared/design.mjs';
export function brandAssets(build){
 const cache=new Map();
 return (req,res,url)=>{
  const name=url.pathname.slice(1);
  if(!Object.hasOwn(BRAND_ASSETS,name))return false;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return true;}
  let asset=cache.get(name);
  if(!asset){
   const file=path.join(build,name);
   if(!fs.existsSync(file)){res.writeHead(503,{'Cache-Control':'no-store'});res.end('Build Freegma first: yarn build');return true;}
   const bytes=fs.readFileSync(file);asset={bytes,etag:'"'+createHash('sha256').update(bytes).digest('hex')+'"'};cache.set(name,asset);
  }
  res.setHeader('Content-Type',BRAND_ASSETS[name]);res.setHeader('ETag',asset.etag);
  res.setHeader('Cache-Control',url.searchParams.get('v')===VERSION?'public, max-age=31536000, immutable':'public, max-age=3600');
  if(String(req.headers['if-none-match']||'').split(',').some(tag=>tag.trim().replace(/^W\//,'')===asset.etag||tag.trim()==='*')){res.writeHead(304);res.end();return true;}
  res.setHeader('Content-Length',asset.bytes.length);res.writeHead(200);res.end(req.method==='HEAD'?undefined:asset.bytes);return true;
 };
}
