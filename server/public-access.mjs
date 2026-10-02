import {BRAND_ROUTE} from '../shared/brand-assets.mjs';
import fs from 'node:fs';
export function origins(value='') {
  return value.split(',').map(v=>v.trim()).filter(Boolean).map(value=>{
    const url=new URL(value);
    if(!['http:','https:'].includes(url.protocol)||url.origin!==value)throw Error('Public origins must be HTTP(S) origins without paths.');
    return url.origin;
  });
}
export function publicSettings(env=process.env) {
  let previous='',saved={};
  return ()=>{
    if(env.FREEGMA_PUBLIC_CONFIG){
      const file=env.FREEGMA_PUBLIC_CONFIG,stamp=String(fs.statSync(file).mtimeMs);
      if(stamp!==previous){const value=JSON.parse(fs.readFileSync(file,'utf8'));saved={origins:origins((value.origins||[]).join(',')),embedOrigins:origins((value.embedOrigins||[]).join(','))};previous=stamp;}
      return saved;
    }
    return {origins:origins(env.FREEGMA_PUBLIC_ORIGINS),embedOrigins:origins(env.FREEGMA_EMBED_ORIGINS)};
  };
}
export function requestOrigin(req,allowed=[]) {
  const host=req.headers.host||'';
  if(!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host))throw Object.assign(Error('Local Freegma host required.'),{status:403});
  const remote=Boolean(req.headers['cf-connecting-ip']||req.headers['x-forwarded-for']);
  if(remote&&!allowed.length)throw Object.assign(Error('Public Freegma access is not configured.'),{status:403});
  let origin;
  if(req.headers.origin){
    try{const url=new URL(req.headers.origin);origin=url.origin;if(origin!==req.headers.origin||!['http:','https:'].includes(url.protocol)||!(url.host===host||remote&&allowed.includes(origin)))throw Error();}
    catch{throw Object.assign(Error('Cross-origin request rejected.'),{status:403});}
  }
  if(!remote)return 'http://'+host;
  const forwarded=String(req.headers['x-forwarded-host']||'').split(',')[0].trim();
  const candidate='https://'+forwarded;
  return allowed.includes(origin)?origin:allowed.includes(candidate)?candidate:allowed[0];
}
export function proxyBuildConfig(upstream) {
  const url=new URL(upstream||'');
  if(url.protocol!=='https:'||url.origin!==upstream||url.username||url.password)throw Error('FREEGMA_UPSTREAM must be an HTTPS origin without a path or credentials.');
  return {version:3,routes:[{src:BRAND_ROUTE,dest:url.origin+'/$1',headers:{'Cache-Control':'public, max-age=3600'}},{src:'/(.*)',dest:url.origin+'/$1',headers:{'Cache-Control':'no-store'}}]};
}
