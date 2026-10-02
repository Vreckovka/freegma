import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {FreegmaStore} from '../server/store.mjs';
import {createServer} from '../server/http.mjs';
import {callTool} from '../server/tools.mjs';
import {createExportScope,normalizeScopeAssets} from './fixtures/export-scope.mjs';
const digest=(reply,fixture)=>createHash('sha256').update(normalizeScopeAssets(JSON.stringify(Object.fromEntries(['filename','code','jsxCode','css','cssFilename','nodeId','assets'].map(k=>[k,reply[k]]))).replace(/Generated from Freegma [\d.]+/g,'Generated from Freegma VERSION'),fixture)).digest('hex');
test('nested selections retain frozen JSX/CSS, percent and explicit positioning, assets and generated schematic output',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});
 try{
  const f=createExportScope(s),golden=JSON.parse(fs.readFileSync(new URL('./fixtures/export-scope-golden.json',import.meta.url))),before=s.readBoard(f.board.id);
  for(const [key,id]of [['board',null],['card','scope_card'],['heading','scope_heading'],['swatch','scope_scheme_swatch_5']])assert.equal(digest(s.export(f.board.id,id),f),golden.snapshots[key],key);
  const card=s.export(f.board.id,'scope_card');
  assert.deepEqual(card.assets,[f.selected.src]);assert.match(card.css,/left: 27px/);assert.match(card.css,/top: 41px/);assert.match(card.css,/width: 75%/);assert.match(card.css,/flex-direction: column/);
  assert.doesNotMatch(card.code,/scope_outer|scope_outside|scope_other/);assert.match(card.code,/scope_scheme_swatch_5/);
  assert.deepEqual(s.export(f.board.id).assets,[f.selected.src,f.outside.src]);assert.deepEqual(s.readBoard(f.board.id),before);
 }finally{s.close();}
});
test('scoped master exports retain names, fresh inherited colors and task metadata without modifying stored sources',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});
 try{
  const parent=s.createWorkspace('Parent colors'),f=createExportScope(s,parent.id),published=s.saveComponent(f.board.id,f.board.revision,'scope_card','Shared card','component');
  const linked=s.meta(f.board.id,published.board.revision,{taskRef:'DASH-773'}),updated=s.mutate(f.board.id,linked.revision,[{op:'update',id:'scope_heading',patch:{text:'Updated reusable card'}}]),p=s.colors(parent.id);
  s.updateColors(parent.id,p.revision,{op:'setColor',key:'accent',value:'#12ab34'});
  const before=s.readBoard(f.board.id),palette=s.colors(f.workspace.id),r=s.export(f.board.id,'scope_card');
  assert.equal(r.filename,'SharedCard.jsx');assert.equal(r.cssFilename,'SharedCard.css');assert.equal(r.taskRef,'DASH-773');assert.equal(r.revision,updated.revision);assert.equal(r.paletteRevision,palette.revision);
  assert.match(r.jsxCode,/Updated reusable card/);assert.match(r.jsxCode,/#12ab34/);assert.equal(r.colors.accent,'#12ab34');
  r.colors.accent='#000000';r.assets.push('/assets/caller-only');assert.deepEqual(s.readBoard(f.board.id),before);assert.deepEqual(s.colors(f.workspace.id),palette);
  assert.equal(s.export(f.board.id,'scope_card','Caller title').filename,'CallerTitle.jsx');
 }finally{s.close();}
});
test('full-board and generated-node fallbacks keep original naming and failures without altering source state',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});
 try{
  const f=createExportScope(s),before=s.readBoard(f.board.id),palette=s.colors(f.workspace.id),generated=s.export(f.board.id,'scope_scheme_swatch_5');
  assert.equal(generated.filename,'ScopedExportLaboratory.jsx');assert.deepEqual(generated.assets,[]);assert.doesNotMatch(generated.jsxCode,/scope_image|scope_heading/);
  assert.equal(s.export(f.board.id,'').nodeId,'');assert.deepEqual(s.export(f.board.id,'').assets,[f.selected.src,f.outside.src]);
  assert.throws(()=>s.export(f.board.id,'absent'),e=>e.message==='Layer not found.'&&e.status===400);
  assert.throws(()=>s.export('absent','scope_card'),e=>e.message==='Board not found.'&&e.status===404);
  const flow=s.createFlowWorkspace('Logical flow');assert.throws(()=>s.export(flow.board.id),/Export React from the referenced design board/);
  assert.deepEqual(s.readBoard(f.board.id),before);assert.deepEqual(s.colors(f.workspace.id),palette);
 }finally{s.close();}
});
test('HTTP and MCP native-component exports retain the same code, selected assets and metadata',async()=>{
 const s=new FreegmaStore(':memory:',{seed:false}),f=createExportScope(s),server=createServer({store:s,access:()=>({origins:[],embedOrigins:[]})});
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const args={boardId:f.board.id,nodeId:'scope_card',name:'Selected card'},expected=s.export(args.boardId,args.nodeId,args.name);
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/api/boards/'+f.board.id+'/export?nodeId=scope_card&name=Selected%20card',{signal:AbortSignal.timeout(5000)});
  assert.equal(response.status,200);assert.deepEqual(await response.json(),expected);assert.deepEqual(callTool(s,'freegma_export_react',args),expected);
 }finally{await new Promise(r=>server.close(r));s.close();}
});
