import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {FreegmaMcpClient} from '../scripts/mcp-client.mjs';
import {provisionStudio} from '../scripts/provision-studio.mjs';
import {STUDIO_VIEWS,STUDIO_PALETTES,studioDocument} from '../shared/studio-designs.mjs';
import {generateReact} from '../shared/design.mjs';
import {createRequire} from 'node:module';
const dependencies=async()=>({require:createRequire(import.meta.url)});

test('studio designs contain native editable controls and compile in both palettes',async()=>{
 const {require}=await dependencies();
 for(const mode of ['light','dark'])for(const view of STUDIO_VIEWS){
   const doc=studioDocument(mode,view);assert.ok(doc.nodes.length>60);
   assert.equal(doc.nodes.some(n=>n.type==='image'),false);
   assert.ok(doc.nodes.some(n=>n.type==='icon'));assert.ok(doc.nodes.some(n=>n.type==='text'));
   assert.equal(doc.nodes[0].fill,STUDIO_PALETTES[mode].canvas);
   require('esbuild').transformSync(generateReact(doc,null,'FreegmaEditor').jsxCode,{loader:'jsx'});
 }
 const css=studioDocument('light','React & CSS export');assert.ok(css.nodes.some(n=>n.name==='CSS source editor'));assert.ok(css.nodes.some(n=>n.name==='Copy CSS'));assert.ok(css.nodes.some(n=>n.name==='Download CSS'));
});

test('MCP provisions grouped studio workspaces and reruns preserve edited boards and library',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-studio-')),client=new FreegmaMcpClient({env:{FREEGMA_DB:path.join(dir,'index.sqlite'),FREEGMA_WORKSPACES:path.join(dir,'workspaces')}});
 try{
   await client.initialize();const light=await provisionStudio(client,{mode:'light',taskRef:'DASH-637'}),dark=await provisionStudio(client,{mode:'dark',taskRef:'DASH-639'});
   assert.equal(light.parent.id,dark.parent.id);assert.equal(light.workspace.parentId,light.parent.id);assert.equal(dark.boards.length,STUDIO_VIEWS.length);assert.equal(light.components.length,11);
   const board=await client.call('freegma_get_board',{boardId:light.boards[0].id}),node=board.document.nodes.find(n=>n.type==='text');
   const changed=await client.call('freegma_apply_operations',{boardId:board.id,expectedRevision:board.revision,operations:[{op:'update',id:node.id,patch:{text:'User edit preserved'}}]});
   const again=await provisionStudio(client,{mode:'light'});assert.equal(again.created.length,0);assert.equal(again.components.length,11);
   const preserved=await client.call('freegma_get_board',{boardId:board.id});assert.equal(preserved.revision,changed.revision);assert.equal(preserved.document.nodes.find(n=>n.id===node.id).text,'User edit preserved');
   const exported=await client.call('freegma_export_file',{id:light.parent.id,kind:'workspace'});assert.equal(exported.package.children.length,2);
 }finally{await client.close();fs.rmSync(dir,{recursive:true,force:true});}
});
