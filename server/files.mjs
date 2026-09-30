import fs from 'node:fs';
import path from 'node:path';
import {newId,validateDocument} from '../shared/design.mjs';
import {validateComments} from '../shared/comments.mjs';
import {validateColorSystem} from '../shared/colors.mjs';
export const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export const identifier=id=>{if(typeof id!=='string'||!/^\w[\w-]{0,99}$/.test(id))fail('Invalid file identifier.');return id;};
export const workspacePath=id=>`${identifier(id)}/${id}.free`;
export const boardPath=(w,b)=>`${identifier(w)}/b/${identifier(b)}.free`;
export const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'};
export function imageBytes(mime,base64){
  if(!extensions[mime]||typeof base64!=='string'||base64.length>12*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(base64))fail('Use base64 PNG, JPEG, WebP or GIF bytes.');
  const bytes=Buffer.from(base64,'base64');if(!bytes.length||bytes.length>8*1024*1024)fail('Images must be between 1 byte and 8 MB.');
  const valid=mime==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216:mime==='image/webp'?bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP':bytes.subarray(0,3).toString()==='GIF';
  if(!valid)fail('Image bytes do not match its MIME type.');return bytes;
}
export function validateBoard(b){
  if(!b||b.format!=='freegma-board'||b.formatVersion!==1)fail('Unsupported .free board format.');
  identifier(b.id);identifier(b.workspaceId);
  if(typeof b.name!=='string'||!b.name.trim()||b.name.length>200||typeof b.taskRef!=='string'||b.taskRef.length>500||!Number.isSafeInteger(b.revision)||b.revision<1||!Number.isSafeInteger(b.cursor)||b.cursor<0||!Array.isArray(b.history)||b.history.length>10000)fail('Invalid board metadata.');
  validateDocument(b.document);validateComments(b.comments,b.commentsRevision);
  let seq=0;for(const h of b.history){if(h.seq!==++seq||typeof h.label!=='string'||h.label.length>200||typeof h.createdAt!=='string')fail('Invalid board history.');validateDocument(h.before);validateDocument(h.after);}
  if(b.cursor>seq)fail('Invalid history cursor.');return b;
}
export function validateWorkspace(w){
  if(!w||w.format!=='freegma-workspace'||w.formatVersion!==1)fail('Unsupported .free workspace format.');identifier(w.id);if(!/^workspace_[\w-]+$/.test(w.id))fail('Workspace IDs must start with workspace_.');
  if(typeof w.name!=='string'||!w.name.trim()||w.name.length>200||!Array.isArray(w.boards)||w.boards.length>2000||!Array.isArray(w.components)||w.components.length>2000||!Array.isArray(w.assets)||w.assets.length>2000)fail('Invalid workspace metadata.');
  if(w.parentId!=null){identifier(w.parentId);if(w.parentId===w.id)fail('A workspace cannot parent itself.');}
  if(w.colorSystem!=null)validateColorSystem(w.colorSystem);
  if(w.colorTheme!=null&&(typeof w.colorTheme!=='string'||!/^[a-z][a-z0-9_-]{0,79}$/.test(w.colorTheme)))fail('Invalid workspace color theme.');
  for(const c of w.components){identifier(c.id);if(!['component','template'].includes(c.kind)||typeof c.name!=='string'||!c.name.trim()||c.name.length>200)fail('Invalid component metadata.');validateDocument(c.definition);}
  for(const a of w.assets){identifier(a.id);if(!extensions[a.mime]||a.path!==`Assets/${a.id}.${extensions[a.mime]}`||typeof a.filename!=='string')fail('Invalid workspace asset path.');}
  const ids=new Set();for(const item of [...w.boards,...w.components,...w.assets]){identifier(item.id);if(ids.has(item.id))fail('Duplicate workspace item.');ids.add(item.id);}
  return w;
}
export class DesignFiles {
  constructor(root){this.root=path.resolve(root);fs.mkdirSync(this.root,{recursive:true});this.pending=null;this.cache=new Map();this.cacheBytes=0;}
  resolve(relative){
    if(typeof relative!=='string'||relative.includes('\\')||relative.split('/').some(p=>!p||p==='.'||p==='..')||path.isAbsolute(relative))fail('Unsafe Freegma file path.');
    const target=path.resolve(this.root,relative);if(!target.startsWith(this.root+path.sep))fail('File is outside Freegma storage.');
    for(let at=target;at!==this.root;at=path.dirname(at))if(fs.existsSync(at)&&fs.lstatSync(at).isSymbolicLink())fail('Freegma storage cannot contain symbolic links.');return target;
  }
  bytes(relative){if(this.pending?.has(relative)){const staged=this.pending.get(relative);if(staged===null)fail('File was deleted.',404);return staged;}return fs.readFileSync(this.resolve(relative));}
  json(relative){try{return JSON.parse(this.bytes(relative).toString('utf8'));}catch(e){if(e.status)throw e;fail('Unreadable Freegma file: '+relative,500);}}
  validated(relative,validate,copy=true){
    if(this.pending?.has(relative)){const value=validate(this.json(relative));return copy?structuredClone(value):value;}
    const target=this.resolve(relative),stat=fs.statSync(target,{bigint:true}),signature=[stat.mtimeNs,stat.ctimeNs,stat.size,stat.ino].join(':');let entry=this.cache.get(relative);
    if(!entry||entry.signature!==signature){
      if(entry){this.cache.delete(relative);this.cacheBytes-=entry.bytes;}
      const value=validate(this.json(relative)),bytes=Number(stat.size);entry={signature,value,bytes};
      if(bytes<=96*1024*1024){while(this.cache.size&&(this.cache.size>=32||this.cacheBytes+bytes>96*1024*1024)){const key=this.cache.keys().next().value;this.cacheBytes-=this.cache.get(key).bytes;this.cache.delete(key);}this.cache.set(relative,entry);this.cacheBytes+=bytes;}
    }else{this.cache.delete(relative);this.cache.set(relative,entry);}
    return copy?structuredClone(entry.value):entry.value;
  }
  stage(relative,value){this.resolve(relative);if(!this.pending)throw Error('File writes require a storage transaction.');this.pending.set(relative,Buffer.isBuffer(value)?value:Buffer.from(JSON.stringify(value,null,2)+'\n'));}
  remove(relative){this.resolve(relative);if(!this.pending)throw Error('File deletion requires a storage transaction.');this.pending.set(relative,null);}
  publish(entry){if(entry.base64===null){fs.rmSync(this.resolve(entry.file),{force:true});}else this.atomic(entry.file,Buffer.from(entry.base64,'base64'));const cached=this.cache.get(entry.file);if(cached){this.cacheBytes-=cached.bytes;this.cache.delete(entry.file);}}
  atomic(relative,bytes){const target=this.resolve(relative);fs.mkdirSync(path.dirname(target),{recursive:true});const temp=target+'.'+newId('tmp');let fd;try{fd=fs.openSync(temp,'wx');fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);fs.closeSync(fd);fd=null;fs.renameSync(temp,target);}finally{if(fd!=null)fs.closeSync(fd);if(fs.existsSync(temp))fs.unlinkSync(temp);}}
  flush(){if(!this.pending?.size)return false;const entries=[...this.pending].map(([file,bytes])=>({file,base64:bytes===null?null:bytes.toString('base64')}));this.atomic('.transaction.json',Buffer.from(JSON.stringify({version:1,entries})));for(const entry of entries)this.publish(entry);return true;}
  finish(){const journal=this.resolve('.transaction.json');if(fs.existsSync(journal))fs.unlinkSync(journal);}
  recover(){const journal=this.resolve('.transaction.json');if(!fs.existsSync(journal))return false;const pending=JSON.parse(fs.readFileSync(journal,'utf8'));if(pending.version!==1||!Array.isArray(pending.entries))fail('Invalid Freegma recovery journal.',500);for(const e of pending.entries){this.resolve(e.file);if(e.file==='.transaction.json'||(e.base64!==null&&typeof e.base64!=='string'))fail('Invalid recovery target.',500);}for(const e of pending.entries)this.publish(e);return true;}
}
