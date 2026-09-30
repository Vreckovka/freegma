import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {validateDocument} from '../shared/design.mjs';
import {FreegmaMcpClient} from './mcp-client.mjs';
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function importProject({manifest,stateFile,client=null}) {
 // Validate the complete design set before creating any workspace or board.
 if(!manifest?.name||!Array.isArray(manifest.boards)||!manifest.boards.length)throw new Error('A project needs a name and boards.');
 const keys=new Set();for(const b of manifest.boards){if(!b.key||keys.has(b.key))throw new Error('Board keys must be unique.');keys.add(b.key);validateDocument(b.document);}
 for(const c of manifest.components||[])if(!keys.has(c.boardKey)||!manifest.boards.find(b=>b.key===c.boardKey).document.nodes.some(n=>n.id===c.nodeId))throw new Error('Component source layer missing.');
 const hash=digest(manifest);let state=fs.existsSync(stateFile)?JSON.parse(fs.readFileSync(stateFile,'utf8')):{manifestHash:hash,boards:{},components:{}};
 if(state.manifestHash!==hash)throw new Error('Import manifest changed. Preserve the existing import and use a new state file.');
 const checkpoint=()=>{fs.mkdirSync(path.dirname(stateFile),{recursive:true});fs.writeFileSync(stateFile+'.tmp',JSON.stringify(state,null,2));fs.renameSync(stateFile+'.tmp',stateFile);};
 client??=new FreegmaMcpClient();
 try{
  await client.initialize();
  if(!state.workspace){state.workspace=await client.call('freegma_create_workspace',{name:manifest.name});checkpoint();}
  for(const b of manifest.boards){
   if(!state.boards[b.key]){state.boards[b.key]=await client.call('freegma_create_board',{workspaceId:state.workspace.id,name:b.name,document:b.document});checkpoint();}
   const saved=await client.call('freegma_get_board',{boardId:state.boards[b.key].id});
   if(saved.workspaceId!==state.workspace.id)throw new Error('Board belongs to another workspace.');
   if(manifest.taskRef&&!saved.taskRef){state.boards[b.key]=await client.call('freegma_link_task',{boardId:saved.id,expectedRevision:saved.revision,taskRef:manifest.taskRef});checkpoint();}
  }
  for(const c of manifest.components||[]){if(state.components[c.key])continue;const b=await client.call('freegma_get_board',{boardId:state.boards[c.boardKey].id});const result=await client.call('freegma_save_component',{boardId:b.id,expectedRevision:b.revision,nodeId:c.nodeId,name:c.name,kind:c.kind||'component'});state.components[c.key]={id:result.component.id,name:c.name,boardId:b.id,nodeId:c.nodeId};checkpoint();}
  state.completed=true;checkpoint();return state;
 }finally{await client.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const [manifestFile,stateFile]=process.argv.slice(2);if(!manifestFile||!stateFile)throw new Error('Usage: node import-project.mjs MANIFEST.json STATE.json');
 const state=await importProject({manifest:JSON.parse(fs.readFileSync(manifestFile,'utf8')),stateFile:path.resolve(stateFile)});
 console.log(JSON.stringify({workspaceId:state.workspace.id,boards:Object.keys(state.boards).length,components:Object.keys(state.components).length,completed:state.completed}));
}
