import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FreegmaStore} from '../server/store.mjs';
import {makeNode} from '../shared/design.mjs';
import {indexCanvas,visibleCanvasRoots} from '../client/canvas-window.mjs';
test('warm navigation lists use small summaries even after document cache eviction; external writes invalidate them',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{
  const a=s.createWorkspace('A'),b=s.createWorkspace('B'),first=s.createBoard(a.id,'First',{nodes:[makeNode('frame',{id:'root'})]}),other=s.createBoard(b.id,'Other');
  s.workspaces();s.boards(a.id);s.boards(b.id);s.files.cache.clear();s.files.cacheBytes=0;
  const original=s.files.json.bind(s.files);let reads=[];s.files.json=file=>{reads.push(file);return original(file);};
  const catalog=s.workspaces(),list=s.boards(a.id);assert.deepEqual(reads,[]);assert.equal(list[0].name,'First');assert.ok(!('document' in list[0]));assert.ok(!('components' in catalog[0]));
  const file=first.filePath,saved=JSON.parse(fs.readFileSync(file,'utf8'));saved.name='External rename';saved.revision++;
  fs.writeFileSync(file,JSON.stringify(saved));assert.equal(s.boards(a.id)[0].name,'External rename');assert.ok(reads.every(path=>!path.includes(other.id)));
  const status=s.boardStatus(first.id);assert.equal(status.revision,2);assert.ok(!('document' in status));assert.ok(!('comments' in status));assert.ok(JSON.stringify(status).length<300);
 }finally{s.close();}
});
test('canvas mounts only visible roots, includes overflowing children and pins active edits',()=>{
 const nodes=[makeNode('frame',{id:'near',x:0,y:0,width:300,height:200}),makeNode('frame',{id:'far',x:10000,y:10000}),makeNode('text',{id:'far-title',parentId:'far'}),makeNode('frame',{id:'overflow',x:2000,y:0}),makeNode('rectangle',{id:'overflow-child',parentId:'overflow',x:-2000,y:0})];
 const index=indexCanvas(nodes),viewport={x:0,y:0,zoom:1},size={width:600,height:500};
 assert.deepEqual(visibleCanvasRoots(index,viewport,size).map(n=>n.id),['near','overflow']);
 assert.deepEqual(visibleCanvasRoots(index,viewport,size,['far-title']).map(n=>n.id),['near','far','overflow']);
 assert.deepEqual(visibleCanvasRoots(index,{x:-10000,y:-10000,zoom:1},size).map(n=>n.id),['far']);
 assert.equal(nodes.length,5);assert.equal(index.children.get('far')[0].id,'far-title');
});
test('clipped content cannot enlarge canvas bounds; dynamic unbounded CSS stays mounted',()=>{
 const nodes=[makeNode('frame',{id:'clip',x:5000,y:0,clip:true}),makeNode('text',{id:'child',parentId:'clip',x:-5000}),makeNode('frame',{id:'dynamic',x:9000,y:0,cssOverrides:{transform:'translateX(-9000px)'}})];
 assert.deepEqual(visibleCanvasRoots(indexCanvas(nodes),{x:0,y:0,zoom:1},{width:600,height:500}).map(n=>n.id),['dynamic']);
});
