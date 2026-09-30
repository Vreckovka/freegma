import test from 'node:test';
import assert from 'node:assert/strict';
import {makeNode,validateDocument,layerStyle,generateReact,applyOperations} from '../shared/design.mjs';
test('independent sizing preserves fixed width and content height with wrapping',()=>{
 const parent=makeNode('frame',{layout:'vertical'}),card=makeNode('frame',{parentId:parent.id,layout:'horizontal',width:400,height:180,widthSizing:'fixed',heightSizing:'hug',wrap:true});
 const style=layerStyle(card,parent);assert.equal(style.width,400);assert.equal(style.height,'max-content');assert.equal(style.flexWrap,'wrap');
 const fill=layerStyle({...card,widthSizing:'fill'},parent);assert.equal(fill.width,'100%');assert.equal(fill.flex,'0 0 auto');
 const row=layerStyle({...card,widthSizing:'fill'}, {...parent,layout:'horizontal'});assert.equal(row.width,undefined);assert.equal(row.flex,'1 1 0');
 const old=layerStyle(makeNode('frame',{layout:'vertical',sizing:'hug'}),parent);assert.equal(old.width,'max-content');assert.equal(old.height,'max-content');
 assert.throws(()=>validateDocument({nodes:[{...card,parentId:null,heightSizing:'auto'}]}),/axis sizing/);
 const overlay=layerStyle(makeNode('text',{parentId:parent.id,absolute:true,x:18,y:24,letterSpacing:-.8}),parent);assert.equal(overlay.position,'absolute');assert.equal(overlay.left,18);assert.equal(overlay.letterSpacing,-.8);
 assert.throws(()=>validateDocument({nodes:[makeNode('text',{letterSpacing:Infinity})]}),/letterSpacing/);
});
test('native vectors roundtrip, export safely and reject executable or malformed geometry',()=>{
 const v=makeNode('vector',{name:'Trend "quoted"',fill:'transparent',viewBox:[0,0,400,180],paths:[{d:'M0 180 L100 60 C200 10 300 90 400 0',fill:'none',stroke:'#2d86ff',strokeWidth:2,opacity:1}]});
 validateDocument({nodes:[v]});const export0=generateReact({nodes:[v]});assert.match(export0.code,/viewBox=\{"0 0 400 180"\}/);assert.match(export0.code,/strokeWidth=\{2\}/);
 const changed=applyOperations({nodes:[v]},[{op:'update',id:v.id,patch:{paths:[{...v.paths[0],stroke:'#35ce98'}]}}]);assert.match(generateReact(changed).code,/#35ce98/);
 for(const patch of [{viewBox:[0,0,0,180]},{paths:[{...v.paths[0],d:'M0 0<script>alert(1)</script>'}]},{paths:[{...v.paths[0],stroke:'url(https://bad.invalid)'}]},{paths:[{...v.paths[0],onload:'alert(1)'}]}])assert.throws(()=>applyOperations({nodes:[v]},[{op:'update',id:v.id,patch}]),/vector/);
 assert.deepEqual(v.paths[0].stroke,'#2d86ff');
});
