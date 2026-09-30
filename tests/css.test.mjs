import test from 'node:test';
import assert from 'node:assert/strict';
import {makeNode,layerStyle,applyOperations} from '../shared/design.mjs';
import {FreegmaStore} from '../server/store.mjs';
import {callTool} from '../server/tools.mjs';
import {createRequire} from 'node:module';
const dependencies=async()=>({require:createRequire(import.meta.url)});

function fixture(){const store=new FreegmaStore(':memory:',{seed:false}),w=store.createWorkspace('CSS tests'),node=makeNode('frame',{id:'card',x:100,y:100,layout:'vertical',paddingTop:14,paddingRight:16,paddingBottom:14,paddingLeft:16}),text=makeNode('text',{id:'title',parentId:node.id,text:'A title'}),b=store.createBoard(w.id,'CSS board',{nodes:[node,text]});return {store,w,b};}
test('CSS round trip maps native padding, color, type and geometry; extra CSS survives export and Undo',async()=>{
  const {store,b}=fixture();try{
    const exported=store.export(b.id,'card');
    assert.match(exported.jsxCode,/className="fg-card"/);assert.doesNotMatch(exported.jsxCode,/data-freegma-id="card" style=/);
    const css=exported.css.replace('padding: 14px 16px 14px 16px','padding: 24px 30px').replace('background: #ffffff','background: #123456').replace('font-size: 16px','font-size: 20px').replace('left: 0px','left: 8px').replace('width: 240px','width: 50%').replace('  box-sizing: border-box;','  box-sizing: border-box;\n  box-shadow: 0 3px 16px rgba(0,0,0,0.2);\n  background-image: linear-gradient(45deg, #123456, #789abc);');
    let changed=callTool(store,'freegma_apply_css',{boardId:b.id,expectedRevision:b.revision,css,nodeId:'card'}),n=changed.document.nodes[0];
    assert.equal(n.x,108);assert.equal(n.paddingLeft,30);assert.equal(n.paddingBottom,24);assert.equal(n.fill,'#123456');assert.equal(n.fontSize,20);assert.equal(n.cssOverrides.width,'50%');assert.equal(layerStyle(n).width,'50%');assert.match(layerStyle(n).boxShadow,/16px/);
    const next=store.export(b.id,'card');assert.match(next.css,/width: 50%/);assert.match(next.css,/padding: 24px 30px 24px 30px/);assert.match(next.jsxCode,/import "\.\/Frame.css"/);
    const {require}=await dependencies();require('esbuild').transformSync(next.jsxCode,{loader:'jsx'});
    assert.equal(store.applyCss(b.id,changed.revision,next.css,'card').revision,changed.revision);
    changed=store.travel(b.id,changed.revision,'undo');assert.deepEqual(changed.document,b.document);
    changed=store.travel(b.id,changed.revision,'redo');assert.equal(changed.document.nodes[0].cssOverrides.width,'50%');
    const native=store.mutate(b.id,changed.revision,[{op:'update',id:'card',patch:{width:400,fill:'#abcdef'}}]);assert.equal(layerStyle(native.document.nodes[0]).width,400);assert.equal(layerStyle(native.document.nodes[0]).backgroundImage,undefined);assert.match(layerStyle(native.document.nodes[0]).boxShadow,/16px/);
  }finally{store.close();}
});
test('CSS errors are atomic, isolated to export scope and preserve revision conflicts',()=>{
  const {store,b}=fixture();try{
    const css=store.export(b.id,'title').css;
    for(const invalid of [css+'body { color: red; }',css+'@import "x";',css.replace('color: #172033','color: url(https://example.com)'),css.replace('font-size: 24px','font-size: -2px'),css+'\n.fg-card { opacity: 0; }',css.replace('box-sizing: border-box','not-real-css: yes')])assert.throws(()=>store.applyCss(b.id,b.revision,invalid,'title'));
    assert.deepEqual(store.getBoard(b.id),b);assert.equal(store.history(b.id).length,0);
    const changed=store.mutate(b.id,b.revision,[{op:'update',id:'title',patch:{text:'New title'}}]);assert.throws(()=>store.applyCss(b.id,b.revision,css,'title'),e=>e.status===409);assert.equal(store.getBoard(b.id).revision,changed.revision);
    assert.throws(()=>applyOperations(b.document,[{op:'update',id:'title',patch:{cssOverrides:{background:'url(x)'}}}]));
  }finally{store.close();}
});
test('CSS declaration removal resets style; comments and semicolons inside strings parse safely',()=>{
  const {store,b}=fixture();try{
    let css=store.export(b.id,'title').css.replace('  color: #172033;\n','').replace('font-family: Inter, system-ui, sans-serif','font-family: "Font; name", sans-serif');
    let saved=store.applyCss(b.id,b.revision,css,'title');assert.equal(layerStyle(saved.document.nodes[1]).color,'initial');assert.equal(saved.document.nodes[1].fontFamily,'"Font; name", sans-serif');
    const unchanged=store.applyCss(b.id,saved.revision,'/* no selected layers */','title');assert.equal(unchanged.revision,saved.revision);
  }finally{store.close();}
});
test('CSS edits remain local instance overrides when a component master is republished',()=>{
  const {store,b}=fixture();try{
    const saved=store.saveComponent(b.id,b.revision,'card','Card'),c=saved.component;
    const inserted=store.insertComponent(b.id,saved.board.revision,c.id),instance=inserted.nodeId;
    let css=store.export(b.id,instance).css.replace('padding: 14px 16px 14px 16px','padding: 28px').replace('  border-radius: 0px;','  border-radius: 0px;\n  box-shadow: 0 1px 8px #000000;');
    const unlocked=store.mutate(b.id,inserted.board.revision,['paddingTop','paddingRight','paddingBottom','paddingLeft','cssOverrides.box-shadow'].map(property=>({op:'override',id:instance,property,enabled:true})));
    let edited=store.applyCss(b.id,unlocked.revision,css,instance);
    edited=store.mutate(b.id,edited.revision,[{op:'update',id:'card',patch:{paddingTop:5,paddingLeft:5,fill:'#aabbcc'}}]);
    const updated=store.saveComponent(b.id,edited.revision,'card','Card','component',c.id).board;
    const n=updated.document.nodes.find(n=>n.id===instance);assert.equal(n.paddingTop,28);assert.equal(n.paddingLeft,28);assert.equal(n.fill,'#aabbcc');assert.match(layerStyle(n).boxShadow,/8px/);
  }finally{store.close();}
});
