import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {FreegmaStore} from '../server/store.mjs';
import {STUDIO_VIEWS,studioDocument} from '../shared/studio-designs.mjs';
const store=new FreegmaStore(':memory:',{seed:false});
try{
 const root=store.createWorkspace('Freegma');
 for(const mode of ['light','dark']){
  const workspace=store.createWorkspace(mode==='light'?'Light Mode':'Dark Mode',root.id);
  const boards=STUDIO_VIEWS.map(view=>store.createBoard(workspace.id,view,studioDocument(mode,view)));
  for(const name of ['Editor overview','Layer inspector & spacing','React & CSS export']){
   const board=boards.find(b=>b.name===name);store.saveComponent(board.id,store.getBoard(board.id).revision,board.document.nodes[0].id,name,'template');
  }
  const foundation=boards.find(b=>b.name==='Foundations & components');
  for(const name of ['Generate React','Copy JSX','Download JSX','Layer row']){
   const node=foundation.document.nodes.find(n=>n.name===name);store.saveComponent(foundation.id,store.getBoard(foundation.id).revision,node.id,name,'component');
  }
 }
 store.migrateColors();store.renameWorkspace(root.id,'Freegma Example Studio');
 const output=fileURLToPath(new URL('../examples/Freegma-Studio.free',import.meta.url));fs.writeFileSync(output,JSON.stringify(store.exportFree(root.id).package,null,2)+'\n');console.log('Exported 22 editable studio views, palettes, components and templates: '+output);
}finally{store.close();}
