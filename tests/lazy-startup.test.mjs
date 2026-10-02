import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {FreegmaStore} from '../server/store.mjs';import {DesignFiles,workspacePath} from '../server/files.mjs';import {encodeFree} from '../server/free-format.mjs';import {makeNode} from '../shared/design.mjs';

function fixture(){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-lazy-startup-')),db=path.join(folder,'index.sqlite'),store=new FreegmaStore(db,{seed:false}),first=store.createWorkspace('Viewed'),other=store.createWorkspace('Unopened');
 const a=store.createBoard(first.id,'Viewed board',{nodes:[makeNode('frame',{id:'frame'})]}),b=store.createBoard(other.id,'Unopened board',{nodes:[makeNode('frame',{id:'other_frame'})]});
 store.mutate(a.id,a.revision,[{op:'update',id:'frame',patch:{x:37}}]);const expected=store.getBoard(a.id),original=store.readBoard(b.id),root=store.files.root;store.close();return {folder,db,first,other,a,b,expected,original,root};
}
const cleanup=f=>{assert.ok(f.folder.startsWith(path.join(os.tmpdir(),'freegma-lazy-startup-')));fs.rmSync(f.folder,{recursive:true,force:true});};

test('cold indexing decodes no boards; a selected workspace alone loads its validated design and history',()=>{
 const f=fixture(),decoded=[],original=DesignFiles.prototype.decoded;let store;
 DesignFiles.prototype.decoded=function(file){if(file.includes('/b/'))decoded.push(file);return original.call(this,file);};
 try{
  store=new FreegmaStore(f.db,{seed:false});assert.equal(decoded.length,0);assert.equal(store.workspaces().length,2);assert.equal(decoded.length,0);
  assert.equal(store.boards(f.first.id).length,1);assert.equal(decoded.length,1);assert.ok(decoded[0].includes(f.a.id));assert.deepEqual(store.getBoard(f.a.id),f.expected);
  assert.equal(store.travel(f.a.id,f.expected.revision,'undo').document.nodes[0].x,0);assert.ok(decoded.every(file=>!file.includes(f.b.id)));
 }finally{DesignFiles.prototype.decoded=original;store?.close();cleanup(f);}
});

test('an unopened corrupt board is validated when accessed, while explicit reindex remains strict',()=>{
 const f=fixture();let store;try{
  f.original.document.nodes[0].width=-1;fs.writeFileSync(f.b.filePath,encodeFree(f.original));store=new FreegmaStore(f.db,{seed:false});assert.equal(store.workspaces().length,2);assert.deepEqual(store.getBoard(f.a.id),f.expected);
  assert.throws(()=>store.getBoard(f.b.id),/positive/);assert.throws(()=>store.boards(f.other.id),/positive/);assert.throws(()=>store.transaction(()=>store.reindex()),/positive/);
  assert.deepEqual(store.getBoard(f.a.id),f.expected);
 }finally{store?.close();cleanup(f);}
});

test('startup rejects unsafe or missing file references; opened files still require matching identities',()=>{
 const f=fixture();let store;try{
  f.original.id='different_board';fs.writeFileSync(f.b.filePath,encodeFree(f.original));store=new FreegmaStore(f.db,{seed:false});assert.throws(()=>store.getBoard(f.b.id),/identity mismatch/);assert.throws(()=>store.boards(f.other.id),/identity mismatch/);store.close();store=null;
  fs.unlinkSync(f.b.filePath);assert.throws(()=>new FreegmaStore(f.db,{seed:false}),/ENOENT/);
  fs.writeFileSync(f.b.filePath,encodeFree({...f.original,id:f.b.id}));const manifestFile=path.join(f.root,workspacePath(f.other.id)),manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));manifest.boards[0].path='../outside.free';fs.writeFileSync(manifestFile,JSON.stringify(manifest));assert.throws(()=>new FreegmaStore(f.db,{seed:false}),/Invalid board reference/);
 }finally{store?.close();cleanup(f);}
});

test('recovery fully validates published boards before accepting a lazy startup',()=>{
 const f=fixture();try{
  const relative=f.other.id+'/b/'+f.b.id+'.free',invalid={...f.original,revision:0},journal=path.join(f.root,'.transaction.json');fs.writeFileSync(journal,JSON.stringify({version:1,entries:[{file:relative,base64:encodeFree(invalid).toString('base64')}]}));
  assert.throws(()=>new FreegmaStore(f.db,{seed:false}),/Invalid board metadata/);assert.ok(fs.existsSync(journal));
 }finally{cleanup(f);}
});
