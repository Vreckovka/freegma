import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {DesignFiles,workspacePath,boardPath,identifier,extensions,imageBytes,validateBoard,validateWorkspace} from './files.mjs';
import {runtimeRoot} from './paths.mjs';
import {VERSION,newId,clone,validateDocument,applyOperations,subtree,copyNodes,descendants,generateReact,makeNode} from '../shared/design.mjs';
import {starterDocument} from '../shared/seed.mjs';
import {cssOperations,cssForDocument,parseLayerCss} from '../shared/css.mjs';
import {commentStoreMethods} from './comments-store.mjs';
import {detachMissingCommentAnchors} from '../shared/comments.mjs';
import {colorStoreMethods} from './colors-store.mjs';
import {deletionStoreMethods} from './deletion-store.mjs';
import {instanceContext} from '../shared/instance-locks.mjs';
import {instanceLockStoreMethods} from './instance-locks-store.mjs';
import {componentStoreMethods} from './components-store.mjs';
import {projectStoreMethods} from './projects-store.mjs';
import {flowStoreMethods} from './flows-store.mjs';
import {batchStoreMethods} from './batch-store.mjs';
import {arrangeStoreMethods} from './arrange-store.mjs';
import {emptyFlow} from '../shared/flows.mjs';
import {unpackFree} from './free-format.mjs';
import {resolveDocument,resolveOwnedDocument,newColorSystem,themeColors,materializeSchematics,materializeOwnedSchematics,colorHistoryState} from '../shared/colors.mjs';
export const defaultDatabase=path.join(runtimeRoot,'freegma.sqlite');
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const title=value=>{if(typeof value!=='string'||!value.trim()||value.length>200)throw error('Name must contain 1–200 characters.');return value.trim();};
const now=()=>new Date().toISOString();
const boardMeta=b=>({id:b.id,workspaceId:b.workspaceId,name:b.name,revision:b.revision,taskRef:b.taskRef,updatedAt:b.updatedAt});
const workspaceMeta=w=>({id:w.id,name:w.name,parentId:w.parentId||null,createdAt:w.createdAt,boards:w.boards,...(w.type?{type:w.type}:{})});
export class FreegmaStore {
  constructor(filename=process.env.FREEGMA_DB||defaultDatabase,{seed=true,storageRoot}={}){
    if(filename!==':memory:')fs.mkdirSync(path.dirname(filename),{recursive:true});
    this.filename=filename;this.temporaryRoot=filename===':memory:'&&!storageRoot?fs.mkdtempSync(path.join(os.tmpdir(),'freegma-files-')):null;
    this.files=new DesignFiles(storageRoot||this.temporaryRoot||process.env.FREEGMA_WORKSPACES||path.join(path.dirname(path.resolve(filename)),'workspaces'));
    this.db=new DatabaseSync(filename,{timeout:10000});this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS file_refs(kind TEXT NOT NULL,id TEXT NOT NULL,workspace_id TEXT NOT NULL,path TEXT NOT NULL,PRIMARY KEY(kind,id));`);
    try{
      if(this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='boards'").get())this.migrateLegacy();
      this.transaction(()=>this.reindex({lazyBoards:true}));
      for(const name of ['workspaces','workspace','createWorkspace','renameWorkspace','setWorkspaceParent','boards','getBoard','boardStatus','createBoard','history','components','component','asset','addAsset','export','exportFree','importFree','insertColorSchematic']){const method=this[name].bind(this);this[name]=(...args)=>this.transaction(()=>method(...args));}
      if(seed&&!this.workspaces().length&&!this.db.prepare("SELECT value FROM settings WHERE key='initialized'").get()){const ws=this.createWorkspace('Design studio'),b=this.createBoard(ws.id,'Dashboard exploration',starterDocument()),root=b.document.nodes.find(n=>n.name==='Primary button');this.saveComponent(b.id,b.revision,root.id,'Primary button','component');}
      if(seed)this.db.prepare("INSERT OR REPLACE INTO settings VALUES('initialized','1')").run();
    }catch(e){this.db.close();throw e;}
  }
  close(){this.db.close();if(this.temporaryRoot)fs.rmSync(this.temporaryRoot,{recursive:true,force:true});}
  transaction(fn){
    if(this.inTransaction)return fn();
    this.db.exec('BEGIN IMMEDIATE');this.inTransaction=true;this.files.pending=new Map();
    try{const recovered=this.files.recover();if(recovered)this.reindex();const result=fn();const changed=this.files.flush();this.db.exec('COMMIT');if(changed||recovered)this.files.finish();return result;}
    catch(e){try{this.db.exec('ROLLBACK');}catch{}throw e;}
    finally{this.inTransaction=false;this.files.pending=null;}
  }
  ref(kind,id){identifier(id);const ref=this.db.prepare('SELECT * FROM file_refs WHERE kind=? AND id=?').get(kind,id);if(!ref)throw error(kind==='asset'?'Image not found.':kind[0].toUpperCase()+kind.slice(1)+' not found.',404);return ref;}
  register(kind,id,workspaceId,file){identifier(id);identifier(workspaceId);this.files.resolve(file);this.db.prepare('INSERT INTO file_refs VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET workspace_id=excluded.workspace_id,path=excluded.path').run(kind,id,workspaceId,file);}
  manifest(id,copy=true){return this.files.validated(this.ref('workspace',id).path,validateWorkspace,copy);}
  stageManifest(w){validateWorkspace(w);this.files.stage(workspacePath(w.id),w);this.register('workspace',w.id,w.id,workspacePath(w.id));for(const c of w.components)this.register('component',c.id,w.id,workspacePath(w.id));for(const a of w.assets)this.register('asset',a.id,w.id,w.id+'/'+a.path);}
  readBoard(id,copy=true){const ref=this.ref('board',id),b=this.files.validated(ref.path,validateBoard,copy);if(b.id!==id||b.workspaceId!==ref.workspace_id)throw error('Board file identity mismatch.',500);return b;}
  reindex({lazyBoards=false}={}){
    this.db.exec('DELETE FROM file_refs');
    for(const entry of fs.readdirSync(this.files.root,{withFileTypes:true})){if(!entry.isDirectory()||!/^workspace_[\w-]+$/.test(entry.name))continue;const file=workspacePath(entry.name);if(!fs.existsSync(this.files.resolve(file)))continue;const w=validateWorkspace(this.files.json(file));if(w.id!==entry.name)throw error('Workspace folder identity mismatch.',500);
      const add=(kind,id,file)=>{if(this.db.prepare('SELECT id FROM file_refs WHERE kind=? AND id=?').get(kind,id))throw error('Duplicate stored '+kind+' ID.',500);this.register(kind,id,w.id,file);};
      add('workspace',w.id,file);for(const b of w.boards){
        const relative=boardPath(w.id,b.id);if(b.path!==`b/${b.id}.free`)throw error('Invalid board reference.',500);
        if(lazyBoards){if(!fs.statSync(this.files.resolve(relative)).isFile())throw error('Invalid board file.',500);}
        else{const actual=this.files.summary(relative,validateBoard,boardMeta);if(actual.id!==b.id||actual.workspaceId!==w.id)throw error('Invalid board file identity.',500);}
        add('board',b.id,relative);
      }
      for(const c of w.components)add('component',c.id,file);for(const a of w.assets){if(!fs.existsSync(this.files.resolve(w.id+'/'+a.path)))throw error('Missing workspace asset: '+a.id,500);add('asset',a.id,w.id+'/'+a.path);}
    }
    for(const workspace of this.workspaces())this.checkWorkspaceParent(workspace.id,workspace.parentId);
    this.db.prepare("INSERT OR REPLACE INTO settings VALUES('schema','2')").run();
  }
  migrateLegacy(){
    if(this.filename!==':memory:'){const backup=path.resolve(this.filename)+'.legacy-'+Date.now()+'.sqlite';this.db.exec("VACUUM INTO '"+backup.replaceAll("'","''")+"'");this.migrationBackup=backup;}
    this.transaction(()=>{
      for(const row of this.db.prepare('SELECT * FROM workspaces ORDER BY rowid').all()){
        const w={format:'freegma-workspace',formatVersion:1,id:row.id,name:row.name,createdAt:row.created_at,boards:[],components:[],assets:[]};
        for(const b of this.db.prepare('SELECT * FROM boards WHERE workspace_id=? ORDER BY rowid').all(row.id)){
          const history=this.db.prepare('SELECT * FROM history WHERE board_id=? ORDER BY seq').all(b.id).map(h=>({seq:h.seq,label:h.label,before:JSON.parse(h.before_doc),after:JSON.parse(h.after_doc),createdAt:h.created_at}));
          const board={format:'freegma-board',formatVersion:1,id:b.id,workspaceId:row.id,name:b.name,document:JSON.parse(b.document),revision:b.revision,cursor:b.cursor,taskRef:b.task_ref,updatedAt:b.updated_at,history};validateBoard(board);this.files.stage(boardPath(row.id,b.id),board);this.register('board',b.id,row.id,boardPath(row.id,b.id));w.boards.push({id:b.id,path:`b/${b.id}.free`});
        }
        w.components=this.db.prepare('SELECT * FROM components WHERE workspace_id=? ORDER BY rowid').all(row.id).map(c=>({id:c.id,name:c.name,kind:c.kind,definition:JSON.parse(c.definition),updatedAt:c.updated_at}));
        for(const a of this.db.prepare('SELECT * FROM assets WHERE workspace_id=? ORDER BY rowid').all(row.id)){const file=`Assets/${a.id}.${extensions[a.mime]}`;imageBytes(a.mime,Buffer.from(a.bytes).toString('base64'));this.files.stage(row.id+'/'+file,Buffer.from(a.bytes));w.assets.push({id:a.id,filename:a.filename,mime:a.mime,path:file,createdAt:a.created_at});}this.stageManifest(w);
      }
      this.db.exec('DROP TABLE history; DROP TABLE boards; DROP TABLE components; DROP TABLE assets; DROP TABLE workspaces;');this.db.prepare("INSERT OR REPLACE INTO settings VALUES('schema','2')").run();
    });this.db.exec('VACUUM');
  }
  workspaces(){return this.db.prepare("SELECT id,path FROM file_refs WHERE kind='workspace' ORDER BY rowid").all().map(r=>{const {boards,...w}=this.files.summary(r.path,validateWorkspace,workspaceMeta);return {...w,filePath:this.files.resolve(r.path)};});}
  workspace(id){const w=this.manifest(id);return {id:w.id,name:w.name,parentId:w.parentId||null,createdAt:w.createdAt,...(w.type?{type:w.type}:{}),filePath:this.files.resolve(workspacePath(w.id))};}
  createWorkspace(name,parentId=null){this.checkWorkspaceParent(null,parentId);const w={parentId,...(!parentId?{colorSystem:newColorSystem()}:{}),format:'freegma-workspace',formatVersion:1,id:newId('workspace'),name:title(name),createdAt:now(),boards:[],components:[],assets:[]};this.stageManifest(w);return this.workspace(w.id);}
  checkWorkspaceParent(id,parentId){
    const seen=new Set(id?[id]:[]);let current=parentId;
    while(current){if(seen.has(current))throw error('Workspace parenting would create a cycle.');seen.add(current);if(seen.size>32)throw error('Workspace hierarchy is limited to 32 levels.');current=this.manifest(current).parentId;}
  }
  setWorkspaceParent(id,parentId=null){const w=this.manifest(id);this.checkWorkspaceParent(id,parentId);w.parentId=parentId;this.stageManifest(w);for(const child of this.workspaces())this.checkWorkspaceParent(child.id,child.parentId);return this.workspace(id);}
  renameWorkspace(id,name){const w=this.manifest(id);w.name=title(name);this.stageManifest(w);return this.workspace(id);}
  boards(workspaceId){const ref=this.ref('workspace',workspaceId),w=this.files.summary(ref.path,validateWorkspace,workspaceMeta);return w.boards.map(r=>{const ref=this.ref('board',r.id),b=this.files.summary(ref.path,validateBoard,boardMeta);if(b.id!==r.id||b.workspaceId!==workspaceId)throw error('Board file identity mismatch.',500);return {...b,filePath:this.files.resolve(ref.path)};});}
  boardStatus(id){const b=this.readBoard(id,false),palette=this.colors(b.workspaceId);return {id:b.id,revision:b.revision,commentsRevision:b.commentsRevision||0,paletteRevision:palette.revision,themeId:palette.themeId,ownerId:palette.ownerId};}
  getBoard(id){const b=this.readBoard(id,false),palette=this.colors(b.workspaceId),state={designCanUndo:b.cursor>0,designCanRedo:b.history.some(h=>h.seq===b.cursor+1),designUndoAt:b.history.find(h=>h.seq===b.cursor)?.createdAt,designRedoAt:b.history.find(h=>h.seq===b.cursor+1)?.undoneAt};return {id:b.id,workspaceId:b.workspaceId,name:b.name,revision:b.revision,taskRef:b.taskRef,updatedAt:b.updatedAt,document:clone(b.document),comments:clone(b.comments||[]),commentsRevision:b.commentsRevision||0,palette,...state,...colorHistoryState(state,palette),filePath:this.files.resolve(boardPath(b.workspaceId,b.id))};}
  createBoard(workspaceId,name,document={version:1,nodes:[]}){const w=this.manifest(workspaceId);if(w.type==='flows'&&!document.flow&&!document.nodes?.length)document=emptyFlow();if((w.type==='flows')!==!!document.flow)throw error('Design and Flows board types must match their workspace.');validateDocument(document);this.validateAssets(document,workspaceId);const id=newId('board'),b={format:'freegma-board',formatVersion:1,id,workspaceId,name:title(name),document,revision:1,cursor:0,taskRef:'',updatedAt:now(),history:[],comments:[],commentsRevision:0};this.files.stage(boardPath(workspaceId,id),b);this.register('board',id,workspaceId,boardPath(workspaceId,id));w.boards.push({id,path:`b/${id}.free`});this.stageManifest(w);return this.getBoard(id);}
  expect(board,revision){if(!Number.isSafeInteger(revision))throw error('Supply the board expectedRevision.');if(board.revision!==revision)throw error('This board changed elsewhere. Reload before editing.',409);}
  validateAssets(doc,workspaceId){const ids=new Set(this.workspaceAncestors(workspaceId).flatMap(w=>w.assets.map(a=>a.id)));for(const n of doc.nodes)if(n.src&&!ids.has(n.src.slice('/assets/'.length)))throw error('Image does not belong to this workspace or its parents.');}
  writeBoard(board,doc,label){if((this.manifest(board.workspaceId,false).type==='flows')!==!!doc.flow)throw error('Design and Flows board types must match their workspace.');validateDocument(doc);this.validateAssets(doc,board.workspaceId);if(JSON.stringify(doc)===JSON.stringify(board.document))return this.getBoard(board.id);const raw=this.readBoard(board.id,false),b={...raw,comments:clone(raw.comments||[])},seq=b.cursor+1;this.clearColorRedo(b.workspaceId);detachMissingCommentAnchors(b,doc);b.history=b.history.filter(h=>h.seq<=b.cursor);b.history.push({seq,label:String(label||'Edit design').slice(0,200),before:board.document,after:doc,createdAt:now()});Object.assign(b,{document:doc,revision:b.revision+1,cursor:seq,updatedAt:now()});this.files.stage(boardPath(b.workspaceId,b.id),b);this.syncMasters(b,{previousDocument:board.document});return this.getBoard(b.id);}
  mutate(id,revision,operations,label){return this.transaction(()=>{const b=this.getBoard(id);if(b.document.flow)throw error('Use flow operations for Flows boards.');this.expect(b,revision);return this.writeBoard(b,this.lockedOperations(b.document,operations),label);});}
  applyCss(id,revision,css,nodeId=null,expectedPaletteRevision,expectedThemeId){return this.transaction(()=>{const b=this.getBoard(id);this.expect(b,revision);if(b.document.nodes.some(n=>n.colorBindings?.length)&&(!Number.isSafeInteger(expectedPaletteRevision)||expectedPaletteRevision!==b.palette.revision||expectedThemeId!==b.palette.themeId))throw error('Project colors or theme changed. Generate fresh CSS before applying.',409);const resolved=resolveDocument(b.document,b.palette);if(resolved.nodes.some(n=>n.colorSchematic)){const exported=cssForDocument(materializeSchematics(resolved,b.palette,makeNode),nodeId),rules=parseLayerCss(css),ids=new Set(resolved.nodes.map(n=>n.id));for(const [id,values] of rules)if(!ids.has(id)&&exported.rules.has(id)){if(JSON.stringify(values)!==JSON.stringify(exported.rules.get(id)))throw error('Edit schematic role values in Colors; its generated labels and swatches are read-only CSS.');rules.delete(id);}css=[...rules].map(([id,values])=>'.fg-'+id+' {'+Object.entries(values).map(([k,v])=>k+': '+v+';').join('')+'}').join('\n');}const ops=cssOperations(resolved,css,nodeId);return ops.length?this.writeBoard(b,this.lockedOperations(b.document,ops),'Apply CSS to design'):b;});}
  replace(id,revision,document,label='Import design'){return this.transaction(()=>{document=unpackFree(document).value;if(document?.format==='freegma-board')document=document.document;const b=this.getBoard(id);this.expect(b,revision);this.assertInstanceReplacement(b.document,document);return this.writeBoard(b,document,label);});}
  meta(id,revision,{name,taskRef}){return this.transaction(()=>{const b=this.readBoard(id);this.expect(b,revision);if(taskRef!=null&&(typeof taskRef!=='string'||taskRef.length>500))throw error('Invalid task reference.');Object.assign(b,{name:name==null?b.name:title(name),taskRef:taskRef??b.taskRef,revision:b.revision+1,updatedAt:now()});this.files.stage(boardPath(b.workspaceId,id),b);return this.getBoard(id);});}
  // Borrow immutable history documents; copy all metadata/comments that travel can change.
  // Staging still serializes and validates the full exact byte snapshot before publication.
  travel(id,revision,direction,expectedPaletteRevision){return this.transaction(()=>{const publicBoard=this.getBoard(id);this.expect(publicBoard,revision);if(!['undo','redo'].includes(direction)||!publicBoard[direction==='undo'?'canUndo':'canRedo'])throw error(`Nothing to ${direction}.`,409);if(publicBoard[direction+'Kind']==='color'){this.travelColors(publicBoard.workspaceId,expectedPaletteRevision,direction);return this.getBoard(id);}const raw=this.readBoard(id,false),b={...raw,comments:clone(raw.comments||[]),history:[...raw.history]},seq=direction==='undo'?b.cursor:b.cursor+1,h=b.history.find(h=>h.seq===seq);if(!h)throw error(`Nothing to ${direction}.`,409);const doc=direction==='undo'?h.before:h.after;this.validateAssets(doc,b.workspaceId);detachMissingCommentAnchors(b,doc);if(direction==='undo')b.history[seq-1]={...h,undoneAt:now()};Object.assign(b,{document:doc,cursor:direction==='undo'?seq-1:seq,revision:b.revision+1,updatedAt:now()});this.files.stage(boardPath(b.workspaceId,id),b);this.syncMasters(b,{updateHistory:false,previousDocument:publicBoard.document});return this.getBoard(id);});}
  history(id){const b=this.readBoard(id,false),p=this.colors(b.workspaceId);return [...b.history.map(({seq,label,createdAt})=>({seq,label,createdAt,kind:'design'})),...(p.colorHistory?.entries||[]).map(e=>({seq:e.id,label:'Change project color '+(p.schematic.find(r=>r.key===e.key)?.name||e.key),createdAt:e.createdAt,kind:'color'}))].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,30);}
  workspaceAncestors(workspaceId,copy=true){const result=[],seen=new Set();for(let w=this.manifest(workspaceId,copy);w;w=w.parentId?this.manifest(w.parentId,copy):null){if(seen.has(w.id))throw error('Workspace parenting would create a cycle.');seen.add(w.id);result.push(w);}return result;}
  components(workspaceId){return this.workspaceAncestors(workspaceId,false).flatMap(w=>w.components.map(({id,name,kind,updatedAt})=>({id,name,kind,updatedAt,workspaceId:w.id,ownerName:w.name,inherited:w.id!==workspaceId}))).sort((a,b)=>a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name));}
  component(id){const ref=this.ref('component',id),c=this.manifest(ref.workspace_id).components.find(c=>c.id===id);if(!c)throw error('Component not found.',404);return {...c,workspace_id:ref.workspace_id};}
  saveComponent(boardId,revision,nodeId,name,kind='component',componentId=null){return this.transaction(()=>{
    const board=this.getBoard(boardId);this.expect(board,revision);if(!['component','template'].includes(kind))throw error('Invalid library kind.');
    if(componentId){const existing=this.component(componentId);if(existing.workspace_id!==board.workspaceId)throw error('Open the component’s owning project to update its shared master.');if(existing.kind!==kind)throw error('Keep the existing library item kind.');}
    const definition=subtree(board.document,nodeId);for(const n of definition.nodes){delete n.componentId;delete n.componentMasterId;delete n.sourceId;delete n.overrides;delete n.instancePlacement;}
    const id=componentId||newId('component'),w=this.manifest(board.workspaceId),c={id,name:title(name),kind,definition,updatedAt:now()};w.components=w.components.filter(c=>c.id!==id);w.components.push(c);this.stageManifest(w);
    const sourceDoc=clone(board.document);if(kind==='component'){for(const n of descendants(sourceDoc.nodes,nodeId)){delete n.componentId;delete n.sourceId;delete n.overrides;delete n.instancePlacement;}sourceDoc.nodes.find(n=>n.id===nodeId).componentMasterId=id;}this.writeBoard(board,sourceDoc,'Save '+kind);
    if(componentId)this.publishComponent(this.component(id),definition,{sourceBoardId:boardId});
    return {component:this.component(id),board:this.getBoard(boardId)};
  });}
  insertComponent(boardId,revision,componentId,{x=100,y=100,parentId=null}={}){return this.transaction(()=>{const b=this.getBoard(boardId);this.expect(b,revision);if(instanceContext(b.document.nodes,parentId))throw error('Insert layers in the main component, or detach the instance.',423);const c=this.component(componentId);if(!this.workspaceAncestors(b.workspaceId).some(w=>w.id===c.workspace_id))throw error('Component belongs to another workspace outside this project.');const nodes=copyNodes(c.definition.nodes,{x,y,parentId,componentId:c.kind==='component'?c.id:null});if(nodes[0].componentId)nodes[0].instancePlacement={x:nodes[0].x,y:nodes[0].y,parentId:nodes[0].parentId};const next=this.writeBoard(b,{...b.document,nodes:[...b.document.nodes,...nodes]},'Insert '+c.name);return {board:next,nodeId:nodes[0].id};});}
  addAsset(workspaceId,{filename,mime,base64}){const w=this.manifest(workspaceId),bytes=imageBytes(mime,base64),id=newId('asset'),file=`Assets/${id}.${extensions[mime]}`;this.files.stage(workspaceId+'/'+file,bytes);w.assets.push({id,filename:String(filename||'Image').slice(0,200),mime,path:file,createdAt:now()});this.stageManifest(w);return {id,src:'/assets/'+id,filename};}
  asset(id){const ref=this.ref('asset',id),a=this.manifest(ref.workspace_id).assets.find(a=>a.id===id);if(!a)throw error('Image not found.',404);return {...a,bytes:this.files.bytes(ref.path)};}
  export(boardId,nodeId,name){
    const b=this.readBoard(boardId,false),palette=this.colors(b.workspaceId);
    if(b.document.flow)throw error('Export React from the referenced design board. Flows are logical diagrams.');
    const node=b.document.nodes.find(n=>n.id===nodeId),component=node&&(node.componentId||node.componentMasterId)?this.components(b.workspaceId).find(c=>c.id===(node.componentId||node.componentMasterId)):null;
    // Copy only a native selection. Generated schematic children require the full document first.
    const document=nodeId&&node?subtree(b.document,nodeId):clone(b.document);
    return {...generateReact(materializeOwnedSchematics(resolveOwnedDocument(document,palette),palette,makeNode),nodeId,name??component?.name??node?.name??b.name),boardId:b.id,revision:b.revision,paletteRevision:palette.revision,themeId:palette.themeId,colors:themeColors(palette),taskRef:b.taskRef};
  }
  exportFree(id,kind='workspace',nested=false){
    const w=this.manifest(kind==='board'?this.readBoard(id).workspaceId:id),boards=kind==='board'?[this.readBoard(id)]:w.boards.map(b=>this.readBoard(b.id));
    const manifest=clone(w);manifest.boards=boards.map(b=>({id:b.id,path:`b/${b.id}.free`}));
    if(!nested){const ancestors=this.workspaceAncestors(w.id);manifest.components=ancestors.flatMap(p=>clone(p.components));manifest.assets=ancestors.flatMap(p=>clone(p.assets));}
    if(!nested&&!manifest.colorSystem){const palette=this.colors(w.id);manifest.colorSystem={revision:palette.revision,schematic:palette.schematic,themes:palette.themes,defaultTheme:palette.defaultTheme,...(palette.colorHistory?{colorHistory:palette.colorHistory}:{})};manifest.colorTheme=palette.themeId;}
    return {filename:(kind==='board'?id:w.id)+'.free',package:{format:'freegma-package',formatVersion:1,applicationVersion:VERSION,kind,workspace:manifest,boards,assets:manifest.assets.map(a=>({...a,base64:this.asset(a.id).bytes.toString('base64')})),...(kind==='workspace'?{children:this.workspaces().filter(child=>child.parentId===w.id).map(child=>this.exportFree(child.id,'workspace',true).package)}:{})}};
  }
  importFree(input,targetWorkspaceId=null,parentId=null,inheritedIds=new Map()){
    input=unpackFree(input).value;
    const checkTree=(pkg,depth=0)=>{if(depth>30)throw error('Workspace hierarchy is limited to 32 levels.');if(pkg?.format==='freegma-packed')throw error('Only the outer portable package may be packed.');if(pkg?.children!==undefined){if(!Array.isArray(pkg.children)||pkg.children.length>1000||pkg.kind!=='workspace')throw error('Invalid child workspace packages.');for(const child of pkg.children)checkTree(child,depth+1);}};
    checkTree(input);const bundle=clone(input);
    if(!bundle||bundle.format!=='freegma-package'||bundle.formatVersion!==1||!['workspace','board'].includes(bundle.kind)||!Array.isArray(bundle.boards)||bundle.boards.length>2000||!Array.isArray(bundle.assets)||bundle.assets.length>2000||Buffer.byteLength(JSON.stringify(bundle))>128*1024*1024)throw error('Use a portable Freegma .free file, up to 128 MB.');
    if(bundle.children!==undefined&&(!Array.isArray(bundle.children)||bundle.children.length>1000||bundle.kind!=='workspace'))throw error('Invalid child workspace packages.');
    const inheritedOf=kind=>[...inheritedIds].filter(([,id])=>this.db.prepare('SELECT kind FROM file_refs WHERE id=?').get(id)?.kind===kind).map(([id])=>id);
    const source=validateWorkspace(bundle.workspace),assetIds=new Set([...source.assets.map(a=>a.id),...inheritedOf('asset')]),componentIds=new Set([...source.components.map(c=>c.id),...inheritedOf('component')]);
    if(source.boards.length!==bundle.boards.length||bundle.kind==='board'&&bundle.boards.length!==1||source.assets.length!==bundle.assets.length)throw error('Incomplete .free package.');
    const boardIds=new Set(),assetBytes=new Map();
    const checkDocument=doc=>{validateDocument(doc);for(const n of doc.nodes){if(n.src&&!assetIds.has(n.src.slice('/assets/'.length)))throw error('Missing image in .free package.');for(const key of ['componentId','componentMasterId'])if(n[key]&&!componentIds.has(n[key]))throw error('Missing component in .free package.');}};
    for(const b of bundle.boards){validateBoard(b);if(boardIds.has(b.id)||b.workspaceId!==source.id||!source.boards.some(r=>r.id===b.id&&r.path===`b/${b.id}.free`))throw error('Invalid packaged board reference.');boardIds.add(b.id);checkDocument(b.document);for(const h of b.history){checkDocument(h.before);checkDocument(h.after);}}
    for(const c of source.components)checkDocument(c.definition);
    for(const a of bundle.assets){if(assetBytes.has(a.id)||!source.assets.some(m=>m.id===a.id&&m.mime===a.mime&&m.path===a.path))throw error('Invalid packaged asset.');assetBytes.set(a.id,imageBytes(a.mime,a.base64));}
    if(targetWorkspaceId&&bundle.kind!=='board')throw error('Workspace packages import as a separate workspace.');
    const exists=(kind,id)=>!!this.db.prepare('SELECT id FROM file_refs WHERE kind=? AND id=?').get(kind,id);
    const workspaceId=targetWorkspaceId||(!exists('workspace',source.id)?source.id:newId('workspace'));
    const w=targetWorkspaceId?this.manifest(targetWorkspaceId):{...source,id:workspaceId,parentId,boards:[],components:[],assets:[]};
    if(bundle.boards.some(b=>(w.type==='flows')!==!!b.document.flow))throw error('Import Flows into a Flows workspace and designs into a design workspace.');const colorKeys=new Map();
    if(targetWorkspaceId&&source.colorSystem){
      const palette=this.colors(targetWorkspaceId),owner=this.manifest(palette.ownerId),p=owner.colorSystem,sourceColors=themeColors({...source.colorSystem,themeId:source.colorTheme||source.colorSystem.defaultTheme});
      for(const role of source.colorSystem.schematic){const value=sourceColors[role.key],same=p.schematic.find(r=>r.key===role.key&&p.themes.every(t=>t.colors[r.key]===value));const key=same?role.key:newId('color');colorKeys.set(role.key,key);if(!same){p.schematic.push({key,name:role.name,value});for(const t of p.themes)t.colors[key]=value;}}
      p.revision++;if(owner.id===w.id)w.colorSystem=p;else{owner.colorSystem=p;this.stageManifest(owner);}
    }
    const remap=new Map(inheritedIds);for(const [kind,items] of [['board',bundle.boards],['component',source.components],['asset',source.assets]])for(const item of items)remap.set(item.id,exists(kind,item.id)?newId(kind):item.id);
    const rewrite=doc=>{for(const f of doc.flowOverlay?.frames||[]){const r=f.reference;if(r.workspaceId===source.id&&remap.has(r.boardId)){r.workspaceId=workspaceId;r.boardId=remap.get(r.boardId);}}if(doc.flow)for(const n of [...doc.flow.nodes,...doc.flow.edges]){const r=n.reference||n.trigger;if(r&&r.workspaceId===source.id&&remap.has(r.boardId)){r.workspaceId=workspaceId;r.boardId=remap.get(r.boardId);}}for(const n of doc.nodes){if(n.src)n.src='/assets/'+remap.get(n.src.slice('/assets/'.length));for(const key of ['componentId','componentMasterId'])if(n[key])n[key]=remap.get(n[key]);for(const binding of n.colorBindings||[])binding.token=colorKeys.get(binding.token)||binding.token;}return doc;};
    for(const a of source.assets){const id=remap.get(a.id),file=`Assets/${id}.${extensions[a.mime]}`;this.files.stage(workspaceId+'/'+file,assetBytes.get(a.id));w.assets.push({...a,id,path:file});}
    for(const c of source.components)w.components.push({...c,id:remap.get(c.id),definition:rewrite(c.definition)});
    this.stageManifest(w);
    for(const b of bundle.boards){const id=remap.get(b.id);Object.assign(b,{id,workspaceId,document:rewrite(b.document)});for(const h of b.history){rewrite(h.before);rewrite(h.after);}this.files.stage(boardPath(workspaceId,id),b);this.register('board',id,workspaceId,boardPath(workspaceId,id));w.boards.push({id,path:`b/${id}.free`});}
    this.stageManifest(w);
    const childIds=new Map(inheritedIds);for(const item of [...source.components,...source.assets])childIds.set(item.id,remap.get(item.id));
    const children=(bundle.children||[]).map(child=>{const imported=this.importFree(child,null,workspaceId,childIds);this.setWorkspaceParent(imported.workspace.id,workspaceId);return {...imported,workspace:this.workspace(imported.workspace.id)};});
    return {workspace:this.workspace(workspaceId),boards:bundle.boards.map(b=>this.getBoard(b.id)),children,ids:Object.fromEntries(remap)};
  }
}
Object.assign(FreegmaStore.prototype,colorStoreMethods,commentStoreMethods,deletionStoreMethods,projectStoreMethods,componentStoreMethods,instanceLockStoreMethods,flowStoreMethods,batchStoreMethods,arrangeStoreMethods);
