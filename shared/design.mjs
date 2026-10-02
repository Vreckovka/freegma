import {ICON_PATHS} from './icons.mjs';
import {validateFlow} from './flows.mjs';
import {validateOverlay,pruneOverlay} from './flow-overlay.mjs';
import {validateBindings,detachPatchedColors,readPath} from './colors.mjs';
import {validateCssOverrides,mergeCss,clearCssForPatch,cssForDocument} from './css.mjs';
export const VERSION = "0.1.42";
export const TYPES = ["frame", "group", "rectangle", "ellipse", "text", "image", "icon", "vector"];
export const DEFAULTS = { x:0, y:0, width:240, height:160, rotation:0, fill:"#ffffff", color:"#172033", stroke:"#dfe4ec", strokeWidth:0, radius:0, opacity:1, fontSize:16, fontWeight:400, fontFamily:"Inter, system-ui, sans-serif", lineHeight:1.5, textAlign:"left", layout:"free", gap:16, paddingTop:0, paddingRight:0, paddingBottom:0, paddingLeft:0, marginTop:0, marginRight:0, marginBottom:0, marginLeft:0, align:"start", justify:"start", sizing:"fixed", visible:true, locked:false, clip:false, text:"", src:"", icon:"sparkles" };
const numeric = new Set(["x","y","width","height","rotation","strokeWidth","radius","opacity","fontSize","fontWeight","lineHeight","gap","paddingTop","paddingRight","paddingBottom","paddingLeft","marginTop","marginRight","marginBottom","marginLeft"]);
numeric.add('letterSpacing');
const fields = new Set([...Object.keys(DEFAULTS),"name","parentId","type","componentId","componentMasterId","sourceId","overrides","reference","widthSizing","heightSizing","wrap","paths","viewBox","letterSpacing","absolute","cssOverrides","colorBindings","colorSchematic"]);
fields.add('instancePlacement');
export const OVERRIDE_PROPERTIES=[...fields].filter(k=>!['type','componentId','componentMasterId','sourceId','overrides','instancePlacement'].includes(k));
export function isOverrideProperty(key){if(OVERRIDE_PROPERTIES.includes(key)||typeof key==='string'&&/^paths\.\d{1,3}\.(d|fill|stroke|strokeWidth|opacity)$/.test(key))return true;if(typeof key==='string'&&key.startsWith('cssOverrides.')){try{validateCssOverrides({[key.slice(13)]:'initial'});return true;}catch{}}return false;}
export const clone = value => structuredClone(value);
export function newId(prefix="node") { return `${prefix}_${globalThis.crypto.randomUUID().replaceAll("-","").slice(0,16)}`; }
export function makeNode(type="frame", patch={}) {
  const base = {...DEFAULTS,id:newId(),type,name:type[0].toUpperCase()+type.slice(1),parentId:null};
  if (type==="text") Object.assign(base,{width:280,height:40,fill:"transparent",text:"Your text",strokeWidth:0,fontSize:24});
  if (type==="icon") Object.assign(base,{width:32,height:32,fill:"transparent",color:"#7864ff"});
  if (type==="group") Object.assign(base,{fill:"transparent",strokeWidth:0});
  return {...base,...patch};
}
function fail(message) { throw Object.assign(new Error(message),{status:400}); }
export function validateDocument(document) {
  if (!document || !Array.isArray(document.nodes) || document.nodes.length>10000) fail("A design needs a nodes array with at most 10,000 layers.");
  if(document.flow!=null){validateFlow(document.flow);if(document.nodes.length)fail('Flows keep references separate from design layers.');}
  const ids=new Set();
  for (const node of document.nodes) {
    if (!node || typeof node.id!=="string" || !/^[\w-]{1,100}$/.test(node.id) || ids.has(node.id)) fail("Layer IDs must be unique, nonempty identifiers.");
    ids.add(node.id);
    if(node.cssOverrides!=null)validateCssOverrides(node.cssOverrides);
    validateBindings(node);
    if (!TYPES.includes(node.type)) fail("Unknown layer type.");
    for (const key of Object.keys(node)) if (key!=="id"&&!fields.has(key)) fail(`Unknown layer property: ${key}`);
    for (const key of numeric) if (node[key]!=null && (!Number.isFinite(node[key]) || Math.abs(node[key])>100000)) fail(`Invalid ${key}.`);
    if (!(node.width>0&&node.height>0)) fail("Layer width and height must be positive.");
    if (node.opacity<0||node.opacity>1 || node.fontSize<1 || node.strokeWidth<0 || node.radius<0 || node.lineHeight<=0) fail("Invalid appearance value.");
    if(['gap','paddingTop','paddingRight','paddingBottom','paddingLeft'].some(key=>node[key]<0))fail("Padding and layout gap must be nonnegative.");
    for (const key of ["name","text","fontFamily","fill","color","stroke","src"]) if (node[key]!=null && (typeof node[key]!=="string" || node[key].length>100000)) fail(`Invalid ${key}.`);
    if (!['free','horizontal','vertical'].includes(node.layout)) fail("Invalid layout.");
    if (!['fixed','hug','fill'].includes(node.sizing)) fail("Invalid sizing.");
    for (const axis of ['widthSizing','heightSizing']) if(node[axis]!=null&&!['fixed','hug','fill'].includes(node[axis]))fail('Invalid axis sizing.');
    if(node.wrap!=null&&typeof node.wrap!=='boolean')fail('Invalid layout wrapping.');
    if(node.type==='vector') {
      if(!Array.isArray(node.viewBox)||node.viewBox.length!==4||node.viewBox.some(v=>!Number.isFinite(v)||Math.abs(v)>100000)||node.viewBox[2]<=0||node.viewBox[3]<=0)fail('Invalid vector view box.');
      if(!Array.isArray(node.paths)||node.paths.length>1000||node.paths.some(p=>!p||Object.keys(p).some(k=>!['d','fill','stroke','strokeWidth','opacity'].includes(k))||typeof p.d!=='string'||p.d.length>100000||!/^\s*[Mm][\d\s.,eE+\-MmLlHhVvCcSsQqTtAaZz]*$/.test(p.d)||!Number.isFinite(p.strokeWidth)||p.strokeWidth<0||p.strokeWidth>10000||!Number.isFinite(p.opacity)||p.opacity<0||p.opacity>1||['fill','stroke'].some(k=>typeof p[k]!=='string'||!/^(#[\da-f]{3,8}|none|transparent|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\))$/i.test(p[k]))))fail('Invalid vector paths.');
    }
    if (!['start','center','end','stretch'].includes(node.align) || !['start','center','end','space-between'].includes(node.justify)) fail("Invalid alignment.");
    if (!['left','center','right'].includes(node.textAlign)) fail("Invalid text alignment.");
    if(typeof node.icon!=="string"||!Object.hasOwn(ICON_PATHS,node.icon))fail("Unknown icon.");
    if (node.src && !/^\/assets\/[\w.-]+$/.test(node.src)) fail("Images must be imported into Freegma assets.");
    if (node.overrides && (!Array.isArray(node.overrides) || node.overrides.some(k=>!isOverrideProperty(k)))) fail("Invalid component overrides.");
    if(node.instancePlacement!=null&&(!node.componentId||Object.keys(node.instancePlacement).some(k=>!['x','y','parentId'].includes(k))||!Number.isFinite(node.instancePlacement.x)||!Number.isFinite(node.instancePlacement.y)||(node.instancePlacement.parentId!=null&&typeof node.instancePlacement.parentId!=='string')))fail('Invalid instance placement.');
    for (const key of ["visible","locked","clip","reference","absolute"]) if (node[key]!=null&&typeof node[key]!=="boolean") fail(`Invalid ${key}.`);
    for (const key of ["fill","color","stroke"]) if (node[key] && !/^(#[\da-f]{3,8}|transparent|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\))$/i.test(node[key])) fail(`Use a hex, rgb, hsl or transparent ${key}.`);
  }
  const map=new Map(document.nodes.map(n=>[n.id,n]));
  for (const node of document.nodes) {
    if (node.parentId && (!ids.has(node.parentId) || !['frame','group'].includes(map.get(node.parentId).type))) fail("Parent must be a frame or group in this board.");
    let parent=node,depth=0;const visited=new Set();
    while (parent) { if (visited.has(parent.id)||++depth>100) fail("Layers cannot contain cycles or exceed 100 levels.");visited.add(parent.id);parent=map.get(parent.parentId); }
  }
  if(document.flowOverlay!=null){if(document.flow)fail('Flow layers belong to design boards.');validateOverlay(document.flowOverlay,document.nodes);}
  return document;
}
export function descendants(nodes,id) { const set=new Set([id]);let changed=true;while(changed){changed=false;for(const n of nodes)if(set.has(n.parentId)&&!set.has(n.id)){set.add(n.id);changed=true;}}return nodes.filter(n=>set.has(n.id)); }
export function selectionRoots(nodes,ids){const selected=new Set(ids),map=new Map(nodes.map(n=>[n.id,n]));return ids.filter(id=>{let n=map.get(id);if(!n)return false;while(n.parentId){if(selected.has(n.parentId))return false;n=map.get(n.parentId);if(!n)break;}return true;});}
export function subtree(document,id) { const nodes=descendants(document.nodes,id).map(clone);if(!nodes.length)fail("Layer not found.");nodes.sort((a,b)=>a.id===id?-1:b.id===id?1:0);nodes[0].parentId=null;return {version:1,nodes}; }
export function copyNodes(nodes,{parentId=null,x,y,componentId=null}={}) {
  const remap=new Map(nodes.map(n=>[n.id,newId()]));
  return nodes.map((n,i)=>({...clone(n),id:remap.get(n.id),parentId:remap.get(n.parentId)||parentId,...(componentId?{sourceId:n.id,overrides:[],componentId:i===0?componentId:undefined}:{}),...(i===0?{x:x??n.x+32,y:y??n.y+32}:{}),componentMasterId:undefined})).map(n=>{if(n.componentId)n.instancePlacement={x:n.x,y:n.y,parentId:n.parentId};return Object.fromEntries(Object.entries(n).filter(([,v])=>v!==undefined));});
}
export function applyOperations(input,operations) {
  const doc=clone(input);
  if (!Array.isArray(operations)||!operations.length||operations.length>1000) fail("Supply 1–1000 operations.");
  const find=id=>{const n=doc.nodes.find(n=>n.id===id);if(!n)fail(`Layer not found: ${id}`);return n;};
  for(const op of operations){
    if(op.op==="add") { if(!op.node||!TYPES.includes(op.node.type))fail("An add operation needs a valid layer.");doc.nodes.push(makeNode(op.node.type,op.node)); }
    else if(op.op==="update") { const n=find(op.id);if(!op.patch||Object.keys(op.patch).some(k=>!fields.has(k)||["type","componentId","componentMasterId","sourceId","overrides","instancePlacement"].includes(k)))fail("Invalid editable layer patch.");if(Object.hasOwn(op.patch,'colorBindings'))validateBindings({...n,...op.patch});detachPatchedColors(n,op.patch);clearCssForPatch(n,op.patch);Object.assign(n,op.patch);if(n.colorBindings)n.colorBindings=n.colorBindings.filter(b=>readPath(n,b.path)); }
    else if(op.op==='override') {const n=find(op.id);if(!n.sourceId||!isOverrideProperty(op.property)||typeof op.enabled!=='boolean')fail('Choose one valid instance property to override.');if(op.placement)n.instancePlacement=clone(op.placement);n.overrides=op.enabled?[...new Set([...(n.overrides||[]),op.property])]:(n.overrides||[]).filter(k=>k!==op.property);if(!op.enabled&&op.restore){const r=op.restore;if(op.property.startsWith('cssOverrides.')){n.cssOverrides={...n.cssOverrides};if(r.present)n.cssOverrides[op.property.slice(13)]=clone(r.value);else delete n.cssOverrides[op.property.slice(13)];}else if(op.property.startsWith('paths.')){const [,index,key]=op.property.split('.');if(r.present&&n.paths?.[index])n.paths[index][key]=clone(r.value);}else if(r.present)n[op.property]=clone(r.value);else delete n[op.property];if(r.bindings)n.colorBindings=clone(r.bindings);if(r.css)n.cssOverrides=clone(r.css);} }
    else if(op.op==="remove") {find(op.id);const ids=new Set(descendants(doc.nodes,op.id).map(n=>n.id));doc.nodes=doc.nodes.filter(n=>!ids.has(n.id));}
    else if(op.op==="duplicate") { const n=find(op.id);doc.nodes.push(...copyNodes(subtree(doc,n.id).nodes,{parentId:n.parentId,x:op.x,y:op.y})); }
    else if(op.op==="reorder") { const n=find(op.id);const siblings=doc.nodes.filter(s=>s.parentId===n.parentId);const index=Math.max(0,Math.min(siblings.length-1,Number(op.index)));if(!Number.isInteger(op.index))fail("Layer order must be an integer.");const ordered=siblings.filter(s=>s.id!==n.id);ordered.splice(index,0,n);let i=0;doc.nodes=doc.nodes.map(s=>s.parentId===n.parentId?ordered[i++]:s); }
    else if(op.op==="detach") { for(const n of descendants(doc.nodes,find(op.id).id)){delete n.componentId;delete n.sourceId;delete n.overrides;delete n.instancePlacement;} }
    else fail(`Unknown operation: ${op.op}`);
  }
  return validateDocument(pruneOverlay(doc));
}
export function layerStyle(n,parent=null,root=false) {return mergeCss(baseLayerStyle(n,parent,root),n.cssOverrides);}
function baseLayerStyle(n,parent=null,root=false) {
  const flow=parent && parent.layout!=="free"&&!n.absolute,flex=n.layout!=="free";
  // Independent axes preserve fixed-width, content-height frames imported from design tools.
  if(n.widthSizing||n.heightSizing||n.wrap) {
    const legacy=baseLayerStyle({...n,widthSizing:undefined,heightSizing:undefined,wrap:undefined},parent,root);
    const ws=n.widthSizing||n.sizing,hs=n.heightSizing||n.sizing,row=parent?.layout==='horizontal';
    Object.assign(legacy,{width:ws==='hug'?'max-content':ws==='fill'&&flow?(row?undefined:'100%'):n.width,height:hs==='hug'?'max-content':hs==='fill'&&flow?(row?'100%':undefined):n.height,flex:flow&&((row&&ws==='fill')||(!row&&hs==='fill'))?'1 1 0':'0 0 auto',flexWrap:flex&&n.wrap?'wrap':undefined});
    legacy.letterSpacing=n.letterSpacing;return legacy;
  }
  return {boxSizing:"border-box",position:root||!flow?"absolute":"relative",left:root||!flow?n.x:undefined,top:root||!flow?n.y:undefined,width:n.sizing==="fill"&&flow?undefined:n.sizing==="hug"&&flex?"max-content":n.width,height:n.sizing==="hug"&&flex?"max-content":n.height,flex:n.sizing==="fill"&&flow?"1 1 0":"0 0 auto",minWidth:0,transform:n.rotation?`rotate(${n.rotation}deg)`:undefined,background:n.fill,color:n.color,border:n.strokeWidth?`${n.strokeWidth}px solid ${n.stroke}`:undefined,borderRadius:n.type==="ellipse"?"50%":n.radius,opacity:n.opacity,fontSize:n.fontSize,fontWeight:n.fontWeight,fontFamily:n.fontFamily,letterSpacing:n.letterSpacing,lineHeight:n.lineHeight,textAlign:n.textAlign,padding:`${n.paddingTop}px ${n.paddingRight}px ${n.paddingBottom}px ${n.paddingLeft}px`,margin:root?undefined:`${n.marginTop}px ${n.marginRight}px ${n.marginBottom}px ${n.marginLeft}px`,display:n.visible===false?"none":flex?"flex":"block",flexDirection:flex?n.layout==="horizontal"?"row":"column":undefined,gap:flex?n.gap:undefined,alignItems:flex?n.align==="start"?"flex-start":n.align==="end"?"flex-end":n.align:undefined,justifyContent:flex?n.justify==="start"?"flex-start":n.justify==="end"?"flex-end":n.justify:undefined,overflow:n.clip?"hidden":undefined,whiteSpace:n.type==="text"?"pre-wrap":undefined};
}
export function reactComponentName(name) {
  const words=String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').match(/[A-Za-z0-9]+/g)||[];
  let result=words.map(w=>w[0].toUpperCase()+w.slice(1)).join('').slice(0,100);
  if(!result)return 'FreegmaDesign';
  if(/^[0-9]/.test(result))result='Component'+result;
  return result;
}
export function generateReact(document,rootId=null,name) {
  validateDocument(document);
  const exportNodes=rootId?subtree(document,rootId).nodes:document.nodes;
  const roots=exportNodes.filter(n=>!exportNodes.some(p=>p.id===n.parentId));
  const componentName=reactComponentName(name??(rootId?roots[0]?.name:null));
  let cssMode=false;
  const render=(n,parent,level)=>{const style=layerStyle(n,parent,roots.includes(n));if(roots.includes(n)){if(!n.cssOverrides?.left)style.left=rootId?0:n.x-minX;if(!n.cssOverrides?.top)style.top=rootId?0:n.y-minY;}
    const indent="  ".repeat(level),attrs=`data-freegma-id=${JSON.stringify(n.id)} `+(cssMode?`className="fg-${n.id}"`:`style={${JSON.stringify(style)}}`);
    if(n.type==="image")return `${indent}<img ${attrs} src={${JSON.stringify(n.src)}} alt={${JSON.stringify(n.name)}} />`;
    const children=exportNodes.filter(c=>c.parentId===n.id).map(c=>render(c,n,level+1)).join("\n");
    const text=n.type==="text"?`{${JSON.stringify(n.text)}}`:n.type==="vector"?`<svg width="100%" height="100%" viewBox={${JSON.stringify(n.viewBox.join(' '))}} preserveAspectRatio="none" role="img" aria-label={${JSON.stringify(n.name)}}>${n.paths.map(p=>`<path d={${JSON.stringify(p.d)}} fill={${JSON.stringify(p.fill)}} stroke={${JSON.stringify(p.stroke)}} strokeWidth={${p.strokeWidth}} opacity={${p.opacity}} strokeLinecap="round" strokeLinejoin="round" />`).join('')}</svg>`:n.type==="icon"?`<svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={${JSON.stringify(n.icon)}}><path d={${JSON.stringify(ICON_PATHS[n.icon])}} /></svg>`:"";
    return `${indent}<div ${attrs}>${text}${children?"\n"+children+"\n"+indent:""}</div>`;};
  const minX=Math.min(0,...roots.map(n=>rootId?0:n.x)),minY=Math.min(0,...roots.map(n=>rootId?0:n.y));
  const width=Math.max(1,...roots.map(n=>(rootId?0:n.x)+n.width))-minX,height=Math.max(1,...roots.map(n=>(rootId?0:n.y)+n.height))-minY;
  const buildCode=()=>`import React from "react";\n\n// Generated from Freegma ${VERSION}. Assets are served from Freegma /assets.\nexport default function ${componentName}() {\n  return (\n    <div style={{ position: "relative", width: ${width}, height: ${height} }}>\n${roots.map(n=>render(n,null,3)).join("\n")}\n    </div>\n  );\n}\n`;
  const code=buildCode();
  const cssFilename=`${componentName}.css`,css=cssForDocument(document,rootId).css;
  cssMode=true;
  const jsxCode=buildCode().replace('import React from "react";','import React from "react";\nimport "./'+cssFilename+'";');
  return {filename:`${componentName}.jsx`,code,jsxCode,css,cssFilename,nodeId:rootId,assets:[...new Set(exportNodes.filter(n=>n.type==="image"&&n.src).map(n=>n.src))]};
}
