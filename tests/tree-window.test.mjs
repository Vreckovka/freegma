import test from 'node:test';
import assert from 'node:assert/strict';
import {treeWindow,revealTreeRow,TREE_ROW_HEIGHT,treeTabStop} from '../client/tree-window.mjs';
import {visibleLayers,treeNavigation} from '../client/editor.mjs';

test('a large tree mounts only the visible scroll window, including partially visible rows',()=>{
  const first=treeWindow(2480,0,620);assert.equal(first.totalHeight,76880);assert.equal(first.indices.length,26);
  const middle=treeWindow(2480,31000,621);assert.equal(middle.indices[0],994);assert.equal(middle.indices.at(-1),1026);
  assert.ok(treeWindow(2480,Infinity,620).indices.length<=32);
  assert.deepEqual(treeWindow(0,0,450),{indices:[],totalHeight:0});
});
test('scrolling retains a focused row without mounting the gap or duplicating it',()=>{
  const w=treeWindow(2480,31000,620,{focusedIndex:2});assert.equal(w.indices[0],2);assert.equal(w.indices.length,33);
  assert.equal(treeWindow(2480,31000,620,{focusedIndex:1002}).indices.length,32);
});
test('keyboard End reveals the last layer; collapse and search clamp stale scroll offsets',()=>{
  const nodes=Array.from({length:2480},(_,i)=>({id:'n'+i,parentId:null,name:'Layer '+i})),rows=visibleLayers(nodes);
  const last=treeNavigation(rows,'n0','End',new Set());assert.equal(last.id,'n2479');
  const top=revealTreeRow(2479,0,620);assert.ok(treeWindow(rows.length,top,620).indices.includes(2479));
  assert.equal(revealTreeRow(0,top,620),0);
  assert.deepEqual(treeWindow(1,top,620).indices,[0]);
  assert.equal(revealTreeRow(20,620,620),620);
  assert.equal(TREE_ROW_HEIGHT,31);
});
test('search includes matching descendants and shared ancestors while retaining hierarchy order',()=>{
  const nodes=[{id:'a',parentId:null,name:'Root'},{id:'b',parentId:'a',name:'Label'},{id:'c',parentId:'a',name:'Label 2'},{id:'d',parentId:'b',name:'Nested label'}];
  assert.deepEqual(visibleLayers(nodes,new Set(['a','b']),'label').map(r=>r.node.id),['a','b','d','c']);
});
test('filtering away a selection leaves the first matching row keyboard reachable',()=>{
  const index=new Map([['visible',0],['next',1]]);
  assert.equal(treeTabStop(index,'hidden'),'visible');
  assert.equal(treeTabStop(index,'next'),'next');
  assert.equal(treeTabStop(new Map(),'next'),undefined);
});
