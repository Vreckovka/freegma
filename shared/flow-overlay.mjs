import {validateRoute} from './flow-route.mjs';
export {validateRoute,flowAnchor,nearestFlowAnchor,draggedFlowRoute,overlayPath,overlaySvgPath,overlayLabelCandidates} from './flow-route.mjs';
import {validateReference} from './flows.mjs';
import {validatePorts,PORT_SIDES,updateAttachedPort} from './flow-ports.mjs';
export {TRANSITION_EVENTS,transitionEvent} from './flow-events.mjs';
import {TRANSITION_EVENTS} from './flow-events.mjs';
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const identifier=value=>typeof value==='string'&&/^[\w-]{1,100}$/.test(value);
const fields=new Set(['id','fromFrameId','toFrameId','triggerId','event','action','title','explanation','route','fromPort','toPort']);
export const FLOW_SYMBOLS=['start','decision','repeat','end'];
export function symbolBounds(symbol){const size=['decision','repeat'].includes(symbol.kind)?64:32;return {left:symbol.x,top:symbol.y,width:size,height:size};}
export function belongsToFrame(nodes,id,frameId){
 const map=nodes instanceof Map?nodes:new Map(nodes.map(n=>[n.id,n]));let node=map.get(id),depth=0;
 while(node&&depth++<101){if(node.id===frameId)return true;node=map.get(node.parentId);}return false;
}
export function validateOverlay(overlay,nodes){
 if(!overlay||overlay.version!==1||Object.keys(overlay).some(k=>!['version','edges','frames','symbols','ports'].includes(k))||!Array.isArray(overlay.edges)||overlay.edges.length>3000||overlay.frames!=null&&(!Array.isArray(overlay.frames)||overlay.frames.length>1000)||overlay.symbols!=null&&(!Array.isArray(overlay.symbols)||overlay.symbols.length>1000))fail('A flow layer needs version 1, at most 3,000 transitions, 1,000 frame references and 1,000 symbols.');
 const map=new Map(nodes.map(n=>[n.id,n])),ids=new Set();
 const refs=new Map();for(const frame of overlay.frames||[]){
  if(!frame||!identifier(frame.id)||map.has(frame.id)||refs.has(frame.id)||Object.keys(frame).some(k=>!['id','reference','x','y','width','height'].includes(k))||['x','y','width','height'].some(k=>!Number.isFinite(frame[k])||Math.abs(frame[k])>100000)||frame.width<=0||frame.height<=0)fail('Invalid overlay frame reference.');validateReference(frame.reference);if(frame.reference.elementId)fail('Reference a complete frame.');refs.set(frame.id,frame);ids.add(frame.id);
 }
 const symbols=new Map();for(const symbol of overlay.symbols||[]){
  if(!symbol||!identifier(symbol.id)||map.has(symbol.id)||ids.has(symbol.id)||!FLOW_SYMBOLS.includes(symbol.kind)||Object.keys(symbol).some(k=>!['id','kind','title','explanation','x','y'].includes(k))||['x','y'].some(k=>!Number.isFinite(symbol[k])||Math.abs(symbol[k])>100000)||typeof symbol.title!=='string'||!symbol.title.trim()||symbol.title.length>160||typeof symbol.explanation!=='string'||symbol.explanation.length>10000)fail('Invalid flow symbol. Choose Start, Decision or End, a title and valid position.');symbols.set(symbol.id,symbol);ids.add(symbol.id);
 }
 if(overlay.ports!==undefined){if(!overlay.ports||typeof overlay.ports!=='object'||Array.isArray(overlay.ports)||Object.keys(overlay.ports).length>3000)fail('Invalid flow connectors.');for(const [owner,ports] of Object.entries(overlay.ports)){if(map.get(owner)?.type!=='frame'&&!refs.has(owner)&&!symbols.has(owner))fail('Connector owner must be a frame or flow symbol.');validatePorts(ports);}}
 for(const edge of overlay.edges){
  if(!edge||Object.keys(edge).some(k=>!fields.has(k))||!identifier(edge.id)||map.has(edge.id)||ids.has(edge.id))fail('Transition IDs must be unique identifiers.');ids.add(edge.id);
  if(!['straight','if','repeat'].includes(edge.action))fail('Choose a Straight, If or Repeat action.');
  validateRoute(edge.route);for(const key of ['fromPort','toPort'])if(edge[key]!==undefined&&!PORT_SIDES.includes(edge[key]))fail('Invalid transition connector.');
  if(edge.event!==undefined&&!TRANSITION_EVENTS.some(e=>e.id===edge.event))fail('Choose a valid trigger event.');
  if(typeof edge.title!=='string'||!edge.title.trim()||edge.title.length>160||typeof edge.explanation!=='string'||edge.explanation.length>10000)fail('Add a short transition title and a valid description.');
  if(!identifier(edge.fromFrameId)||!identifier(edge.toFrameId)||(map.get(edge.fromFrameId)?.type!=='frame'&&!refs.has(edge.fromFrameId)&&!symbols.has(edge.fromFrameId))||(map.get(edge.toFrameId)?.type!=='frame'&&!refs.has(edge.toFrameId)&&!symbols.has(edge.toFrameId)))fail('Choose native frames, references or flow symbols on this board.');
  if(symbols.get(edge.fromFrameId)?.kind==='end'||symbols.get(edge.toFrameId)?.kind==='start')fail('Start has no incoming transitions; End has no outgoing transitions.');
  if(edge.fromFrameId===edge.toFrameId&&edge.action!=='repeat')fail('A transition back to the same frame must use Repeat.');
  if(edge.triggerId!=null&&(!identifier(edge.triggerId)||symbols.has(edge.fromFrameId)||!refs.has(edge.fromFrameId)&&!belongsToFrame(map,edge.triggerId,edge.fromFrameId)))fail('Trigger element must belong to the source frame.');
 }
 return overlay;
}
export function pruneOverlay(document){
 if(!document.flowOverlay)return document;
 const refs=new Set((document.flowOverlay.frames||[]).map(f=>f.id)),frames=new Set([...document.nodes.filter(n=>n.type==='frame').map(n=>n.id),...refs,...(document.flowOverlay.symbols||[]).map(s=>s.id)]),map=new Map(document.nodes.map(n=>[n.id,n]));
 if(document.flowOverlay.ports)for(const id of Object.keys(document.flowOverlay.ports))if(!frames.has(id))delete document.flowOverlay.ports[id];
 document.flowOverlay.edges=document.flowOverlay.edges.filter(e=>frames.has(e.fromFrameId)&&frames.has(e.toFrameId)&&(!e.triggerId||refs.has(e.fromFrameId)||belongsToFrame(map,e.triggerId,e.fromFrameId)));
 return document;
}
export function applyOverlayOperations(input,operations){
 if(input.flow)fail('Flow layers belong to native design boards.');
 if(!Array.isArray(operations)||!operations.length||operations.length>1000)fail('Supply 1–1000 flow layer operations.');
 const doc=structuredClone(input),overlay=doc.flowOverlay||{version:1,edges:[]};doc.flowOverlay=overlay;
 for(const op of operations){
  if(op.op==='setPort'){if(!PORT_SIDES.includes(op.port))fail('Invalid connector port.');validatePorts({[op.port]:op.anchor});overlay.ports||={};overlay.ports[op.id]={...overlay.ports[op.id],[op.port]:structuredClone(op.anchor)};updateAttachedPort(overlay.edges,op.id,op.port,op.anchor,true);}
  else if(op.op==='addSymbol'){if(!op.symbol)fail('Add a flow symbol.');overlay.symbols||=[];overlay.symbols.push(structuredClone(op.symbol));}
  else if(op.op==='updateSymbol'||op.op==='removeSymbol'){
   const i=overlay.symbols?.findIndex(s=>s.id===op.id)??-1;if(i<0)fail('Flow symbol not found.');
   if(op.op==='removeSymbol'){overlay.symbols.splice(i,1);if(overlay.ports)delete overlay.ports[op.id];overlay.edges=overlay.edges.filter(e=>e.fromFrameId!==op.id&&e.toFrameId!==op.id);}
   else{if(!op.patch||typeof op.patch!=='object'||Array.isArray(op.patch)||Object.keys(op.patch).some(k=>!['kind','title','explanation','x','y'].includes(k)))fail('Invalid flow symbol patch.');Object.assign(overlay.symbols[i],structuredClone(op.patch));}
  }
  else if(op.op==='addFrame'){if(!op.frame)fail('Add a frame reference.');overlay.frames||=[];overlay.frames.push(structuredClone(op.frame));}
  else if(op.op==='updateFrame'||op.op==='removeFrame'){
   const i=overlay.frames?.findIndex(f=>f.id===op.id)??-1;if(i<0)fail('Frame reference not found.');
   if(op.op==='removeFrame'){overlay.frames.splice(i,1);if(overlay.ports)delete overlay.ports[op.id];overlay.edges=overlay.edges.filter(e=>e.fromFrameId!==op.id&&e.toFrameId!==op.id);}
   else{if(!op.patch||typeof op.patch!=='object'||Array.isArray(op.patch)||Object.keys(op.patch).some(k=>!['reference','x','y','width','height'].includes(k)))fail('Invalid frame reference patch.');Object.assign(overlay.frames[i],structuredClone(op.patch));}
  }
  else if(op.op==='addEdge'){if(!op.edge)fail('Add an edge object.');overlay.edges.push(structuredClone(op.edge));}
  else if(op.op==='updateEdge'||op.op==='removeEdge'){
   const i=overlay.edges.findIndex(e=>e.id===op.id);if(i<0)fail('Transition not found.');
   if(op.op==='removeEdge')overlay.edges.splice(i,1);
   else{if(!op.patch||typeof op.patch!=='object'||Array.isArray(op.patch)||Object.keys(op.patch).some(k=>k==='id'||!fields.has(k)))fail('Invalid transition patch.');Object.assign(overlay.edges[i],structuredClone(op.patch));}
  }else fail('Unknown flow layer operation.');
 }
 validateOverlay(overlay,doc.nodes);return doc;
}
