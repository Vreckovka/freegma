import {VERSION} from '../shared/design.mjs';
const str={type:'string'},num={type:'number'},schema=(properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
export const toolDefinitions=[
  ['freegma_create_flow_workspace','Create an independent Flows workspace and an empty flow board. References existing designs without changing them.',schema({name:str,parentId:str},['name'])],
  ['freegma_flow_sources','List frames on one design board; supply frameId to list its elements for click triggers. Load only the selected board.',schema({boardId:str,frameId:str},['boardId'])],
  ['freegma_apply_flow','Atomically edit a Flows board using expectedRevision. Operations: addNode(node:{id,kind:frame|if|repeat|end,title,explanation,x,y,reference?}), updateNode(id,patch), removeNode(id), addEdge(edge:{id,from,to,action:straight|if|repeat,title,explanation,trigger?}), updateEdge(id,patch), removeEdge(id). reference and trigger: {workspaceId,boardId,frameId,elementId?}. Frame references are required; trigger elements must belong to the source frame. End steps cannot have outgoing transitions; self loops use repeat. Undo/redo and .free export preserve flow history.',schema({boardId:str,expectedRevision:{type:'integer'},operations:{type:'array',items:{type:'object'}},label:str},['boardId','expectedRevision','operations'])],
  ['freegma_create_project','Create an independent project. template: empty (blank board) or light-dark (shared Button/Card library, example and guide boards, Light/Dark palettes and optional theme folders). Components remain shared at the parent.',schema({name:str,template:{type:'string',enum:['empty','light-dark']}},['name'])],
  ['freegma_deletion_preview','Read exact board or workspace deletion scope and a confirmation token. Workspace deletion includes all descendants. Does not delete anything.',schema({kind:{type:'string',enum:['board','workspace']},id:str},['kind','id'])],
  ['freegma_delete_design','Delete a board or a workspace and its descendants after explicit user authorization. Supply exact confirmName and confirmationToken from a fresh deletion preview. Files are retained in local .trash; stale confirmations are rejected.',schema({kind:{type:'string',enum:['board','workspace']},id:str,confirmName:str,confirmationToken:str},['kind','id','confirmName','confirmationToken'])],
  ['freegma_list_comments','Read board or workspace comment threads, replies, reactions, resolution state and stable thread URLs. Deleted comments are omitted.',schema({boardId:str,workspaceId:str})],
  ['freegma_comment','Edit local board comments independently of drawing history. actor is {id,name}; expectedCommentsRevision is required. operation.op: create(x,y,text,anchor optional {nodeId,offsetX,offsetY},region optional {width,height}), reply(threadId,text), edit(threadId,messageId,text), deleteMessage/restoreMessage(threadId,messageId), deleteThread/restoreThread(threadId), resolve(threadId,resolved), move(threadId,x,y,anchor,region), react(threadId,messageId,emoji). Original authors own edits/deletions; reactions toggle. Local identities are display labels, not authenticated accounts.',schema({boardId:str,expectedCommentsRevision:{type:'integer'},actor:{type:'object'},operation:{type:'object'}},['boardId','expectedCommentsRevision','actor','operation'])],
  ['freegma_get_colors','Read the inherited project color schematic, all themes, active workspace theme and palette revision. Semantic roles bind native layer colors.',schema({workspaceId:str},['workspaceId'])],
  ['freegma_update_colors','Edit shared project colors with expectedRevision. Operations: setColor(key,value,themeId optional), addColor(key optional,name,value), removeColor(key), renameColor(key,name), createTheme(name,sourceThemeId optional), renameTheme(themeId,name), removeTheme(themeId), setTheme(themeId) for this workspace, setDefaultTheme(themeId), undo/redo for accepted setColor history. A setColor call is one atomic undoable action; return original color is a no-op. New themes copy the full schematic. Children automatically inherit. Role deletion preserves existing artwork colors.',schema({workspaceId:str,expectedRevision:{type:'integer'},operation:{type:'object'}},['workspaceId','expectedRevision','operation'])],
  ['freegma_insert_color_schematic','Insert a movable project-wide live color schematic component. Clicking a swatch edits the shared active theme. Roles added or removed appear in every instance.',schema({boardId:str,expectedRevision:{type:'integer'},x:num,y:num},['boardId','expectedRevision'])],
  ['freegma_migrate_colors','Appearance-preserving one-time migration of existing .free projects to inherited semantic color roles. Preserves positions, assets, IDs, histories and library definitions. Back up project .free packages first.',schema({})],
  ['freegma_list_workspaces','List independent Freegma workspaces.',schema({})],
  ['freegma_create_workspace','Create a Freegma workspace with a separate set of boards and library assets.',schema({name:str,parentId:str},['name'])],
  ['freegma_set_workspace_parent','Move a workspace under a parent folder. Omit parentId to move to the top level. Cycles are rejected; file paths and board URLs remain stable.',schema({workspaceId:str,parentId:str},['workspaceId'])],
  ['freegma_list_boards','List boards and stable design links in a workspace.',schema({workspaceId:str},['workspaceId'])],
  ['freegma_create_board','Create a board, optionally with an editable document. Use frames, shapes and text rather than flattening a reference.',schema({workspaceId:str,name:str,document:{type:'object'}},['workspaceId','name'])],
  ['freegma_get_board','Read editable nodes, revision and task reference before mutations. IDs are stable. Root positions use board coordinates; child positions use parent coordinates.',schema({boardId:str},['boardId'])],
  ['freegma_apply_operations','Atomically add/update/remove/duplicate/reorder/detach layers. Linked instances are read-only unless the property is explicitly overridden. Use {op:"override",id,property,enabled:true} before updating that property; enabled:false resets to the current main component. Each native property, vector paths.N.fill/stroke/d/strokeWidth/opacity and cssOverrides.CSS-PROPERTY is independently overrideable. Structural edits require the master or detaching the complete instance. expectedRevision is mandatory to prevent overwriting user edits. Allowed node types: frame, group, rectangle, ellipse, text, image, icon, vector. Vector layers use safe paths and a numeric viewBox. Independent widthSizing/heightSizing accept fixed, hug, fill; wrap enables wrapping. Layout: free, horizontal, vertical. Defaults supplied for add. Update patch can include x,y,width,height,text,fill,color,fontSize,paddingTop/Right/Bottom/Left,marginTop/Right/Bottom/Left,gap,layout,parentId and appearance, absolute positioning and letterSpacing.',schema({boardId:str,expectedRevision:{type:'integer'},operations:{type:'array',items:{type:'object'}},label:str},['boardId','expectedRevision','operations'])],
  ['freegma_list_components','List local and inherited ancestor components/templates with owner labels. Child extras remain local.',schema({workspaceId:str},['workspaceId'])],
  ['freegma_component_reference','Resolve a layer or sublayer to its master or instance: component ID, owning workspace, main component location, linked usages and local overrides. Master edits automatically synchronize across descendant boards.',schema({boardId:str,nodeId:str},['boardId','nodeId'])],
  ['freegma_save_component','Publish a layer subtree as a reusable component or template. Saved master edits automatically propagate to instances while preserving property overrides. Supply componentId only for explicit republishing.',schema({boardId:str,expectedRevision:{type:'integer'},nodeId:str,name:str,kind:{type:'string',enum:['component','template']},componentId:str},['boardId','expectedRevision','nodeId','name'])],
  ['freegma_insert_component','Insert a local or ancestor component instance or independent template, optionally inside a frame. Theme colors resolve in the destination.',schema({boardId:str,expectedRevision:{type:'integer'},componentId:str,x:num,y:num,parentId:str},['boardId','expectedRevision','componentId'])],
  ['freegma_import_image','Store a generated reference image in the workspace. Returns src for an image layer. Supply image/png, image/jpeg, image/webp or image/gif and base64 bytes; up to 8 MB.',schema({workspaceId:str,filename:str,mime:str,base64:str},['workspaceId','mime','base64'])],
  ['freegma_export_react','Generate React JSX from the design as a separate result. Does not change the board. Includes required asset paths. This is a visual scaffold for agent implementation.',schema({boardId:str,nodeId:str,name:str},['boardId'])],
  ['freegma_apply_css','Apply edited exported CSS to native layers as one undoable operation. Use exported .fg-ID selectors. Supports native geometry, spacing, typography and colors plus persisted layer CSS such as gradients, shadows and grid. Stale revisions, external URLs, at-rules and unsupported properties are rejected.',schema({boardId:str,expectedRevision:{type:'integer'},css:str,nodeId:str,expectedPaletteRevision:{type:'integer'},expectedThemeId:str},['boardId','expectedRevision','css'])],
  ['freegma_export_file','Export a complete portable .free workspace or individual board. Includes layout, CSS, history, linked components and embedded assets. Local files remain separate .free JSON and Assets directories.',schema({id:str,kind:{type:'string',enum:['workspace','board']}},['id','kind'])],
  ['freegma_import_file','Import a portable .free package. Preserves IDs when available; collisions create new IDs without overwriting existing designs. Optionally place a board package into an existing workspace.',schema({package:{type:'object'},workspaceId:str},['package'])],
  ['freegma_link_task','Attach an optional task ID or task URL to a design. Does not modify the task system.',schema({boardId:str,expectedRevision:{type:'integer'},taskRef:str},['boardId','expectedRevision','taskRef'])],
  ['freegma_undo','Undo the latest design or accepted project-color edit. Send expectedRevision and expectedPaletteRevision from the board. Color Undo changes the shared variable without rewriting artwork.',schema({boardId:str,expectedRevision:{type:'integer'},expectedPaletteRevision:{type:'integer'}},['boardId','expectedRevision'])],
  ['freegma_redo','Redo the latest undone design or project-color edit. Send expectedRevision and expectedPaletteRevision from the board.',schema({boardId:str,expectedRevision:{type:'integer'},expectedPaletteRevision:{type:'integer'}},['boardId','expectedRevision'])],
].map(([name,description,inputSchema])=>({name,description,inputSchema,annotations:{readOnlyHint:['freegma_deletion_preview','freegma_list_comments','freegma_get_colors','freegma_list_workspaces','freegma_list_boards','freegma_get_board','freegma_list_components','freegma_component_reference','freegma_export_react','freegma_export_file'].includes(name),destructiveHint:name==='freegma_delete_design',openWorldHint:false}}));
export function callTool(store,name,a={}){
  const def=toolDefinitions.find(t=>t.name===name);if(!def)throw new Error('Unknown tool: '+name);
  if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!Object.hasOwn(def.inputSchema.properties,k)))throw new Error('Invalid tool arguments.');
  for(const key of def.inputSchema.required)if(a[key]===undefined)throw new Error('Missing argument: '+key);
  for(const [key,value] of Object.entries(a)){const spec=def.inputSchema.properties[key];if(spec.type==='string'&&typeof value!=='string'||spec.type==='integer'&&!Number.isSafeInteger(value)||spec.type==='number'&&!Number.isFinite(value)||spec.type==='array'&&!Array.isArray(value)||spec.type==='object'&&(!value||typeof value!=='object'||Array.isArray(value))||spec.enum&&!spec.enum.includes(value))throw new Error('Invalid argument: '+key);}
  const origin=process.env.FREEGMA_ORIGIN||'http://127.0.0.1:4330',link=b=>({...b,url:`${origin}/w/${b.workspaceId}/b/${b.id}`});
  switch(name){
    case 'freegma_create_project':return store.createProject(a.name,a.template);
    case 'freegma_deletion_preview':return store.deletionPreview(a.kind,a.id);
    case 'freegma_delete_design':return store.deleteDesign(a.kind,a.id,a);
    case 'freegma_list_comments':return store.listComments(a,origin);
    case 'freegma_comment':return link(store.comment(a.boardId,a.expectedCommentsRevision,a.actor,a.operation));
    case 'freegma_get_colors':return store.colors(a.workspaceId);
    case 'freegma_update_colors':return store.updateColors(a.workspaceId,a.expectedRevision,a.operation);
    case 'freegma_insert_color_schematic':return store.insertColorSchematic(a.boardId,a.expectedRevision,a);
    case 'freegma_migrate_colors':return store.migrateColors();
    case 'freegma_list_workspaces':return {workspaces:store.workspaces().map(w=>({...w,url:`${origin}/w/${w.id}`}))};
    case 'freegma_create_workspace':return store.createWorkspace(a.name,a.parentId);
    case 'freegma_set_workspace_parent':return store.setWorkspaceParent(a.workspaceId,a.parentId||null);
    case 'freegma_list_boards':return {boards:store.boards(a.workspaceId).map(link)};
    case 'freegma_create_board':return link(store.createBoard(a.workspaceId,a.name,a.document));
    case 'freegma_get_board':return link(store.getBoard(a.boardId));
    case 'freegma_apply_operations':return link(store.mutate(a.boardId,a.expectedRevision,a.operations,a.label));
    case 'freegma_list_components':return {components:store.components(a.workspaceId)};
    case 'freegma_create_flow_workspace':return store.createFlowWorkspace(a.name,a.parentId);
    case 'freegma_flow_sources':return store.flowSources(a.boardId,a.frameId);
    case 'freegma_apply_flow':return link(store.mutateFlow(a.boardId,a.expectedRevision,a.operations,a.label));
    case 'freegma_component_reference':return store.componentReference(a.boardId,a.nodeId);
    case 'freegma_save_component':return store.saveComponent(a.boardId,a.expectedRevision,a.nodeId,a.name,a.kind,a.componentId);
    case 'freegma_insert_component':return store.insertComponent(a.boardId,a.expectedRevision,a.componentId,a);
    case 'freegma_import_image':return store.addAsset(a.workspaceId,a);
    case 'freegma_export_react':return store.export(a.boardId,a.nodeId,a.name);
    case 'freegma_apply_css':return link(store.applyCss(a.boardId,a.expectedRevision,a.css,a.nodeId,a.expectedPaletteRevision,a.expectedThemeId));
    case 'freegma_export_file':return store.exportFree(a.id,a.kind);
    case 'freegma_import_file':return store.importFree(a.package,a.workspaceId);
    case 'freegma_link_task':return link(store.meta(a.boardId,a.expectedRevision,{taskRef:a.taskRef}));
    case 'freegma_undo':return store.travel(a.boardId,a.expectedRevision,'undo',a.expectedPaletteRevision);
    case 'freegma_redo':return store.travel(a.boardId,a.expectedRevision,'redo',a.expectedPaletteRevision);
  }
}
export function rpc(store,message){
  if(!message||message.jsonrpc!=='2.0'||typeof message.method!=='string')return {jsonrpc:'2.0',id:message?.id??null,error:{code:-32600,message:'Invalid JSON-RPC request'}};
  if(message.id===undefined)return null;
  const respond=result=>({jsonrpc:'2.0',id:message.id,result});
  if(message.method==='initialize')return respond({protocolVersion:['2025-11-25','2025-06-18','2025-03-26','2024-11-05'].includes(message.params?.protocolVersion)?message.params.protocolVersion:'2025-11-25',capabilities:{tools:{},resources:{}},serverInfo:{name:'Freegma',version:VERSION},instructions:'Read a board before editing; send expectedRevision with atomic operations. Reference images are separate from editable layers. Use native frames/text/shapes, save components/templates, then export React for implementation. All content is in local .free files and Assets folders; SQLite indexes file references. Flows are a separate workspace type: use create_flow_workspace, flow_sources and apply_flow to connect existing frame/element references; do not change source designs to edit a flow.'});
  if(message.method==='ping')return respond({});
  if(message.method==='tools/list')return respond({tools:toolDefinitions});
  if(message.method==='resources/list')return respond({resources:store.workspaces().flatMap(w=>store.boards(w.id).map(b=>({uri:'freegma://board/'+b.id,name:b.name,mimeType:'application/json'})))});
  if(message.method==='resources/read'){try{const id=message.params?.uri?.match(/^freegma:\/\/board\/([\w-]+)$/)?.[1];if(!id)throw new Error('Unknown resource');return respond({contents:[{uri:message.params.uri,mimeType:'application/json',text:JSON.stringify(store.getBoard(id))}]});}catch(e){return {jsonrpc:'2.0',id:message.id,error:{code:-32002,message:e.message}};}}
  if(message.method==='tools/call'){try{const value=callTool(store,message.params?.name,message.params?.arguments);return respond({content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value,isError:false});}catch(e){return respond({content:[{type:'text',text:e.message}],isError:true});}}
  return {jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'Method not found'}};
}
