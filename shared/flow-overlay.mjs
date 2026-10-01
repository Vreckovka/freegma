import {validateReference} from './flows.mjs';
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const identifier=value=>typeof value==='string'&&/^[\w-]{1,100}$/.test(value);
const fields=new Set(['id','fromFrameId','toFrameId','triggerId','action','title','explanation']);
export function belongsToFrame(nodes,id,frameId){
 const map=nodes instanceof Map?nodes:new Map(nodes.map(n=>[n.id,n]));let node=map.get(id),depth=0;
 while(node&&depth++<101){if(node.id===frameId)return true;node=map.get(node.parentId);}return false;
}
export function validateOverlay(overlay,nodes){
 if(!overlay||overlay.version!==1||Object.keys(overlay).some(k=>!['version','edges','frames'].includes(k))||!Array.isArray(overlay.edges)||overlay.edges.length>3000||overlay.frames!=null&&(!Array.isArray(overlay.frames)||overlay.frames.length>1000))fail('A flow layer needs version 1, at most 3,000 transitions and 1,000 frame references.');
 const map=new Map(nodes.map(n=>[n.id,n])),ids=new Set();
 const refs=new Map();for(const frame of overlay.frames||[]){
  if(!frame||!identifier(frame.id)||map.has(frame.id)||refs.has(frame.id)||Object.keys(frame).some(k=>!['id','reference','x','y','width','height'].includes(k))||['x','y','width','height'].some(k=>!Number.isFinite(frame[k])||Math.abs(frame[k])>100000)||frame.width<=0||frame.height<=0)fail('Invalid overlay frame reference.');validateReference(frame.reference);if(frame.reference.elementId)fail('Reference a complete frame.');refs.set(frame.id,frame);ids.add(frame.id);
 }
 for(const edge of overlay.edges){
  if(!edge||Object.keys(edge).some(k=>!fields.has(k))||!identifier(edge.id)||ids.has(edge.id))fail('Transition IDs must be unique identifiers.');ids.add(edge.id);
  if(!['straight','if','repeat'].includes(edge.action))fail('Choose a Straight, If or Repeat action.');
  if(typeof edge.title!=='string'||!edge.title.trim()||edge.title.length>160||typeof edge.explanation!=='string'||edge.explanation.length>10000)fail('Add a short transition title and a valid description.');
  if(!identifier(edge.fromFrameId)||!identifier(edge.toFrameId)||(map.get(edge.fromFrameId)?.type!=='frame'&&!refs.has(edge.fromFrameId))||(map.get(edge.toFrameId)?.type!=='frame'&&!refs.has(edge.toFrameId)))fail('Choose native or referenced source and target frames on this board.');
  if(edge.fromFrameId===edge.toFrameId&&edge.action!=='repeat')fail('A transition back to the same frame must use Repeat.');
  if(edge.triggerId!=null&&(!identifier(edge.triggerId)||!refs.has(edge.fromFrameId)&&!belongsToFrame(map,edge.triggerId,edge.fromFrameId)))fail('Trigger element must belong to the source frame.');
 }
 return overlay;
}
export function pruneOverlay(document){
 if(!document.flowOverlay)return document;
 const refs=new Set((document.flowOverlay.frames||[]).map(f=>f.id)),frames=new Set([...document.nodes.filter(n=>n.type==='frame').map(n=>n.id),...refs]),map=new Map(document.nodes.map(n=>[n.id,n]));
 document.flowOverlay.edges=document.flowOverlay.edges.filter(e=>frames.has(e.fromFrameId)&&frames.has(e.toFrameId)&&(!e.triggerId||refs.has(e.fromFrameId)||belongsToFrame(map,e.triggerId,e.fromFrameId)));
 return document;
}
export function applyOverlayOperations(input,operations){
 if(input.flow)fail('Flow layers belong to native design boards.');
 if(!Array.isArray(operations)||!operations.length||operations.length>1000)fail('Supply 1–1000 flow layer operations.');
 const doc=structuredClone(input),overlay=doc.flowOverlay||{version:1,edges:[]};doc.flowOverlay=overlay;
 for(const op of operations){
  if(op.op==='addFrame'){if(!op.frame)fail('Add a frame reference.');overlay.frames||=[];overlay.frames.push(structuredClone(op.frame));}
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
 if(loop){a={x:from.left+from.width,y:fy};d={x:fx,y:from.top+from.height};c={x:fx+from.width+100+lane*28,y:d.y+160+lane*28};b={x:c.x,y:fy};}
 else if(repeat){a={x:fx,y:from.top+from.height};d={x:tx,y:to.top+to.height};const bottom=Math.max(a.y,d.y)+160+lane*48;b={x:fx,y:bottom};c={x:tx,y:bottom};}
 else if(Math.abs(tx-fx)>=Math.abs(ty-fy)){
  const sign=tx>=fx?1:-1;a={x:fx+sign*from.width/2,y:fy};d={x:tx-sign*to.width/2,y:ty};const bend=Math.max(64,Math.abs(d.x-a.x)*.45);b={x:a.x+sign*bend,y:a.y+lane*48};c={x:d.x-sign*bend,y:d.y+lane*48};
 }else{const sign=ty>=fy?1:-1;a={x:fx,y:fy+sign*from.height/2};d={x:tx,y:ty-sign*to.height/2};const bend=Math.max(64,Math.abs(d.y-a.y)*.45);b={x:a.x+lane*48,y:a.y+sign*bend};c={x:d.x+lane*48,y:d.y-sign*bend};}
 const label={x:(a.x+3*b.x+3*c.x+d.x)/8,y:(a.y+3*b.y+3*c.y+d.y)/8};
 return {points:[a,b,c,d],label};
}
