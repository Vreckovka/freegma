import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FreegmaMcpClient} from './mcp-client.mjs';
import {STUDIO_VIEWS,studioDocument} from '../shared/studio-designs.mjs';

// Create through the same revision-aware MCP API used by agents. Reruns preserve edits.
export async function provisionStudio(client,{mode='light',taskRef=''}={}){
 if(!['light','dark'].includes(mode))throw Error('Choose light or dark.');
 let workspaces=(await client.call('freegma_list_workspaces')).workspaces;
 const unique=(name,parentId)=>{const matches=workspaces.filter(w=>w.name===name&&(w.parentId||null)===(parentId||null));if(matches.length>1)throw Error(`Multiple ${name} workspaces exist. Resolve the ambiguity before provisioning.`);return matches[0];};
 let parent=unique('Freegma',null);if(!parent){parent=await client.call('freegma_create_workspace',{name:'Freegma'});workspaces.push(parent);}
 const name=mode==='light'?'Light Mode':'Dark Mode';let workspace=unique(name,parent.id);
 if(!workspace)workspace=await client.call('freegma_create_workspace',{name,parentId:parent.id});
 let boards=(await client.call('freegma_list_boards',{workspaceId:workspace.id})).boards;const created=[];
 for(const view of STUDIO_VIEWS){
   if(boards.some(b=>b.name===view))continue;
   let b=await client.call('freegma_create_board',{workspaceId:workspace.id,name:view,document:studioDocument(mode,view)});
   if(taskRef)b=await client.call('freegma_link_task',{boardId:b.id,expectedRevision:b.revision,taskRef});
   boards.push(b);created.push(b.id);
 }
 let library=(await client.call('freegma_list_components',{workspaceId:workspace.id})).components;
 let foundation=await client.call('freegma_get_board',{boardId:boards.find(b=>b.name==='Foundations & components').id});
 for(const name of ['Generate React','Copy JSX','Download JSX','W field','Gap field','Layer row','Tab / active','Saved badge']){
   if(library.some(c=>c.name===name))continue;
   const node=foundation.document.nodes.find(n=>n.name===name);if(!node)throw Error('Missing studio control: '+name);
   const result=await client.call('freegma_save_component',{boardId:foundation.id,expectedRevision:foundation.revision,nodeId:node.id,name,kind:'component'});
   foundation=result.board;library.push(result.component);
 }
 for(const name of ['Editor overview','Layer inspector & spacing','React & CSS export']){
   if(library.some(c=>c.name===name&&c.kind==='template'))continue;
   const b=await client.call('freegma_get_board',{boardId:boards.find(b=>b.name===name).id});
   await client.call('freegma_save_component',{boardId:b.id,expectedRevision:b.revision,nodeId:b.document.nodes.find(n=>!n.parentId).id,name,kind:'template'});
 }
 return {mode,parent,workspace,created,boards:(await client.call('freegma_list_boards',{workspaceId:workspace.id})).boards,components:(await client.call('freegma_list_components',{workspaceId:workspace.id})).components};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode='light',output,taskRef='']=process.argv.slice(2),client=new FreegmaMcpClient();
 try{await client.initialize();const result=await provisionStudio(client,{mode,taskRef});if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));}console.log(JSON.stringify({mode,workspace:result.workspace.id,parent:result.parent.id,boards:result.boards.length,components:result.components.length,created:result.created.length}));}finally{await client.close();}
}
