import {validateReference} from './flows.mjs';
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const identifier=value=>typeof value==='string'&&/^[\w-]{1,100}$/.test(value);
export const TRANSITION_EVENTS=Object.freeze([
 {id:'click',label:'Click',icon:'click'},
 {id:'hover',label:'Hover',icon:'cursor'},
 {id:'double-click',label:'Double click',icon:'click'},
 {id:'key-press',label:'Key press',icon:'keyboard'},
 {id:'submit',label:'Submit',icon:'send'},
 {id:'change',label:'Value change',icon:'edit'},
 {id:'focus',label:'Focus',icon:'eye'},
 {id:'page-load',label:'Page load',icon:'frame'},
 {id:'state-change',label:'State change',icon:'state'},
 {id:'timer',label:'Timer',icon:'clock'}
].map(Object.freeze));
// Older files have no event. Infer a display label without rewriting their data.
export function transitionEvent(edge){return TRANSITION_EVENTS.find(e=>e.id===edge.event)||TRANSITION_EVENTS.find(e=>e.id===(edge.triggerId?'click':'state-change'));}
const fields=new Set(['id','fromFrameId','toFrameId','triggerId','event','action','title','explanation']);
export const FLOW_SYMBOLS=['start','decision','end'];
export function symbolBounds(symbol){const size=symbol.kind==='decision'?64:32;return {left:symbol.x,top:symbol.y,width:size,height:size};}
export function belongsToFrame(nodes,id,frameId){
 const map=nodes instanceof Map?nodes:new Map(nodes.map(n=>[n.id,n]));let node=map.get(id),depth=0;
 while(node&&depth++<101){if(node.id===frameId)return true;node=map.get(node.parentId);}return false;
}
export function validateOverlay(overlay,nodes){
 if(!overlay||overlay.version!==1||Object.keys(overlay).some(k=>!['version','edges','frames','symbols'].includes(k))||!Array.isArray(overlay.edges)||overlay.edges.length>3000||overlay.frames!=null&&(!Array.isArray(overlay.frames)||overlay.frames.length>1000)||overlay.symbols!=null&&(!Array.isArray(overlay.symbols)||overlay.symbols.length>1000))fail('A flow layer needs version 1, at most 3,000 transitions, 1,000 frame references and 1,000 symbols.');
 const map=new Map(nodes.map(n=>[n.id,n])),ids=new Set();
 const refs=new Map();for(const frame of overlay.frames||[]){
  if(!frame||!identifier(frame.id)||map.has(frame.id)||refs.has(frame.id)||Object.keys(frame).some(k=>!['id','reference','x','y','width','height'].includes(k))||['x','y','width','height'].some(k=>!Number.isFinite(frame[k])||Math.abs(frame[k])>100000)||frame.width<=0||frame.height<=0)fail('Invalid overlay frame reference.');validateReference(frame.reference);if(frame.reference.elementId)fail('Reference a complete frame.');refs.set(frame.id,frame);ids.add(frame.id);
 }
 const symbols=new Map();for(const symbol of overlay.symbols||[]){
  if(!symbol||!identifier(symbol.id)||map.has(symbol.id)||ids.has(symbol.id)||!FLOW_SYMBOLS.includes(symbol.kind)||Object.keys(symbol).some(k=>!['id','kind','title','explanation','x','y'].includes(k))||['x','y'].some(k=>!Number.isFinite(symbol[k])||Math.abs(symbol[k])>100000)||typeof symbol.title!=='string'||!symbol.title.trim()||symbol.title.length>160||typeof symbol.explanation!=='string'||symbol.explanation.length>10000)fail('Invalid flow symbol. Choose Start, Decision or End, a title and valid position.');symbols.set(symbol.id,symbol);ids.add(symbol.id);
 }
 for(const edge of overlay.edges){
  if(!edge||Object.keys(edge).some(k=>!fields.has(k))||!identifier(edge.id)||map.has(edge.id)||ids.has(edge.id))fail('Transition IDs must be unique identifiers.');ids.add(edge.id);
  if(!['straight','if','repeat'].includes(edge.action))fail('Choose a Straight, If or Repeat action.');
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
 document.flowOverlay.edges=document.flowOverlay.edges.filter(e=>frames.has(e.fromFrameId)&&frames.has(e.toFrameId)&&(!e.triggerId||refs.has(e.fromFrameId)||belongsToFrame(map,e.triggerId,e.fromFrameId)));
 return document;
}
export function applyOverlayOperations(input,operations){
 if(input.flow)fail('Flow layers belong to native design boards.');
 if(!Array.isArray(operations)||!operations.length||operations.length>1000)fail('Supply 1–1000 flow layer operations.');
 const doc=structuredClone(input),overlay=doc.flowOverlay||{version:1,edges:[]};doc.flowOverlay=overlay;
 for(const op of operations){
  if(op.op==='addSymbol'){if(!op.symbol)fail('Add a flow symbol.');overlay.symbols||=[];overlay.symbols.push(structuredClone(op.symbol));}
  else if(op.op==='updateSymbol'||op.op==='removeSymbol'){
   const i=overlay.symbols?.findIndex(s=>s.id===op.id)??-1;if(i<0)fail('Flow symbol not found.');
   if(op.op==='removeSymbol'){overlay.symbols.splice(i,1);overlay.edges=overlay.edges.filter(e=>e.fromFrameId!==op.id&&e.toFrameId!==op.id);}
   else{if(!op.patch||typeof op.patch!=='object'||Array.isArray(op.patch)||Object.keys(op.patch).some(k=>!['kind','title','explanation','x','y'].includes(k)))fail('Invalid flow symbol patch.');Object.assign(overlay.symbols[i],structuredClone(op.patch));}
  }
  else if(op.op==='addFrame'){if(!op.frame)fail('Add a frame reference.');overlay.frames||=[];overlay.frames.push(structuredClone(op.frame));}
  else if(op.op==='updateFrame'||op.op==='removeFrame'){
   const i=overlay.frames?.findIndex(f=>f.id===op.id)??-1;if(i<0)fail('Frame reference not found.');
   if(op.op==='removeFrame'){overlay.frames.splice(i,1);overlay.edges=overlay.edges.filter(e=>e.fromFrameId!==op.id&&e.toFrameId!==op.id);}
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

// World-space paths stay anchored to native frames; labels/popovers use viewport pixels.
export function overlayPath(from,to,{loop=false,repeat=false,lane=0}={}){
 let a,b,c,d;const fx=from.left+from.width/2,fy=from.top+from.height/2,tx=to.left+to.width/2,ty=to.top+to.height/2;
 if(loop||repeat){const sign=loop||tx>=fx?1:-1,bottom=Math.max(from.top+from.height,to.top+to.height)+96+lane*48,outside=sign>0?Math.max(from.left+from.width,to.left+to.width)+96+lane*48:Math.min(from.left,to.left)-96-lane*48;const points=[{x:fx,y:from.top+from.height},{x:fx,y:bottom},{x:outside,y:bottom},{x:outside,y:ty},{x:tx+sign*to.width/2,y:ty}];return {points,polyline:true,label:{x:(fx+outside)/2,y:bottom}};}
 else if(Math.abs(tx-fx)>=Math.abs(ty-fy)){
  const sign=tx>=fx?1:-1;a={x:fx+sign*from.width/2,y:fy};d={x:tx-sign*to.width/2,y:ty};const bend=Math.max(64,Math.abs(d.x-a.x)*.45);b={x:a.x+sign*bend,y:a.y+lane*48};c={x:d.x-sign*bend,y:d.y+lane*48};
 }else{const sign=ty>=fy?1:-1;a={x:fx,y:fy+sign*from.height/2};d={x:tx,y:ty-sign*to.height/2};const bend=Math.max(64,Math.abs(d.y-a.y)*.45);b={x:a.x+lane*48,y:a.y+sign*bend};c={x:d.x+lane*48,y:d.y-sign*bend};}
 const label={x:(a.x+3*b.x+3*c.x+d.x)/8,y:(a.y+3*b.y+3*c.y+d.y)/8};
 return {points:[a,b,c,d],label};
}

// Round the outside corners while preserving bottom departure and side arrival.
export function overlaySvgPath(geometry,convert=p=>p,radius=16){
 const points=geometry.points.map(convert),[a,b,c,d]=points;if(!geometry.polyline)return `M ${a.x} ${a.y} C ${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}`;
 let path=`M ${a.x} ${a.y}`;for(let i=1;i<points.length-1;i++){const p=points[i-1],q=points[i],r=points[i+1],before=Math.hypot(q.x-p.x,q.y-p.y),after=Math.hypot(r.x-q.x,r.y-q.y),bend=Math.min(radius,before/2,after/2);if(!before||!after){path+=` L ${q.x} ${q.y}`;continue;}const start={x:q.x+(p.x-q.x)*bend/before,y:q.y+(p.y-q.y)*bend/before},end={x:q.x+(r.x-q.x)*bend/after,y:q.y+(r.y-q.y)*bend/after};path+=` L ${start.x} ${start.y} Q ${q.x} ${q.y} ${end.x} ${end.y}`;}const last=points.at(-1);return path+` L ${last.x} ${last.y}`;
}

export function overlayLabelCandidates(geometry){
 if(geometry.polyline)return [geometry.label];
 const [a,b,c,d]=geometry.points;
 return [geometry.label,...[.35,.65,.25,.75].map(t=>{const u=1-t;return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};})];
}
