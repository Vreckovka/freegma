import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePanels,readPanels,savePanels,panelLayout,resizeLimit,PANEL_KEY} from '../client/panels.mjs';
test('preferences clamp corrupt widths and survive unavailable storage',()=>{
  assert.deepEqual(normalizePanels({left:{width:-10},right:{width:10000,collapsed:true}}),{left:{width:200,collapsed:false},right:{width:640,collapsed:true}});
  assert.deepEqual(readPanels({getItem(){throw Error();}}),normalizePanels());
  assert.doesNotThrow(()=>savePanels({}, {setItem(){throw Error();}}));
});
test('collapse preserves a custom width across storage round trips',()=>{
  let data;const storage={setItem(key,value){assert.equal(key,PANEL_KEY);data=value;},getItem(){return data;}};
  savePanels({left:{width:340,collapsed:true},right:{width:410}},storage);
  const saved=readPanels(storage);assert.equal(panelLayout(saved,1280).left,40);saved.left.collapsed=false;
  assert.deepEqual(panelLayout(saved,1280),{left:340,right:410});
});
test('responsive fitting preserves canvas and does not overwrite saved widths',()=>{
  const saved=normalizePanels({left:{width:460},right:{width:620}});
  for(const width of [320,500,640,800,1280]){const layout=panelLayout(saved,width);assert.ok(layout.left+layout.right<=width-180);assert.ok(layout.left===40||layout.left>=200);assert.ok(layout.right===40||layout.right>=248);}
  assert.deepEqual(panelLayout(saved,1600),{left:460,right:620});
});
test('drag limits account for opposite panel and canvas',()=>{
  assert.equal(resizeLimit('left',{left:230,right:274},900),446);
  assert.equal(resizeLimit('right',{left:300,right:274},900),420);
});
