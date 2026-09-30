import {clone,descendants,subtree} from './design.mjs';
import {STUDIO_PALETTES} from './studio-designs.mjs';
// Match the native control families, not arbitrary user artwork. Preserve every
// node ID and visual property; only reference metadata is added to existing uses.
export function studioControlFamily(nodes,node){
  if(node.type!=='frame')return null;
  const children=nodes.filter(n=>n.parentId===node.id),types=children.map(n=>n.type).join('-');let family;
  if(node.name==='Task card'&&node.layout==='vertical'&&types.startsWith('text-text-frame'))family=children.length>3?'Preview card / Padding guides':'Preview card';
  else if(node.height===34&&node.layout==='horizontal'&&node.justify==='center'&&['text','icon-text'].includes(types)){
    // A card's internal action belongs to its card master. Avoid flattening a
    // second component reference inside that composite definition.
    if(nodes.some(n=>n.id===node.parentId&&n.name==='Task card'&&n.layout==='vertical'))return null;
    family='Button';
  }
  else if(node.height===32&&node.layout==='horizontal'&&node.name.endsWith(' field')&&types==='text-text')family='Property field';
  else if(node.name.endsWith(' board row')&&types==='icon-text')family='Board row';
  else if(node.name.endsWith(' layer row')&&['icon-text','icon-text-icon'].includes(types))family='Layer row';
  else if(node.name==='Drawing tools'&&children.length===8&&children.every(n=>n.type==='icon'))family='Drawing toolbar';
  else if(node.name==='Saved badge'&&types==='ellipse-text')family='Saved badge';
  else if(node.name==='Tab / active'&&types==='text-rectangle')family='Active tab';
  else return null;
  const role=node.colorBindings?.find(b=>b.path==='fill')?.token||Object.entries(STUDIO_PALETTES).flatMap(([,p])=>Object.entries(p)).find(([,value])=>value===node.fill)?.[0]||node.fill;
  const variant=role==='accent'?'Primary':role==='active'?'Selected':role==='field'?'Secondary':['panel','surface'].includes(role)?'Default':role;
  return `${family} / ${variant}${family==='Button'?(types==='icon-text'?' / With icon':' / Text'):(family==='Layer row'&&types==='icon-text-icon'?' / With action':'')}`;
}
const structural=new Set(['id','parentId','componentId','componentMasterId','sourceId','overrides']);
function equivalent(node,master,key){
  if(['fill','color','stroke'].includes(key)){
    const a=node.colorBindings?.find(b=>b.path===key),b=master.colorBindings?.find(b=>b.path===key);
    if(a&&b&&a.token===b.token)return true;
  }
  if(key==='colorBindings')return JSON.stringify((node[key]||[]).map(({path,token})=>({path,token})))===JSON.stringify((master[key]||[]).map(({path,token})=>({path,token})));
  return JSON.stringify(node[key])===JSON.stringify(master[key]);
}
export function studioComponentPlan(boards){
  const families=new Map(),uses=[];
  for(const board of boards)for(const node of board.document.nodes){
    const family=studioControlFamily(board.document.nodes,node);if(!family)continue;
    const nodes=subtree(board.document,node.id).nodes;
    if(!families.has(family)){
      const index=families.size,definition=clone(nodes),remap=new Map(definition.map((n,i)=>[n.id,`control_${index}_${i}`]));
      definition.forEach((n,i)=>{n.id=remap.get(n.id);n.parentId=i?remap.get(n.parentId):null;for(const key of ['componentId','componentMasterId','sourceId','overrides'])delete n[key];if(!i)Object.assign(n,{name:family,x:(index%3)*780+40,y:Math.floor(index/3)*320+90});});
      families.set(family,{name:family,nodes:definition});
    }
    uses.push({boardId:board.id,nodeId:node.id,family});
  }
  return {families:[...families.values()],uses};
}
export function linkStudioControls(board,uses,components){
  const doc=clone(board.document);
  for(const use of uses.filter(u=>u.boardId===board.id)){
    const c=components.get(use.family),nodes=subtree(doc,use.nodeId).nodes;
    if(nodes.length!==c.definition.nodes.length)throw Error('Control subtree changed during migration.');
    nodes.forEach((copy,i)=>{const node=doc.nodes.find(n=>n.id===copy.id),master=c.definition.nodes[i];
      node.sourceId=master.id;node.overrides=Object.keys(node).filter(k=>!structural.has(k)&&!(['x','y'].includes(k)&&i===0)&&!equivalent(node,master,k));
      delete node.componentMasterId;if(i===0)node.componentId=c.id;else delete node.componentId;
    });
  }
  return doc;
}
