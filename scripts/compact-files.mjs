import fs from 'node:fs';import path from 'node:path';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {FreegmaStore} from '../server/store.mjs';import {decodeFree,encodeFree} from '../server/free-format.mjs';
export function compactFiles(store,backupRoot){
 const root=path.resolve(backupRoot);if(root===store.files.root||root.startsWith(store.files.root+path.sep))throw Error('Backups must be outside workspace storage.');fs.mkdirSync(root,{recursive:true});
 const report=path.join(root,'compaction.json');if(fs.existsSync(report))throw Error('Use a fresh backup directory.');const rows=[];
 // SQLite serializes each file with editor saves. Never publish a stale pre-lock copy.
 const refs=store.db.prepare("SELECT path FROM file_refs WHERE kind IN ('board','workspace') ORDER BY path").all();
 for(const ref of refs)store.transaction(()=>{
  const original=store.files.bytes(ref.path),decoded=decodeFree(original).value,next=encodeFree(decoded);if(next.length>=original.length||next.equals(original))return;
  assert.deepEqual(decodeFree(next).value,decoded);const backup=path.join(root,ref.path+'.gz');fs.mkdirSync(path.dirname(backup),{recursive:true});const fd=fs.openSync(backup,'wx');try{fs.writeFileSync(fd,gzipSync(original,{level:3}));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  store.files.stage(ref.path,next);rows.push({path:ref.path,before:original.length,after:next.length,originalSha256:createHash('sha256').update(original).digest('hex'),backup:path.relative(root,backup).replaceAll('\\','/')});
 });
 const result={date:new Date().toISOString(),files:rows.length,before:rows.reduce((n,r)=>n+r.before,0),after:rows.reduce((n,r)=>n+r.after,0),rows,preserved:'All native values, revisions, histories, Undo cursors, assets and recovery archives. Original bytes are backed up as gzip before publishing each file.'};fs.writeFileSync(report,JSON.stringify(result,null,2),{flag:'wx'});return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===import.meta.filename){const backup=process.argv[2];if(!backup)throw Error('Supply a new absolute backup directory; use only after all HTTP/MCP processes support packed files.');const store=new FreegmaStore(undefined,{seed:false});try{const result=compactFiles(store,backup);console.log(JSON.stringify({...result,rows:undefined},null,2));}finally{store.close();}}
