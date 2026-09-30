import test from 'node:test';
import assert from 'node:assert/strict';
import {FreegmaStore} from '../server/store.mjs';
import {resolveDocument} from '../shared/colors.mjs';
import {makeNode} from '../shared/design.mjs';
import {createServer} from '../server/http.mjs';
import {callTool} from '../server/tools.mjs';

test('template uses one shared library, complete Light/Dark roles and optional empty theme folders',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const {workspace,board,children}=s.createProject('My product','light-dark');
  assert.equal(children.length,2);assert.equal(s.boards(workspace.id).length,3);
  assert.equal(s.manifest(workspace.id).components.length,2);
  for(const child of children){assert.equal(s.manifest(child.id).components.length,0);assert.equal(s.boards(child.id).length,0);assert.equal(s.colors(child.id).ownerId,workspace.id);assert.equal(s.components(child.id).filter(c=>c.inherited).length,2);}
  const before=s.getBoard(board.id).document;
  const dark=resolveDocument(before,s.colors(workspace.id));
  s.updateColors(workspace.id,s.colors(workspace.id).revision,{op:'setTheme',themeId:'theme_light'});
  const light=resolveDocument(s.getBoard(board.id).document,s.colors(workspace.id));
  assert.equal(dark.nodes.find(n=>n.id==='example').fill,'#101219');assert.equal(light.nodes.find(n=>n.id==='example').fill,'#f3f3f7');
  assert.equal(light.nodes.find(n=>n.id==='local_color').fill,'#ec719f');assert.deepEqual(s.getBoard(board.id).document,before);
  assert.equal(s.colors(children[1].id).themeId,'theme_dark');
  const empty=s.createProject('Blank','empty');assert.equal(empty.board.document.nodes.length,0);assert.equal(empty.children.length,0);assert.equal(s.components(empty.workspace.id).length,0);
  const count=s.workspaces().length;assert.throws(()=>s.createProject('Bad','invalid'));assert.equal(s.workspaces().length,count);
 }finally{s.close();}
});

test('ancestor component edits propagate into children with overrides; siblings and other projects stay isolated',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const p=s.createProject('Shared','light-dark'),button=s.components(p.workspace.id).find(c=>c.name==='Button');
  let child=s.createBoard(p.children[0].id,'Theme extras');const result=s.insertComponent(child.id,child.revision,button.id);child=result.board;
  const label=child.document.nodes.find(n=>n.text==='Create something');
  child=s.mutate(child.id,child.revision,[{op:'update',id:label.id,patch:{text:'My local label'}}]);
  let master=s.boards(p.workspace.id).find(b=>b.name==='Shared components');master=s.getBoard(master.id);
  master=s.mutate(master.id,master.revision,[{op:'update',id:'shared_button',patch:{radius:20}}]);
  s.saveComponent(master.id,master.revision,'shared_button','Button','component',button.id);
  const updated=s.getBoard(child.id);assert.equal(updated.document.nodes.find(n=>n.componentId===button.id).radius,20);assert.equal(updated.document.nodes.find(n=>n.id===label.id).text,'My local label');
  assert.throws(()=>s.saveComponent(updated.id,updated.revision,result.nodeId,'Button','component',button.id),/owning project/);
  const local=s.saveComponent(updated.id,updated.revision,result.nodeId,'Light-only button').component;
  assert.ok(s.components(p.children[0].id).some(c=>c.id===local.id));assert.ok(!s.components(p.children[1].id).some(c=>c.id===local.id));
  const other=s.createProject('Other');assert.throws(()=>s.insertComponent(other.board.id,other.board.revision,button.id),/another workspace/);
 }finally{s.close();}
});

test('parent export/import keeps one inherited library through ID collisions; child export is self-contained',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const p=s.createProject('Portable','light-dark'),button=s.components(p.workspace.id).find(c=>c.name==='Button');
  let b=s.createBoard(p.children[0].id,'Child view');b=s.insertComponent(b.id,b.revision,button.id).board;
  const pkg=s.exportFree(p.workspace.id,'workspace').package;
  assert.equal(pkg.children[0].workspace.components.length,0);
  const imported=s.importFree(pkg);const rootId=imported.workspace.id,childId=imported.children[0].workspace.id;
  assert.notEqual(rootId,p.workspace.id);assert.equal(s.manifest(childId).components.length,0);
  const newButton=s.components(rootId).find(c=>c.name==='Button');assert.notEqual(newButton.id,button.id);
  assert.ok(s.getBoard(imported.children[0].boards[0].id).document.nodes.some(n=>n.componentId===newButton.id));
  const isolated=new FreegmaStore(':memory:',{seed:false});try{const copied=isolated.importFree(s.exportFree(b.id,'board').package);assert.equal(isolated.components(copied.workspace.id).length,2);assert.equal(copied.boards[0].palette.themeId,'theme_light');assert.ok(isolated.export(copied.boards[0].id).jsxCode);}finally{isolated.close();}
 }finally{s.close();}
});

test('inherited image components remain portable and an interrupted project creation rolls back',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const w=s.createWorkspace('Images'),child=s.createWorkspace('Child',w.id);
  const image=s.addAsset(w.id,{mime:'image/png',base64:Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64')});
  const master=s.createBoard(w.id,'Image master',{nodes:[makeNode('image',{id:'photo',src:image.src})]}),component=s.saveComponent(master.id,master.revision,'photo','Photo').component;
  const b=s.createBoard(child.id,'Image child');s.insertComponent(b.id,b.revision,component.id);
  const imported=s.importFree(s.exportFree(w.id,'workspace').package);assert.ok(s.getBoard(imported.children[0].boards[0].id).document.nodes[0].src.startsWith('/assets/'));
  const count=s.workspaces().length,original=s.saveComponent;s.saveComponent=()=>{throw Error('Injected failure');};assert.throws(()=>s.createProject('Interrupted','light-dark'),/Injected/);s.saveComponent=original;assert.equal(s.workspaces().length,count);
 }finally{s.close();}
});

test('HTTP and MCP project creation use the same atomic template and reject invalid choices',async()=>{
 const s=new FreegmaStore(':memory:',{seed:false}),server=createServer({store:s});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 try{const response=await fetch(url+'/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'HTTP template',template:'light-dark'})});assert.equal(response.status,201);assert.equal((await response.json()).children.length,2);
  assert.equal(callTool(s,'freegma_create_project',{name:'MCP blank',template:'empty'}).board.document.nodes.length,0);
  assert.equal((await fetch(url+'/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Bad',template:'wrong'})})).status,400);
 }finally{await new Promise(r=>server.close(r));s.close();}
});
