import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import {gunzipSync} from 'node:zlib';
import {FreegmaStore} from '../server/store.mjs';
import {makeNode} from '../shared/design.mjs';
import {boardRepresentations} from '../server/board-response.mjs';
import {createServer} from '../server/http.mjs';

const setup=()=>{
 const store=new FreegmaStore(':memory:',{seed:false}),parent=store.createWorkspace('Project'),workspace=store.createWorkspace('Theme',parent.id);
 const node=makeNode('frame',{id:'frame',name:'Original'}),board=store.createBoard(workspace.id,'Board',{nodes:[node]});
 return {store,parent,workspace,board};
};
const json=entry=>JSON.parse(entry.bytes.toString());

test('board response reuse observes edits, comments, parent colors, theme and undo independently',()=>{
 const {store,parent,workspace,board}=setup();try{
  const read=boardRepresentations(store),first=read(board.id);assert.equal(read(board.id),first);
  const publicCopy=store.getBoard(board.id);publicCopy.document.nodes[0].name='Only a copy';assert.equal(json(read(board.id)).document.nodes[0].name,'Original');
  let b=store.mutate(board.id,board.revision,[{op:'update',id:'frame',patch:{name:'Edited'}}]);const changed=read(b.id);assert.notEqual(changed,first);assert.equal(json(changed).document.nodes[0].name,'Edited');
  b=store.comment(b.id,0,{id:'test',name:'Test'},{op:'create',x:0,y:0,text:'Feedback'});const commented=read(b.id);assert.notEqual(commented,changed);assert.equal(json(commented).commentsRevision,1);assert.equal(json(commented).revision,b.revision);
  let palette=store.colors(parent.id);store.updateColors(parent.id,palette.revision,{op:'setColor',key:'text',value:'#123456'});const colored=read(b.id);assert.notEqual(colored,commented);assert.equal(json(colored).palette.themes.find(t=>t.id===json(colored).palette.themeId).colors.text,'#123456');
  palette=store.colors(parent.id);store.updateColors(parent.id,palette.revision,{op:'createTheme',name:'Other'});palette=store.colors(parent.id);store.updateColors(workspace.id,palette.revision,{op:'setTheme',themeId:palette.themes.at(-1).id});const themed=read(b.id);assert.equal(json(themed).palette.themeId,palette.themes.at(-1).id);
  b=store.getBoard(b.id);store.travel(b.id,b.revision,'undo',b.palette.revision);assert.notEqual(read(b.id),themed);assert.deepEqual(json(read(b.id)),JSON.parse(JSON.stringify(store.getBoard(b.id))));
  b=store.getBoard(b.id);store.travel(b.id,b.revision,'undo',b.palette.revision);assert.equal(json(read(b.id)).document.nodes[0].name,'Original');
 }finally{store.close();}
});

test('external same-revision edits, corruption and missing files cannot return an old response',()=>{
 const {store,board}=setup();try{
  const read=boardRepresentations(store),first=read(board.id),file=store.files.resolve(store.ref('board',board.id).path),raw=store.readBoard(board.id);
  raw.name='External rename';fs.writeFileSync(file,JSON.stringify(raw));const changed=read(board.id);assert.notEqual(changed,first);assert.equal(json(changed).name,'External rename');assert.equal(json(changed).revision,board.revision);
  raw.document.nodes[0].width=-1;fs.writeFileSync(file,JSON.stringify(raw));assert.throws(()=>read(board.id),/positive/);
  fs.unlinkSync(file);assert.throws(()=>read(board.id),/ENOENT/);
 }finally{store.close();}
});

test('response cache evicts least recently used entries and skips oversized representations',()=>{
 const {store,workspace,board}=setup();try{
  const second=store.createBoard(workspace.id,'Second',{nodes:[]}),third=store.createBoard(workspace.id,'Third',{nodes:[]}),read=boardRepresentations(store,{maxEntries:2});
  const first=read(board.id),other=read(second.id);assert.equal(read(board.id),first);read(third.id);assert.notEqual(read(second.id),other);
  const uncached=boardRepresentations(store,{maxBytes:1});assert.notEqual(uncached(board.id),uncached(board.id));
 }finally{store.close();}
});

test('HTTP repeated and concurrent board reads share serialization while no-store and edits stay fresh',async()=>{
 const {store,board}=setup();let serializations=0;const original=store.getBoard;store.getBoard=(...args)=>{serializations++;return original(...args);};
 const server=createServer({store,access:()=>({})});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const request=(headers={})=>new Promise((resolve,reject)=>{
  http.get({host:'127.0.0.1',port:server.address().port,path:'/api/boards/'+board.id,headers,timeout:5000},res=>{
   const chunks=[];res.on('data',v=>chunks.push(v));res.on('error',reject);res.on('end',()=>{const wire=Buffer.concat(chunks);resolve({status:res.statusCode,headers:res.headers,wire,body:res.headers['content-encoding']==='gzip'?gunzipSync(wire):wire});});
  }).on('error',reject).on('timeout',function(){this.destroy(Error('Local timeout'));});
 });
 try{
  const [a,b]=await Promise.all([request({'Accept-Encoding':'gzip'}),request({'Accept-Encoding':'gzip'})]);assert.equal(serializations,1);assert.deepEqual(a.wire,b.wire);assert.equal(a.headers['cache-control'],'no-store');assert.equal(a.headers.etag,undefined);assert.equal(a.headers['content-encoding'],'gzip');
  const plain=await request({'Accept-Encoding':'gzip;q=0,*;q=1','If-None-Match':'*'});assert.equal(plain.status,200);assert.equal(plain.headers['content-encoding'],undefined);assert.deepEqual(plain.wire,a.body);assert.equal(serializations,1);
  store.mutate(board.id,board.revision,[{op:'update',id:'frame',patch:{name:'New value'}}]);const next=await request({'Accept-Encoding':'gzip'});assert.equal(JSON.parse(next.body).document.nodes[0].name,'New value');assert.equal(JSON.parse(next.body).revision,board.revision+1);
 }finally{await new Promise(r=>server.close(r));store.close();}
});
