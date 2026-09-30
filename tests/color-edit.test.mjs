import test from 'node:test';
import assert from 'node:assert/strict';
import {createColorEdit,previewPalette,previewDocument,literalColorPatch,rgbToHex,rgbToHsv,hsvToHex} from '../client/color-edit.mjs';
import {newColorSystem,resolveDocument,themeColors} from '../shared/colors.mjs';
import {makeNode,applyOperations} from '../shared/design.mjs';

test('drag previews never save; simultaneous close/navigation flushes share one atomic save',async()=>{
 let release,calls=0,closed=0;const values=[];
 const edit=createColorEdit({target:{kind:'palette'},value:'#000000',publish:()=>{},close:()=>closed++,commit:value=>{calls++;values.push(value);return new Promise(resolve=>release=resolve);}});
 for(let i=0;i<100;i++)edit.preview(rgbToHex([i,30,40]));assert.equal(calls,0);
 const close=edit.flush(),navigation=edit.flush();assert.equal(close,navigation);
 assert.equal(edit.preview('#ffffff'),false);assert.equal(edit.cancel(),false);
 await Promise.resolve();assert.equal(calls,1);assert.deepEqual(values,['#631e28']);release('saved');
 assert.equal(await navigation,'saved');assert.equal(closed,1);
});
test('cancel and unchanged sessions do not commit; invalid and failed saves retain editable draft',async()=>{
 let calls=0,closed=0;const setup=()=>createColorEdit({target:{},value:'#000000',publish:()=>{},close:()=>closed++,commit:async()=>{calls++;throw Error('conflict');}});
 const cancelled=setup();cancelled.preview('#112233');cancelled.cancel();assert.equal(calls,0);
 const unchanged=setup();await unchanged.flush();assert.equal(calls,0);assert.equal(closed,2);
 const failed=setup();failed.preview('bad',false);await assert.rejects(failed.flush(),/valid color/);assert.equal(calls,0);
 failed.preview('#abcdef');await assert.rejects(failed.flush(),/conflict/);assert.equal(calls,1);assert.equal(failed.phase,'editing');assert.equal(failed.value,'#abcdef');assert.equal(closed,2);
 await Promise.resolve();assert.equal(calls,1);failed.cancel();assert.equal(closed,3);
});
test('palette preview preserves saved data, other theme and unaffected visible layer references',()=>{
 const palette={...newColorSystem(),ownerId:'project',workspaceId:'w',themeId:'theme_default'};
 palette.themes.push({id:'other',colors:{...themeColors(palette)}});
 const original={nodes:[makeNode('frame',{fill:'#101219',colorBindings:[{path:'fill',token:'background',source:'#101219'}]}),makeNode('rectangle',{fill:'#334455'})]},resolved=resolveDocument(original,palette),snapshot=JSON.stringify({palette,original});
 const edit={target:{kind:'palette',ownerId:'project',themeId:'theme_default',key:'background'},value:'#dd9900'};
 const preview=previewPalette(palette,edit),document=previewDocument(resolved,original,preview,edit);
 assert.equal(document.nodes[0].fill,'#dd9900');assert.equal(document.nodes[1],resolved.nodes[1]);assert.equal(preview.themes[1],palette.themes[1]);assert.equal(JSON.stringify({palette,original}),snapshot);
 assert.equal(previewPalette(palette,{...edit,target:{...edit.target,ownerId:'unrelated'}}),palette);
});
test('literal vector preview matches accepted operations and detaches only its binding even at raw source value',()=>{
 const palette={...newColorSystem(),themeId:'theme_default'},node=makeNode('vector',{viewBox:[0,0,10,10],paths:[{d:'M0 0 L10 10',fill:'#101219',stroke:'#e8eaf3',strokeWidth:1,opacity:1}],colorBindings:[{path:'paths.0.fill',token:'background',source:'#101219'},{path:'paths.0.stroke',token:'text',source:'#e8eaf3'}]});
 palette.themes[0].colors.background='#445566';const other=makeNode('rectangle'),original={nodes:[node,other]},resolved=resolveDocument(original,palette),edit={target:{kind:'literal',nodeId:node.id,path:'paths.0.fill'},value:'#101219'},patch=literalColorPatch(node,edit.target.path,edit.value);
 const preview=previewDocument(resolved,original,palette,edit),accepted=resolveDocument(applyOperations(original,[{op:'update',id:node.id,patch}]),palette);
 assert.deepEqual(preview.nodes[0],accepted.nodes[0]);assert.equal(preview.nodes[1],resolved.nodes[1]);assert.equal(preview.nodes[0].fill,accepted.nodes[0].fill);assert.equal(preview.nodes[0].paths[0].fill,'#101219');assert.equal(preview.nodes[0].colorBindings.length,1);assert.equal(node.colorBindings.length,2);
});
test('color conversions round-trip representative hues and neutral colors',()=>{
 for(const rgb of [[255,0,0],[0,255,0],[0,0,255],[0,0,0],[255,255,255],[12,83,191]])assert.equal(hsvToHex(rgbToHsv(rgb)),rgbToHex(rgb));
});
