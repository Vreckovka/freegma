import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {FreegmaStore} from '../server/store.mjs';
import {sourceRoot,buildRoot} from '../server/paths.mjs';
import {embedOrigins} from '../server/http.mjs';
import {VERSION} from '../shared/design.mjs';

test('standalone paths and release version belong to this repository',()=>{
 assert.equal(sourceRoot,path.resolve(import.meta.dirname,'..'));
 assert.equal(buildRoot,path.join(sourceRoot,'dist'));
 assert.equal(JSON.parse(fs.readFileSync(path.join(sourceRoot,'package.json'),'utf8')).version,VERSION);
});

test('embedding accepts explicit generic origins and rejects paths or unsafe protocols',()=>{
 assert.deepEqual(embedOrigins('https://design.example,http://localhost:9000'),['https://design.example','http://localhost:9000']);
 assert.deepEqual(embedOrigins(''),[]);
 for(const value of ['https://design.example/path','javascript:alert(1)','https://design.example;script-src *'])assert.throws(()=>embedOrigins(value));
});

test('portable example imports all studio boards and libraries without external task identities',()=>{
 const example=JSON.parse(fs.readFileSync(path.join(sourceRoot,'examples/Freegma-Studio.free'),'utf8'));
 assert.doesNotMatch(JSON.stringify(example),/VAgent|super-admin-|DASH-\d+/);
 const store=new FreegmaStore(':memory:',{seed:false});
 try{
  const imported=store.importFree(example),workspaces=store.workspaces();
  assert.equal(workspaces.length,3);
  assert.equal(imported.boards.length,1); // Parent owns the palette and real shared control masters.
  const children=workspaces.filter(w=>w.parentId===imported.workspace.id);
  assert.deepEqual(children.map(w=>w.name).sort(),['Dark Mode','Light Mode']);
  assert.equal(children.reduce((count,w)=>count+store.boards(w.id).length,0),22);
  for(const child of children){assert.equal(store.boards(child.id).length,11);assert.ok(store.components(child.id).some(c=>c.inherited));assert.ok(store.getBoard(store.boards(child.id)[0].id).document.nodes.some(n=>n.componentId));assert.equal(store.colors(child.id).ownerId,imported.workspace.id);}
 }finally{store.close();}
});
