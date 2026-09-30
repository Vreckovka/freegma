import test from 'node:test';
import assert from 'node:assert/strict';
import {FreegmaStore} from '../server/store.mjs';
import {makeNode,applyOperations} from '../shared/design.mjs';
import {resolveDocument,bindingPatch,themeColors} from '../shared/colors.mjs';
import {studioDocument} from '../shared/studio-designs.mjs';
import {createServer} from '../server/http.mjs';
import {callTool} from '../server/tools.mjs';
const edit=(s,w,op)=>s.updateColors(w,s.colors(w).revision,op);
test('parent palettes update descendants while workspace themes remain independent; conflicts are atomic',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const root=s.createWorkspace('Project'),a=s.createWorkspace('Light',root.id),b=s.createWorkspace('Dark',root.id);
 const n=makeNode('frame',{fill:'#101219',colorBindings:[{path:'fill',token:'background',source:'#101219'}]}),board=s.createBoard(a.id,'Bound',{nodes:[n]});
 edit(s,a.id,{op:'createTheme',name:'Alternative'});const p=s.colors(a.id),theme=p.themes.at(-1).id;edit(s,a.id,{op:'setTheme',themeId:theme});edit(s,a.id,{op:'setColor',key:'background',value:'#ffeeaa'});
 assert.equal(resolveDocument(s.getBoard(board.id).document,s.colors(a.id)).nodes[0].fill,'#ffeeaa');assert.equal(themeColors(s.colors(b.id)).background,'#101219');assert.equal(s.colors(b.id).ownerId,root.id);
 const before=s.colors(a.id);assert.throws(()=>s.updateColors(a.id,before.revision-1,{op:'setColor',key:'text',value:'#fff'}),e=>e.status===409);assert.deepEqual(s.colors(a.id),before);
 edit(s,a.id,{op:'addColor',key:'success',name:'Success',value:'rgba(20, 180, 80, .4)'});assert.ok(s.colors(b.id).themes.every(t=>t.colors.success==='rgba(20, 180, 80, .4)'));
 assert.throws(()=>edit(s,a.id,{op:'setColor',key:'success',value:'url(https://evil.invalid)'}));
 }finally{s.close();}
});
test('role removal detaches current colors, histories and components without changing appearance',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const w=s.createWorkspace('Project'),n=makeNode('frame',{fill:'#101219',colorBindings:[{path:'fill',token:'background',source:'#101219'}]});let b=s.createBoard(w.id,'Board',{nodes:[n]});
 b=s.mutate(b.id,b.revision,[{op:'update',id:n.id,patch:{x:77}}]);const saved=s.saveComponent(b.id,b.revision,n.id,'Bound card');edit(s,w.id,{op:'setColor',key:'background',value:'#123456'});edit(s,w.id,{op:'removeColor',key:'background'});
 b=s.getBoard(b.id);assert.equal(b.document.nodes[0].fill,'#123456');assert.deepEqual(b.document.nodes[0].colorBindings,[]);assert.equal(s.component(saved.component.id).definition.nodes[0].fill,'#123456');
 b=s.travel(b.id,b.revision,'undo');assert.equal(b.document.nodes[0].fill,'#123456');assert.ok(!s.colors(w.id).schematic.some(r=>r.key==='background'));
 }finally{s.close();}
});
test('literal overrides detach bindings; spacing changes preserve native and gradient bindings',()=>{
 const n=makeNode('frame',{fill:'#101219',cssOverrides:{'background-image':'linear-gradient(#112233, #445566)'},colorBindings:[{path:'fill',token:'background',source:'#101219'},{path:'cssOverrides.background-image',token:'accent',source:'#112233'}]});
 let doc=applyOperations({nodes:[n]},[{op:'update',id:n.id,patch:{paddingLeft:12}}]);assert.equal(doc.nodes[0].colorBindings.length,2);
 doc=applyOperations(doc,[{op:'update',id:n.id,patch:{fill:'#ffffff'}}]);assert.equal(doc.nodes[0].colorBindings.length,0);
 assert.throws(()=>applyOperations({nodes:[n]},[{op:'update',id:n.id,patch:{colorBindings:[{path:'__proto__.fill',token:'background',source:'#fff'}]}}]));
 assert.equal(bindingPatch(n,'fill','text').colorBindings.at(-1).token,'text');
});
test('studio migration preserves complete light/dark documents and packages their inherited themes',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const root=s.createWorkspace('Freegma'),light=s.createWorkspace('Light Mode',root.id),dark=s.createWorkspace('Dark Mode',root.id),original=studioDocument('light'),darkDoc=studioDocument('dark');
 const l=s.createBoard(light.id,'Editor',original),d=s.createBoard(dark.id,'Editor',darkDoc);const report=s.migrateColors();assert.equal(report.migrated.length,1);
 const clean=doc=>({...doc,nodes:doc.nodes.map(({colorBindings,...n})=>n)});
 assert.deepEqual(clean(resolveDocument(s.getBoard(l.id).document,s.colors(light.id))),original);assert.deepEqual(clean(resolveDocument(s.getBoard(d.id).document,s.colors(dark.id))),darkDoc);assert.deepEqual(s.migrateColors().migrated,[]);
 const portable=s.exportFree(root.id).package;assert.equal(portable.workspace.colorSystem.themes.length,2);assert.ok(portable.children.every(c=>!c.workspace.colorSystem));
 const clone=s.importFree(portable),lc=clone.children.find(c=>c.workspace.name==='Light Mode');assert.equal(s.colors(lc.workspace.id).ownerId,clone.workspace.id);assert.deepEqual(clean(resolveDocument(lc.boards[0].document,s.colors(lc.workspace.id))),original);
 const standalone=s.importFree(s.exportFree(light.id).package);assert.equal(standalone.workspace.parentId,null);assert.equal(s.colors(standalone.workspace.id).themeId,'theme_light');assert.deepEqual(clean(resolveDocument(standalone.boards[0].document,s.colors(standalone.workspace.id))),original);
 }finally{s.close();}
});
test('migration includes vector paths, transparency, CSS gradients, history and export colors',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const w=s.createWorkspace('Legacy'),v=makeNode('vector',{fill:'transparent',viewBox:[0,0,20,20],paths:[{d:'M0 0 L20 20',fill:'none',stroke:'#ff1234',strokeWidth:2,opacity:1}],cssOverrides:{'box-shadow':'0 2px 4px rgba(0, 0, 0, .3)'}});let b=s.createBoard(w.id,'Chart',{nodes:[v]});b=s.mutate(b.id,b.revision,[{op:'update',id:v.id,patch:{x:40}}]);s.migrateColors();b=s.getBoard(b.id);const binding=b.document.nodes[0].colorBindings.find(x=>x.path==='paths.0.stroke');assert.ok(binding);edit(s,w.id,{op:'setColor',key:binding.token,value:'#abcdef'});
 assert.equal(resolveDocument(b.document,s.colors(w.id)).nodes[0].paths[0].stroke,'#abcdef');assert.match(s.export(b.id).jsxCode,/#abcdef/);assert.equal(s.readBoard(b.id).history[0].before.nodes[0].colorBindings.length,5);
 }finally{s.close();}
});
test('HTTP and MCP color edits share revision guards, theme cloning and live schematic layers',async()=>{
 const s=new FreegmaStore(':memory:',{seed:false}),w=s.createWorkspace('Project'),b=s.createBoard(w.id,'Board'),server=createServer({store:s});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{const p=await(await fetch(origin+'/api/workspaces/'+w.id+'/colors')).json(),body={expectedRevision:p.revision,operation:{op:'createTheme',name:'New theme'}};const response=await fetch(origin+'/api/workspaces/'+w.id+'/colors',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(response.status,200);const next=await response.json();assert.deepEqual(next.themes[1].colors,next.themes[0].colors);
 const inserted=callTool(s,'freegma_insert_color_schematic',{boardId:b.id,expectedRevision:b.revision,x:500,y:100});assert.equal(inserted.board.document.nodes[0].colorSchematic,true);assert.equal(inserted.board.document.nodes[0].x,500);
 assert.throws(()=>callTool(s,'freegma_update_colors',{workspaceId:w.id,expectedRevision:p.revision,operation:{op:'renameColor',key:'text',name:'Label'}}),e=>e.status===409);
 }finally{await new Promise(r=>server.close(r));s.close();}
});
test('CSS generation uses current theme and rejects an old palette without detaching unrelated roles',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const w=s.createWorkspace('Project'),n=makeNode('frame',{fill:'#101219',colorBindings:[{path:'fill',token:'background',source:'#101219'}]});const b=s.createBoard(w.id,'Board',{nodes:[n]}),old=s.export(b.id);
 edit(s,w.id,{op:'setColor',key:'background',value:'#222222'});assert.throws(()=>s.applyCss(b.id,b.revision,old.css,null,old.paletteRevision,old.themeId),e=>e.status===409);
 const next=s.export(b.id);let updated=s.applyCss(b.id,b.revision,next.css.replace('padding: 0px 0px 0px 0px','padding: 12px 12px 12px 12px'),null,next.paletteRevision,next.themeId);assert.equal(updated.document.nodes[0].paddingLeft,12);assert.equal(updated.document.nodes[0].colorBindings[0].token,'background');
 const current=s.export(b.id);updated=s.applyCss(b.id,updated.revision,current.css.replace('background: #222222','background: #ff0000'),null,current.paletteRevision,current.themeId);assert.equal(updated.document.nodes[0].fill,'#ff0000');assert.ok(!updated.document.nodes[0].colorBindings?.length);assert.equal(themeColors(s.colors(w.id)).background,'#222222');
 }finally{s.close();}
});
test('importing a linked board into a different project remaps roles without changing either project',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const source=s.createWorkspace('Source'),target=s.createWorkspace('Target'),child=s.createWorkspace('Target child',target.id);edit(s,source.id,{op:'setColor',key:'background',value:'#bb33aa'});
 const n=makeNode('frame',{fill:'#101219',colorBindings:[{path:'fill',token:'background',source:'#101219'}]}),b=s.createBoard(source.id,'Board',{nodes:[n]}),pkg=s.exportFree(b.id,'board').package,imported=s.importFree(pkg,child.id).boards[0];
 assert.equal(resolveDocument(imported.document,s.colors(child.id)).nodes[0].fill,'#bb33aa');assert.equal(themeColors(s.colors(target.id)).background,'#101219');assert.notEqual(imported.document.nodes[0].colorBindings[0].token,'background');
 }finally{s.close();}
});
test('schematic JSX/CSS exports include role labels and swatches and accept native geometry edits',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const w=s.createWorkspace('Project'),b=s.createBoard(w.id,'Board'),insert=s.insertColorSchematic(b.id,b.revision),output=s.export(b.id,insert.nodeId);assert.match(output.jsxCode,/Background/);assert.match(output.css,/#ae9bff/);
 const changed=s.applyCss(b.id,insert.board.revision,output.css.replace('width: 380px','width: 440px'),insert.nodeId,output.paletteRevision,output.themeId);assert.equal(changed.document.nodes[0].width,440);assert.equal(changed.document.nodes.length,1);
 }finally{s.close();}
});
test('local instance color remains detached when a bound component master updates',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const w=s.createWorkspace('Project'),n=makeNode('frame',{fill:'#101219',colorBindings:[{path:'fill',token:'background',source:'#101219'}]});let b=s.createBoard(w.id,'Master',{nodes:[n]});const saved=s.saveComponent(b.id,b.revision,n.id,'Card'),target=s.createBoard(w.id,'Instance'),inserted=s.insertComponent(target.id,target.revision,saved.component.id);s.mutate(target.id,inserted.board.revision,[{op:'override',id:inserted.nodeId,property:'fill',enabled:true},{op:'update',id:inserted.nodeId,patch:{fill:'#abc123'}}]);b=s.mutate(b.id,saved.board.revision,[{op:'update',id:n.id,patch:{radius:20}}]);s.saveComponent(b.id,b.revision,n.id,'Card','component',saved.component.id);const result=s.getBoard(target.id);assert.equal(resolveDocument(result.document,result.palette).nodes[0].fill,'#abc123');assert.equal(result.document.nodes[0].radius,20);
 }finally{s.close();}
});
