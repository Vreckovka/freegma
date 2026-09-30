import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {FreegmaStore} from '../server/store.mjs';
import {makeNode} from '../shared/design.mjs';
import {workspacePath,boardPath} from '../server/files.mjs';
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
function content(store){const w=store.createWorkspace('Portable workspace'),asset=store.addAsset(w.id,{mime:'image/png',filename:'Reference.png',base64:png}),root=makeNode('frame',{id:'card',paddingLeft:24,cssOverrides:{'box-shadow':'0 1px 8px #000000'}}),image=makeNode('image',{id:'image',parentId:root.id,src:asset.src}),b=store.createBoard(w.id,'Portable board',{nodes:[root,image]});const c=store.saveComponent(b.id,b.revision,root.id,'Card');let board=store.mutate(b.id,c.board.revision,[{op:'update',id:root.id,patch:{gap:32}}]);board=store.meta(board.id,board.revision,{taskRef:'DASH-633'});return {w,asset,board,c};}
test('design files contain complete content; the index has only references and can be rebuilt',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-index-')),root=path.join(folder,'workspaces');let store,recovered;
  try{store=new FreegmaStore(path.join(folder,'index.sqlite'),{seed:false,storageRoot:root});const {w,asset,board,c}=content(store);
    assert.deepEqual(store.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r=>r.name),['file_refs','settings']);assert.deepEqual(store.db.prepare('PRAGMA table_info(file_refs)').all().map(c=>c.name),['kind','id','workspace_id','path']);
    const saved=JSON.parse(fs.readFileSync(path.join(root,boardPath(w.id,board.id)),'utf8')),manifest=JSON.parse(fs.readFileSync(path.join(root,workspacePath(w.id)),'utf8'));
    assert.deepEqual(saved.document,board.document);assert.equal(saved.taskRef,'DASH-633');assert.equal(saved.history.length,2);assert.equal(manifest.components.length,1);assert.equal(fs.readFileSync(path.join(root,w.id,manifest.assets[0].path)).toString('base64'),png);
    store.close();store=null;recovered=new FreegmaStore(path.join(folder,'rebuilt.sqlite'),{seed:false,storageRoot:root});assert.deepEqual(recovered.getBoard(board.id).document,board.document);assert.equal(recovered.getBoard(board.id).revision,board.revision);assert.equal(recovered.component(c.component.id).definition.nodes[0].paddingLeft,24);assert.equal(recovered.asset(asset.id).bytes.toString('base64'),png);assert.equal(recovered.travel(board.id,board.revision,'undo').document.nodes[0].gap,16);
  }finally{store?.close();recovered?.close();fs.rmSync(folder,{recursive:true,force:true});}
});
test('portable workspace and board packages preserve history, CSS and asset bytes across machines',()=>{
  const source=new FreegmaStore(':memory:',{seed:false}),target=new FreegmaStore(':memory:',{seed:false});
  try{const {w,asset,board,c}=content(source),portable=source.exportFree(w.id),imported=target.importFree(portable.package);assert.equal(imported.workspace.id,w.id);assert.equal(imported.boards[0].id,board.id);assert.deepEqual(imported.boards[0].document,board.document);assert.equal(target.asset(asset.id).bytes.toString('base64'),png);assert.equal(target.component(c.component.id).definition.nodes[0].cssOverrides['box-shadow'],'0 1px 8px #000000');
    const copy=target.importFree(portable.package);assert.notEqual(copy.workspace.id,w.id);assert.notEqual(copy.boards[0].id,board.id);assert.equal(target.getBoard(board.id).revision,board.revision);assert.notEqual(copy.boards[0].document.nodes.find(n=>n.src).src,asset.src);
    const own=target.createWorkspace('Another workspace'),one=target.importFree(source.exportFree(board.id,'board').package,own.id);assert.equal(one.boards[0].workspaceId,own.id);assert.equal(target.components(own.id).length,1);assert.equal(target.travel(one.boards[0].id,one.boards[0].revision,'undo').document.nodes[0].gap,16);
  }finally{source.close();target.close();}
});
test('invalid packages reject all writes, paths and missing dependencies without affecting existing work',()=>{
  const store=new FreegmaStore(':memory:',{seed:false});try{const {w}=content(store),bundle=store.exportFree(w.id).package,original=store.workspaces(),files=fs.readdirSync(store.files.root);
    for(const mutate of [p=>p.workspace.id='../outside',p=>p.workspace.assets[0].path='../../secret',p=>p.assets[0].base64='bad!',p=>p.assets=[],p=>p.boards[0].document.nodes[0].cssOverrides={background:'url(https://x)'},p=>p.boards[0].document.nodes[1].src='/assets/missing',p=>p.boards.push(p.boards[0])]){const p=structuredClone(bundle);mutate(p);assert.throws(()=>store.importFree(p));assert.deepEqual(store.workspaces(),original);assert.deepEqual(fs.readdirSync(store.files.root),files);}
  }finally{store.close();}
});
test('legacy SQLite migration backs up all payload, preserves revisions and Undo, then removes payload tables',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-migrate-')),dbFile=path.join(folder,'legacy.sqlite'),legacy=new DatabaseSync(dbFile);let store;
  const before={nodes:[makeNode('frame',{id:'card'})]},after={nodes:[makeNode('frame',{id:'card',paddingLeft:42})]};
  try{legacy.exec(`CREATE TABLE workspaces(id,name,created_at); CREATE TABLE boards(id,workspace_id,name,document,revision,cursor,task_ref,updated_at); CREATE TABLE history(board_id,seq,label,before_doc,after_doc,created_at); CREATE TABLE components(id,workspace_id,name,kind,definition,updated_at); CREATE TABLE assets(id,workspace_id,filename,mime,bytes,created_at);`);
    legacy.prepare('INSERT INTO workspaces VALUES(?,?,?)').run('workspace_test','Legacy','2026-09-30');legacy.prepare('INSERT INTO boards VALUES(?,?,?,?,?,?,?,?)').run('board_test','workspace_test','Legacy board',JSON.stringify(after),7,1,'DASH-1','2026-09-30');legacy.prepare('INSERT INTO history VALUES(?,?,?,?,?,?)').run('board_test',1,'Spacing',JSON.stringify(before),JSON.stringify(after),'2026-09-30');legacy.close();
    store=new FreegmaStore(dbFile,{seed:false});assert.ok(fs.existsSync(store.migrationBackup));assert.equal(store.getBoard('board_test').revision,7);assert.deepEqual(store.getBoard('board_test').document,after);assert.deepEqual(store.travel('board_test',7,'undo').document,before);assert.equal(store.db.prepare("SELECT name FROM sqlite_master WHERE name='boards'").get(),undefined);
    const backup=new DatabaseSync(store.migrationBackup);try{assert.equal(backup.prepare('SELECT document FROM boards').get().document,JSON.stringify(after));}finally{backup.close();}
  }finally{store?.close();try{legacy.close();}catch{}fs.rmSync(folder,{recursive:true,force:true});}
});
test('a failed multi-file publish rolls forward from its durable journal before another operation',()=>{
  const store=new FreegmaStore(':memory:',{seed:false});try{const {board}=content(store),atomic=store.files.atomic.bind(store.files);let writes=0;
    store.files.atomic=(file,bytes)=>{if(++writes===2)throw Error('Simulated interrupted write');return atomic(file,bytes);};assert.throws(()=>store.mutate(board.id,board.revision,[{op:'update',id:'card',patch:{paddingTop:77}}]),/interrupted/);store.files.atomic=atomic;
    const recovered=store.getBoard(board.id);assert.equal(recovered.revision,board.revision+1);assert.equal(recovered.document.nodes[0].paddingTop,77);assert.equal(fs.existsSync(path.join(store.files.root,'.transaction.json')),false);assert.deepEqual(store.travel(board.id,recovered.revision,'undo').document,board.document);
  }finally{store.close();}
});


