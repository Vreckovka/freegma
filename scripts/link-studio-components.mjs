import fs from 'node:fs';
import {FreegmaStore} from '../server/store.mjs';
import {studioComponentPlan,linkStudioControls} from '../shared/studio-components.mjs';
import {STUDIO_VIEWS} from '../shared/studio-designs.mjs';
export function linkStudioProject(store,rootId){return store.transaction(()=>{
  const root=store.workspace(rootId),children=store.workspaces().filter(w=>w.parentId===root.id&&['Light Mode','Dark Mode'].includes(w.name));
  const boards=children.sort((a,b)=>a.name.localeCompare(b.name)).flatMap(w=>store.boards(w.id).filter(b=>STUDIO_VIEWS.includes(b.name)).map(b=>store.getBoard(b.id)));
  const plan=studioComponentPlan(boards);
  if(store.boards(rootId).some(b=>b.name==='Shared studio components'))throw Error('Shared studio library already exists; inspect instead of repeating migration.');
  let masters=store.createBoard(rootId,'Shared studio components',{version:1,nodes:plan.families.flatMap(f=>f.nodes)});
  const components=new Map();for(const family of plan.families){const saved=store.saveComponent(masters.id,masters.revision,family.nodes[0].id,family.name);masters=saved.board;components.set(family.name,saved.component);}
  const visual=doc=>JSON.stringify(doc.nodes.map(n=>Object.fromEntries(Object.entries(n).filter(([k])=>!['componentId','componentMasterId','sourceId','overrides'].includes(k)))));
  for(const board of boards){const doc=linkStudioControls(board,plan.uses,components);if(visual(doc)!==visual(board.document))throw Error('Migration changed visible artwork; rolled back.');if(JSON.stringify(doc)!==JSON.stringify(board.document))store.replace(board.id,board.revision,doc,'Link studio controls to shared parent masters');}
  return {rootId,masterBoardId:masters.id,components:components.size,instances:plan.uses.length,boards:boards.length};
});}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replaceAll('\\','/'))){
  const [rootId,backupPath]=process.argv.slice(2);if(!rootId||!backupPath)throw Error('Provide root workspace ID and a new backup file.');
  const store=new FreegmaStore(undefined,{seed:false});try{
    fs.writeFileSync(backupPath,JSON.stringify(store.exportFree(rootId,'workspace').package),{flag:'wx'});
    console.log(JSON.stringify(linkStudioProject(store,rootId)));
  }finally{store.close();}
}
