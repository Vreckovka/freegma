// Portable semantic color roles. Layers retain literal fallbacks for detached files.
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
export const COLOR_VALUE=/^(#[\da-f]{3,8}|transparent|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\))$/i;
const KEY=/^[a-z][a-z0-9_-]{0,79}$/;
const PATH=/^(fill|color|stroke|paths\.\d{1,3}\.(fill|stroke)|cssOverrides\.[a-zA-Z-]+)$/;
export function validateColor(value){if(typeof value!=='string'||value.length>100||!COLOR_VALUE.test(value))fail('Use a hex, rgb, hsl or transparent color.');return value;}
export function validateColorSystem(p){
  if(!p||!Number.isSafeInteger(p.revision)||p.revision<1||!Array.isArray(p.schematic)||p.schematic.length>1000||!Array.isArray(p.themes)||!p.themes.length||p.themes.length>100)fail('Invalid project color system.');
  const keys=new Set(),themes=new Set();
  for(const role of p.schematic){if(!KEY.test(role.key)||keys.has(role.key)||typeof role.name!=='string'||!role.name.trim()||role.name.length>100)fail('Invalid color role.');keys.add(role.key);validateColor(role.value);}
  for(const theme of p.themes){if(!KEY.test(theme.id)||themes.has(theme.id)||typeof theme.name!=='string'||!theme.name.trim()||theme.name.length>100||!theme.colors||typeof theme.colors!=='object'||Array.isArray(theme.colors))fail('Invalid color theme.');themes.add(theme.id);if(Object.keys(theme.colors).length!==keys.size||Object.keys(theme.colors).some(k=>!keys.has(k)))fail('Each theme must contain every schematic role.');for(const v of Object.values(theme.colors))validateColor(v);}
  if(!themes.has(p.defaultTheme))fail('The default theme must exist.');validateColorHistory(p.colorHistory);return p;
}
export function validateColorHistory(history){
 if(history==null)return;
 if(!Array.isArray(history.entries)||history.entries.length>2000||!Number.isSafeInteger(history.cursor)||history.cursor<0||history.cursor>history.entries.length)fail('Invalid color history.');
 const date=v=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v)),ids=new Set();
 if(history.lastEditAt!=null&&!date(history.lastEditAt))fail('Invalid color history time.');
 for(const e of history.entries){if(typeof e.id!=='string'||!/^\w[\w-]{0,99}$/.test(e.id)||ids.has(e.id)||!KEY.test(e.key)||!KEY.test(e.themeId)||!date(e.createdAt)||e.undoneAt!=null&&!date(e.undoneAt))fail('Invalid color history entry.');ids.add(e.id);validateColor(e.before);validateColor(e.after);}
}
export function colorHistoryState(board,palette){
 const h=palette?.colorHistory,previous=h?.entries[h.cursor-1],next=h?.entries[h.cursor];
 const time=v=>Date.parse(v||'')||0;
 const designUndo=!!(board?.designCanUndo??board?.canUndo),designRedo=!!(board?.designCanRedo??board?.canRedo)&&(!h?.lastEditAt||time(board?.designRedoAt)>=time(h.lastEditAt));
 const undoKind=previous&&(!designUndo||time(previous.createdAt)>=time(board?.designUndoAt))?'color':designUndo?'design':null;
 const redoKind=next&&(!designRedo||time(next.undoneAt)>=time(board?.designRedoAt))?'color':designRedo?'design':null;
 return {canUndo:!!undoKind,canRedo:!!redoKind,undoKind,redoKind};
}
export function validateBindings(node){
  if(node.colorBindings!=null&&(!Array.isArray(node.colorBindings)||node.colorBindings.length>3000||node.colorBindings.some(b=>!b||!PATH.test(b.path)||!KEY.test(b.token)||typeof b.source!=='string'||!(COLOR_VALUE.test(b.source)||b.source==='none'&&b.path.startsWith('paths.'))||!readPath(node,b.path))))fail('Invalid layer color bindings.');
  if(node.colorSchematic!=null&&(typeof node.colorSchematic!=='boolean'||node.type!=='frame'))fail('Color schematics must be frames.');
}
export function readPath(node,path){return path.split('.').reduce((v,k)=>v?.[k],node);}
export function writePath(node,path,value){const parts=path.split('.'),last=parts.pop();const object=parts.reduce((v,k)=>v?.[k],node);if(object)object[last]=value;}
export function themeColors(palette){return palette?.themes?.find(t=>t.id===palette.themeId)?.colors||palette?.themes?.find(t=>t.id===palette.defaultTheme)?.colors||{};}
const resolveOwnedNode=(result,colors)=>{for(const b of result.colorBindings||[]){const value=colors[b.token];if(value==null)continue;const prior=readPath(result,b.path);if(typeof prior==='string')writePath(result,b.path,b.path.startsWith('cssOverrides.')?prior.split(b.source).join(value):value);}return result;};
export function resolveNode(node,palette){return resolveOwnedNode(structuredClone(node),themeColors(palette));}
export function resolveDocument(document,palette){return {...document,nodes:document.nodes.map(n=>resolveNode(n,palette))};}
// Only use with a private document copy; public resolvers keep cloning inputs.
export function resolveOwnedDocument(document,palette){const colors=themeColors(palette);for(const node of document.nodes)resolveOwnedNode(node,colors);return document;}
export function bindingPatch(node,path,key){if(!PATH.test(path))fail('Invalid color property.');const remaining=(node.colorBindings||[]).filter(b=>b.path!==path);const source=readPath(node,path);return {colorBindings:key?[...remaining,{path,token:key,source:source==='none'&&path.startsWith('paths.')?source:validateColor(source)}]:remaining};}
export function detachPatchedColors(node,patch){
  if(Object.hasOwn(patch,'colorBindings'))return;
  node.colorBindings=(node.colorBindings||[]).filter(b=>b.path.includes('.')?(!Object.hasOwn(patch,b.path.split('.')[0])||readPath(node,b.path)===readPath(patch,b.path)):!Object.hasOwn(patch,b.path));
  if(!node.colorBindings.length)delete node.colorBindings;
}
// Extract every literal, including colors embedded in shadows and gradients.
export function colorSlots(node){
  const slots=[];for(const k of ['fill','color','stroke'])if(node[k]&&COLOR_VALUE.test(node[k]))slots.push({path:k,value:node[k]});
  for(const [i,p] of (node.paths||[]).entries())for(const k of ['fill','stroke'])if(COLOR_VALUE.test(p[k]))slots.push({path:`paths.${i}.${k}`,value:p[k]});
  for(const [k,v] of Object.entries(node.cssOverrides||{}))if(typeof v==='string')for(const value of new Set(v.match(/#[\da-f]{3,8}\b|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\)|\btransparent\b/gi)||[]))slots.push({path:'cssOverrides.'+k,value});
  return slots;
}
export function newColorSystem(){return {revision:1,defaultTheme:'theme_default',schematic:[{key:'background',name:'Background',value:'#101219'},{key:'surface',name:'Surface / overlay',value:'#1b1e27'},{key:'text',name:'Text',value:'#e8eaf3'},{key:'muted',name:'Muted text',value:'#afb4c5'},{key:'border',name:'Border',value:'#303544'},{key:'accent',name:'Accent',value:'#ae9bff'}],themes:[{id:'theme_default',name:'Default',colors:{background:'#101219',surface:'#1b1e27',text:'#e8eaf3',muted:'#afb4c5',border:'#303544',accent:'#ae9bff'}}]};}
export function materializeSchematics(document,palette,makeNode){
  return materializeOwnedSchematics(structuredClone(document),palette,makeNode);
}
// Generated schematic children belong to the caller's private scratch document.
export function materializeOwnedSchematics(doc,palette,makeNode){
  const colors=themeColors(palette);
  for(const n of [...doc.nodes])if(n.colorSchematic){
    delete n.colorSchematic;n.cssOverrides={...n.cssOverrides,overflow:'auto'};
    const text=(id,value,x,y,w,size)=>doc.nodes.push(makeNode('text',{id:n.id+'_'+id,parentId:n.id,name:value,text:value,x,y,width:w,height:size*2,fontSize:size,color:n.color,fill:'transparent',strokeWidth:0}));
    text('heading','Color schematic',20,16,n.width-40,18);text('theme',palette.themes.find(t=>t.id===palette.themeId)?.name||'Project colors',20,46,n.width-40,11);
    for(const [i,r] of palette.schematic.entries()){
      const y=78+i*52;doc.nodes.push(makeNode('ellipse',{id:n.id+'_swatch_'+i,parentId:n.id,name:r.name+' swatch',x:20,y,width:32,height:32,fill:colors[r.key]||r.value,strokeWidth:1,stroke:'#888888'}));
      text('name_'+i,r.name,66,y,n.width-86,12);text('value_'+i,colors[r.key]||r.value,66,y+21,n.width-86,10);
    }
  }
  return doc;
}
