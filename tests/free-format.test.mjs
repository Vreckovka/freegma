import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gzipSync} from 'node:zlib';
import {packFree,unpackFree,encodeFree,decodeFree,FREE_LIMIT} from '../server/free-format.mjs';
import {FreegmaStore} from '../server/store.mjs';import {makeNode} from '../shared/design.mjs';import {createServer} from '../server/http.mjs';import {callTool} from '../server/tools.mjs';
import os from 'node:os';import path from 'node:path';import {gunzipSync} from 'node:zlib';import {compactFiles} from '../scripts/compact-files.mjs';
const document=()=>({version:1,nodes:[makeNode('frame',{id:'frame'}),...Array.from({length:30},(_,i)=>makeNode('text',{id:'text_'+i,parentId:'frame',text:'Editable component '+i}))]});
test('lossless wrappers preserve every byte of serialized Unicode, CSS, and nested metadata; small native JSON stays plain',()=>{
 const value={format:'freegma-board',formatVersion:1,document:document(),history:[{before:document(),after:document()}],extra:'ž 🦊 #123456'};
 const packed=packFree(value);assert.equal(packed.format,'freegma-packed');assert.deepEqual(unpackFree(packed).value,value);assert.equal(unpackFree(packed).bytes,Buffer.byteLength(JSON.stringify(value)));assert.ok(encodeFree(value).length<Buffer.byteLength(JSON.stringify(value))*.2);
 const plain={format:'freegma-workspace',formatVersion:1,id:'small'};assert.equal(packFree(plain),plain);assert.deepEqual(decodeFree(encodeFree(plain)).value,plain);
});
test('malformed, truncated, mismatched and expansion-limited packed files reject instead of partially importing',()=>{
 const valid=packFree({format:'freegma-package',formatVersion:1,kind:'board',payload:'data '.repeat(4000)});
 for(const patch of [{formatVersion:2},{encoding:'zip'},{data:'!'},{data:valid.data.slice(0,-4)},{uncompressedBytes:1},{uncompressedBytes:FREE_LIMIT+1},{contentType:'freegma-board'},{kind:'workspace'}])assert.throws(()=>unpackFree({...valid,...patch}),/packed/);
 assert.throws(()=>unpackFree(valid,{maxBytes:100}),/packed/);
  const wrong={...valid,data:gzipSync(Buffer.from('null')).toString('base64'),uncompressedBytes:4};assert.throws(()=>unpackFree(wrong),/packed/);
});
test('nested compression cannot conceal excessive workspace depth before import validation',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const w=s.createWorkspace('Original'),b=s.createBoard(w.id,'Board',document()),pkg=s.exportFree(w.id).package,child=packFree({...pkg,kind:'workspace'});assert.equal(child.format,'freegma-packed');assert.throws(()=>s.importFree({...pkg,children:[child]}),/outer/);assert.deepEqual(s.workspaces().map(w=>w.id),[w.id]);assert.deepEqual(s.getBoard(b.id).document,b.document);}finally{s.close();}
});
test('compressed storage, journal recovery and Undo/Redo keep exact native documents and all history',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const w=s.createWorkspace('Compressed');let b=s.createBoard(w.id,'Board',document());const original=b.document;
  b=s.mutate(b.id,b.revision,[{op:'update',id:'text_1',patch:{text:'Second value'}}]);const saved=b;
  assert.equal(JSON.parse(fs.readFileSync(b.filePath)).format,'freegma-packed');assert.deepEqual(s.readBoard(b.id).document,b.document);
  const atomic=s.files.atomic.bind(s.files);let writes=0;s.files.atomic=(file,bytes)=>{if(++writes===2)throw Error('Interrupted');return atomic(file,bytes);};
  assert.throws(()=>s.mutate(b.id,b.revision,[{op:'update',id:'text_1',patch:{text:'Recovered value'}}]),/Interrupted/);s.files.atomic=atomic;
  b=s.getBoard(b.id);assert.equal(b.document.nodes.find(n=>n.id==='text_1').text,'Recovered value');assert.equal(s.readBoard(b.id).history.length,2);
  b=s.travel(b.id,b.revision,'undo');assert.deepEqual(b.document,saved.document);b=s.travel(b.id,b.revision,'undo');assert.deepEqual(b.document,original);b=s.travel(b.id,b.revision,'redo');assert.deepEqual(b.document,saved.document);
 }finally{s.close();}
});
test('cache accounts for expanded documents, and legacy external JSON still invalidates packed summaries',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const w=s.createWorkspace('Cache');const b=s.createBoard(w.id,'Board',document());s.getBoard(b.id);const entry=s.files.cache.get(s.ref('board',b.id).path),raw=s.readBoard(b.id);
  assert.equal(entry.bytes,Buffer.byteLength(JSON.stringify(raw)));assert.ok(entry.bytes>fs.statSync(b.filePath).size*4);
  raw.name='Externally edited';raw.revision++;fs.writeFileSync(b.filePath,JSON.stringify(raw));assert.equal(s.boards(w.id)[0].name,raw.name);assert.equal(s.getBoard(b.id).revision,raw.revision);
 }finally{s.close();}
});
test('HTTP compact downloads and MCP native/compact exports import with exact board content and history',async()=>{
 const s=new FreegmaStore(':memory:',{seed:false}),target=new FreegmaStore(':memory:',{seed:false}),server=createServer({store:s,access:()=>({origins:[],embedOrigins:[]})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const w=s.createWorkspace('Portable'),b=s.createBoard(w.id,'Board',document()),url='http://127.0.0.1:'+server.address().port;
  const response=await fetch(url+'/api/files/board/'+b.id);const pkg=await response.json();assert.equal(pkg.kind,'board');assert.equal(pkg.format,'freegma-packed');assert.match(response.headers.get('content-disposition'),new RegExp(b.id+'\\.free'));
  const imported=target.importFree(pkg);assert.deepEqual(imported.boards[0].document,b.document);
  assert.equal(callTool(s,'freegma_export_file',{id:b.id,kind:'board'}).package.format,'freegma-package');assert.deepEqual(unpackFree(callTool(s,'freegma_export_file',{id:b.id,kind:'board',compact:true}).package).value,s.exportFree(b.id,'board').package);
  const packedBoard=packFree(s.readBoard(b.id));const replacement=target.replace(imported.boards[0].id,imported.boards[0].revision,packedBoard);assert.deepEqual(replacement.document,b.document);
 }finally{await new Promise(r=>server.close(r));s.close();target.close();}
});
test('compaction backs up exact original bytes and preserves revision, metadata, redo and recoverable archives',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-compaction-')),s=new FreegmaStore(path.join(dir,'index.sqlite'),{seed:false});try{
  const w=s.createWorkspace('Workspace');let b=s.createBoard(w.id,'Board',document());b=s.mutate(b.id,b.revision,[{op:'update',id:'text_1',patch:{text:'Changed'}}]);b=s.travel(b.id,b.revision,'undo');
  const value=s.readBoard(b.id),original=Buffer.from(JSON.stringify(value,null,2)+'\n');fs.writeFileSync(b.filePath,original);const trash=path.join(s.files.root,'.trash','preserved.free');fs.mkdirSync(path.dirname(trash),{recursive:true});fs.writeFileSync(trash,original);
  const result=compactFiles(s,path.join(dir,'backups'));assert.equal(result.files,1);assert.deepEqual(gunzipSync(fs.readFileSync(path.join(dir,'backups',result.rows[0].backup))),original);assert.deepEqual(fs.readFileSync(trash),original);assert.deepEqual(s.readBoard(b.id),value);assert.equal(s.getBoard(b.id).canRedo,true);assert.equal(s.travel(b.id,b.revision,'redo').document.nodes.find(n=>n.id==='text_1').text,'Changed');
 }finally{s.close();fs.rmSync(dir,{recursive:true,force:true});}
});
