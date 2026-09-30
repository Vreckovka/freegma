import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {importProject} from '../scripts/import-project.mjs';import {FreegmaMcpClient} from '../scripts/mcp-client.mjs';import {makeNode} from '../shared/design.mjs';
test('project imports use real MCP, resume without duplicates and preserve user edits and board order',async()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-import-')),stateFile=path.join(folder,'state.json'),env={FREEGMA_DB:path.join(folder,'freegma.sqlite')};
 const client=()=>new FreegmaMcpClient({env});
 const frame=makeNode('frame'),manifest={name:'Migration',taskRef:'DASH-test',boards:[{key:'first',name:'First',document:{nodes:[frame]}},{key:'second',name:'Second',document:{nodes:[]}}],components:[{key:'frame',boardKey:'first',nodeId:frame.id,name:'Frame'}]};
 try{const state=await importProject({manifest,stateFile,client:client()});assert.equal(state.completed,true);const c=client();await c.initialize();try{
  let b=await c.call('freegma_get_board',{boardId:state.boards.first.id});assert.equal(b.taskRef,'DASH-test');await c.call('freegma_apply_operations',{boardId:b.id,expectedRevision:b.revision,operations:[{op:'update',id:frame.id,patch:{name:'User change'}}]});
  assert.deepEqual((await c.call('freegma_list_boards',{workspaceId:state.workspace.id})).boards.map(b=>b.name),['First','Second']);
 }finally{await c.close();}
 const resumed=await importProject({manifest,stateFile,client:client()});assert.equal(resumed.workspace.id,state.workspace.id);const verify=client();await verify.initialize();try{assert.equal((await verify.call('freegma_get_board',{boardId:state.boards.first.id})).document.nodes[0].name,'User change');assert.equal((await verify.call('freegma_list_components',{workspaceId:state.workspace.id})).components.length,1);}finally{await verify.close();}
 await assert.rejects(()=>importProject({manifest:{...manifest,name:'Changed'},stateFile}),/manifest changed/);
 await assert.rejects(()=>importProject({manifest:{...manifest,boards:[{...manifest.boards[0],document:{nodes:[{...frame,parentId:'missing'}]}}]},stateFile:path.join(folder,'invalid.json')}),/Parent/);assert.equal(fs.existsSync(path.join(folder,'invalid.json')),false);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