test('workspace folders persist, reject cycles, keep stable paths and export a portable hierarchy',()=>{
  const source=new FreegmaStore(':memory:',{seed:false}),target=new FreegmaStore(':memory:',{seed:false});try{
    const parent=source.createWorkspace('Freegma'),light=source.createWorkspace('Light Mode',parent.id),dark=source.createWorkspace('Dark Mode',parent.id),board=source.createBoard(light.id,'Editor');
    assert.equal(source.workspace(light.id).parentId,parent.id);assert.equal(source.boards(light.id)[0].filePath,board.filePath);
    assert.throws(()=>source.setWorkspaceParent(parent.id,light.id),/cycle/);assert.equal(source.workspace(parent.id).parentId,null);
    assert.throws(()=>source.createWorkspace('Invalid','workspace_missing'),/not found/);
    source.setWorkspaceParent(dark.id,light.id);assert.equal(source.workspace(dark.id).parentId,light.id);source.setWorkspaceParent(dark.id,parent.id);
    const bundle=source.exportFree(parent.id).package;assert.equal(bundle.children.length,2);
    const imported=target.importFree(bundle);assert.equal(imported.children.length,2);assert.equal(target.workspace(light.id).parentId,parent.id);assert.equal(target.getBoard(board.id).name,'Editor');
    const duplicate=target.importFree(bundle);assert.notEqual(duplicate.workspace.id,parent.id);assert.equal(duplicate.children[0].workspace.parentId,duplicate.workspace.id);assert.equal(target.workspace(light.id).parentId,parent.id);
    const onlyChild=target.importFree(source.exportFree(light.id).package);assert.equal(onlyChild.workspace.parentId,null);
    const malformed=structuredClone(bundle);malformed.children[0].boards[0].document.nodes=[{type:'evil'}];const before=target.workspaces();assert.throws(()=>target.importFree(malformed));assert.deepEqual(target.workspaces(),before);
  }finally{source.close();target.close();}
});
