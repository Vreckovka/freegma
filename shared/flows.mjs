import {validateRoute} from './flow-route.mjs';
import {validatePorts,PORT_SIDES,updateAttachedPort} from './flow-ports.mjs';
import {TRANSITION_EVENTS} from './flow-events.mjs';
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const id=value=>typeof value==='string'&&/^[\w-]{1,100}$/.test(value);
const text=(value,max=200)=>typeof value==='string'&&value.length<=max;
export const FLOW_KINDS=['frame','if','repeat','end','start','decision'];
export const FLOW_ACTIONS=['straight','if','repeat'];
export const emptyFlow=()=>({version:1,nodes:[],flow:{version:1,nodes:[],edges:[]}});
export function validateReference(ref){if(!ref||Object.keys(ref).some(k=>!['workspaceId','boardId','frameId','elementId','name'].includes(k))||!['workspaceId','boardId','frameId'].every(k=>id(ref[k]))||ref.elementId!=null&&!id(ref.elementId)||ref.name!=null&&!text(ref.name))fail('Invalid frame or element reference.');return ref;}
export function validateFlow(flow){
 if(!flow||flow.version!==1||!Array.isArray(flow.nodes)||!Array.isArray(flow.edges)||flow.nodes.length>1000||flow.edges.length>3000||Object.keys(flow).some(k=>!['version','nodes','edges'].includes(k)))fail('A flow needs at most 1,000 steps and 3,000 transitions.');
 const ids=new Set(),nodes=new Map();
 for(const n of flow.nodes){if(!n||!id(n.id)||ids.has(n.id)||!FLOW_KINDS.includes(n.kind)||!text(n.title)||!n.title.trim()||!text(n.explanation,10000)||!Number.isFinite(n.x)||!Number.isFinite(n.y)||Math.abs(n.x)>100000||Math.abs(n.y)>100000||Object.keys(n).some(k=>!['id','kind','title','explanation','x','y','reference','display','width','height','ports'].includes(k)))fail('Invalid flow step.');validatePorts(n.ports);if(n.kind==='frame'){validateReference(n.reference);if(n.display!==undefined&&!['card','live'].includes(n.display))fail('Choose Context card or Live frame.');for(const key of ['width','height'])if(n[key]!==undefined&&(!Number.isFinite(n[key])||n[key]<=0||n[key]>100000))fail('Invalid live frame dimensions.');}else if(n.reference!=null||n.display!==undefined||n.width!==undefined||n.height!==undefined)fail('Only frame steps can reference designs.');ids.add(n.id);nodes.set(n.id,n);}
 for(const e of flow.edges){if(!e||!id(e.id)||ids.has(e.id)||!nodes.has(e.from)||!nodes.has(e.to)||nodes.get(e.from).kind==='end'||nodes.get(e.to).kind==='start'||!FLOW_ACTIONS.includes(e.action)||!text(e.title)||!text(e.explanation,10000)||Object.keys(e).some(k=>!['id','from','to','action','title','explanation','trigger','route','event','fromPort','toPort'].includes(k)))fail('Invalid flow transition. End states have no outgoing transitions.');validateRoute(e.route);if(e.event!==undefined&&!TRANSITION_EVENTS.some(v=>v.id===e.event))fail('Choose a valid trigger event.');for(const key of ['fromPort','toPort'])if(e[key]!==undefined&&!PORT_SIDES.includes(e[key]))fail('Invalid transition connector.');if(e.from===e.to&&e.action!=='repeat')fail('Self loops must use Repeat.');if(e.trigger!=null){validateReference(e.trigger);const ref=nodes.get(e.from).reference;if(!ref||!e.trigger.elementId||['workspaceId','boardId','frameId'].some(k=>ref[k]!==e.trigger[k]))fail('A trigger must belong to the transition’s source frame.');}ids.add(e.id);}
 return flow;
}
export function applyFlowOperations(input,operations){
 if(!Array.isArray(operations)||!operations.length||operations.length>1000)fail('Supply 1–1,000 flow operations.');
 const doc=structuredClone(input);if(!doc.flow)fail('Open a Flows board first.');
 const find=(items,id)=>{const item=items.find(n=>n.id===id);if(!item)fail('Flow item not found.');return item;};
 for(const op of operations){
  if(op.op==='addNode')doc.flow.nodes.push(structuredClone(op.node));
  else if(op.op==='addEdge')doc.flow.edges.push(structuredClone(op.edge));
  else if(op.op==='setPort'){const node=find(doc.flow.nodes,op.id);if(!PORT_SIDES.includes(op.port))fail('Invalid connector port.');validatePorts({[op.port]:op.anchor});node.ports={...node.ports,[op.port]:structuredClone(op.anchor)};updateAttachedPort(doc.flow.edges,op.id,op.port,op.anchor);}
  else if(op.op==='updateNode'){if(!op.patch||Object.keys(op.patch).some(k=>!['title','explanation','x','y','reference','display','width','height','ports'].includes(k)))fail('Invalid flow step patch.');Object.assign(find(doc.flow.nodes,op.id),structuredClone(op.patch));if(Object.hasOwn(op.patch,'reference'))for(const e of doc.flow.edges.filter(e=>e.from===op.id))delete e.trigger;}
  else if(op.op==='updateEdge'){if(!op.patch||Object.keys(op.patch).some(k=>!['from','to','action','title','explanation','trigger','route','event','fromPort','toPort'].includes(k)))fail('Invalid transition patch.');const edge=find(doc.flow.edges,op.id);if(Object.hasOwn(op.patch,'from')&&op.patch.from!==edge.from)delete edge.trigger;Object.assign(edge,structuredClone(op.patch));if(edge.trigger===null)delete edge.trigger;}
  else if(op.op==='removeNode'){find(doc.flow.nodes,op.id);doc.flow.nodes=doc.flow.nodes.filter(n=>n.id!==op.id);doc.flow.edges=doc.flow.edges.filter(e=>e.from!==op.id&&e.to!==op.id);}
  else if(op.op==='removeEdge'){find(doc.flow.edges,op.id);doc.flow.edges=doc.flow.edges.filter(e=>e.id!==op.id);}
  else fail('Unknown flow operation.');
 }
 validateFlow(doc.flow);return doc;
}
export function flowLink(ref){return `/w/${ref.workspaceId}/b/${ref.boardId}?node=${ref.elementId||ref.frameId}`;}
