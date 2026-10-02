import {Worker} from 'node:worker_threads';
import {flowStepBounds} from '../shared/flow-route.mjs';
import {symbolBounds} from '../shared/flow-overlay.mjs';
import {instanceContext} from '../shared/instance-locks.mjs';
import {ARRANGE_POLICY} from '../shared/flow-arrange.mjs';
import {clearCssForPatch} from '../shared/css.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const labelWidth=e=>Math.min(300,Math.max(100,(e.title.length+20)*7));
const bounds=(n,map)=>{let x=n.x,y=n.y,parent=map.get(n.parentId);while(parent){x+=parent.x;y+=parent.y;parent=map.get(parent.parentId);}return {left:x,top:y,width:n.width,height:n.height};};
const overlap=(a,b,gap=0)=>a.left<aRight(b)+gap&&aRight(a)+gap>b.left&&a.top<b.top+b.height+gap&&a.top+a.height+gap>b.top;
const aRight=a=>a.left+a.width;
export function flowGraph(document,{referenceSizes=new Map()}={}){
 const type=document.flow?'flow':'overlay',layer=document.flow||document.flowOverlay;if(!layer)fail('Enable a flow layer and add frames or transitions first.');
 const edges=layer.edges.map(e=>({id:e.id,from:e.from||e.fromFrameId,to:e.to||e.toFrameId,title:e.title,action:e.action,labelWidth:labelWidth(e)})),needed=new Set(edges.flatMap(e=>[e.from,e.to])),native=new Map(document.nodes.map(n=>[n.id,n]));
 const frames=document.flow?document.flow.nodes:[...document.nodes.filter(n=>needed.has(n.id)),...layer.frames||[],...layer.symbols||[]];
 if(!frames.length)fail('Add some flow frames or symbols first.');if(frames.length>1000)fail('Arrange at most 1,000 frames or symbols at once.');
 const nodes=frames.map(n=>{const b=type==='flow'?flowStepBounds(n):n.kind?symbolBounds(n):native.has(n.id)?bounds(n,native):{left:n.x,top:n.y,width:n.width,height:n.height},size=referenceSizes.get(n.id)||b;return {id:n.id,x:b.left,y:b.top,width:size.width,height:size.height,insetX:0,insetY:32,boxWidth:size.width,boxHeight:size.height+72};});
 const map=new Map(nodes.map(n=>[n.id,n])),captions=[];
 const ancestors=new Set();
 for(const n of frames.filter(n=>native.has(n.id))){let p=native.get(n.parentId);while(p){ancestors.add(p.id);if(needed.has(p.id))fail('A connected frame contains another connected frame. Arrange their flows separately or use live references.');if(p.componentMasterId)fail('Arrange the whole main component or use a live reference; its internal layout stays unchanged.');if(p.layout!=='free'||p.rotation||p.clip)fail('Frames inside automatic, clipped or rotated layouts must be arranged as live flow references.');p=native.get(p.parentId);}const context=instanceContext(document.nodes,n.id);if(context&&context.node.id!==n.id)fail('Arrange the whole component instance or use a live reference; its internal layout remains locked.');if(n.rotation)fail('Rotated frames must be arranged as live flow references.');}
 // Nearby sibling captions travel with exactly one frame. Contents never move separately.
 if(type==='overlay')for(const caption of document.nodes.filter(n=>n.type==='text'&&!needed.has(n.id))){const b=bounds(caption,native),candidates=frames.filter(f=>native.has(f.id)&&f.parentId===caption.parentId).map(f=>({f,b:bounds(f,native)})).filter(({b:a})=>b.top+b.height<=a.top+2&&a.top-b.top-b.height<=ARRANGE_POLICY.caption&&Math.min(aRight(a),aRight(b))-Math.max(a.left,b.left)>Math.min(a.width,b.width)*.5).sort((a,c)=>(a.b.top-b.top-b.height)-(c.b.top-b.top-b.height)||a.f.id.localeCompare(c.f.id));
  if(candidates.length){const f=candidates[0],node=map.get(f.f.id),context=instanceContext(document.nodes,caption.id);if(context)continue;const top=f.b.top-b.top,nodeLeft=Math.min(0,b.left-f.b.left),right=Math.max(node.width,b.left+b.width-f.b.left);node.insetY=Math.max(node.insetY,top+32);node.insetX=Math.max(node.insetX,-nodeLeft);node.boxWidth=Math.max(node.boxWidth,right-nodeLeft);node.boxHeight=Math.max(node.boxHeight,node.height+node.insetY+40);captions.push({id:caption.id,frameId:f.f.id});}}
 const moving=new Set([...nodes.map(n=>n.id),...captions.map(n=>n.id)]);
 const obstacles=type==='overlay'?document.nodes.filter(n=>!n.parentId&&!moving.has(n.id)&&!ancestors.has(n.id)&&n.visible!==false).map(n=>bounds(n,native)):[];
 return {type,nodes,edges,captions,obstacles,origin:{x:Math.min(...nodes.map(n=>n.x-n.insetX)),y:Math.min(...nodes.map(n=>n.y-n.insetY))}};
}
let active=0;
export function computeFlowLayout(graph,{timeout=30000}={}){
 if(active>=2)return Promise.reject(Object.assign(Error('Two layouts are already running. Try again shortly.'),{status:429}));
 active++;return new Promise((resolve,reject)=>{let worker,timer,finished=false;const finish=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);active--;worker?.terminate();error?reject(error):resolve(value);};
 try{worker=new Worker(new URL('./arrange-worker.mjs',import.meta.url),{workerData:graph,resourceLimits:{maxOldGenerationSizeMb:256}});timer=setTimeout(()=>finish(Object.assign(Error('Layout exceeded 30 seconds. Split this flow into smaller boards.'),{status:408})),timeout);worker.once('message',result=>result.error?finish(Error(result.error)):finish(null,result.plan));worker.once('error',finish);worker.once('exit',code=>{if(!finished)finish(Error('Layout worker exited before producing a result ('+code+').'));});}catch(e){finish(e);}
 });
}
export function applyLayout(document,graph,plan){
 const doc=structuredClone(document),layer=doc.flow||doc.flowOverlay,map=new Map(doc.nodes.map(n=>[n.id,n])),prior=new Map(graph.nodes.map(n=>[n.id,n])),positions=new Map(plan.nodes.map(n=>[n.id,n]));
 const corners=plan.nodes.flatMap(n=>{const old=prior.get(n.id);return [{x:n.x-old.insetX,y:n.y-old.insetY},{x:n.x-old.insetX+old.boxWidth,y:n.y-old.insetY+old.boxHeight}];});for(const e of plan.edges)corners.push(...e.points,{x:e.labelBox.x,y:e.labelBox.y},{x:e.labelBox.x+e.labelBox.width,y:e.labelBox.y+e.labelBox.height});const left=Math.min(...corners.map(p=>p.x)),top=Math.min(...corners.map(p=>p.y));const envelope={left,top,width:Math.max(...corners.map(p=>p.x))-left,height:Math.max(...corners.map(p=>p.y))-top};
 // Leave unrelated artwork untouched. Move the whole arranged group into a clear bay.
 const shift=graph.obstacles.some(b=>overlap(envelope,b,120))?Math.max(...graph.obstacles.map(aRight))+120-envelope.left:0;
 for(const p of plan.nodes)p.x+=shift;for(const e of plan.edges){for(const p of e.route.pivots)p.x+=shift;e.route.label.x+=shift;}
 const updates=[];
 function moveNative(id,dx,dy){const n=map.get(id);if(!dx&&!dy)return;const context=instanceContext(doc.nodes,id);if(context){if(n.componentId)n.instancePlacement||={x:n.x,y:n.y,parentId:n.parentId};n.overrides=[...new Set([...n.overrides||[],...(dx?['x']:[]),...(dy?['y']:[])])];}const patch={...(dx?{x:n.x+dx}:{}),...(dy?{y:n.y+dy}:{})};clearCssForPatch(n,patch);Object.assign(n,patch);updates.push(id);}
 for(const p of plan.nodes){const old=prior.get(p.id),dx=p.x-old.x,dy=p.y-old.y;if(map.has(p.id))moveNative(p.id,dx,dy);else{const n=(doc.flow?.nodes||[...layer.frames||[],...layer.symbols||[]]).find(n=>n.id===p.id);n.x=p.x;n.y=p.y;if(n.reference&&(graph.type==='overlay'||n.display==='live')){n.width=old.width;n.height=old.height;}}}
 for(const caption of graph.captions){const p=positions.get(caption.frameId),old=prior.get(caption.frameId);moveNative(caption.id,p.x-old.x,p.y-old.y);}
 const routes=new Map(plan.edges.map(e=>[e.id,e.route]));for(const e of layer.edges){e.route=routes.get(e.id);delete e.fromPort;delete e.toPort;}
 const extent=plan.nodes.flatMap(p=>{const n=prior.get(p.id);return [{x:p.x-n.insetX,y:p.y-n.insetY},{x:p.x-n.insetX+n.boxWidth,y:p.y-n.insetY+n.boxHeight}];});for(const e of plan.edges)extent.push(...e.route.pivots,{x:e.route.label.x-150,y:e.route.label.y-60},{x:e.route.label.x+150,y:e.route.label.y+40});const boundsLeft=Math.min(...extent.map(p=>p.x)),boundsTop=Math.min(...extent.map(p=>p.y)),right=Math.max(...extent.map(p=>p.x)),bottom=Math.max(...extent.map(p=>p.y));
 return {document:doc,summary:{algorithm:'elk-layered',policyVersion:plan.policyVersion,frames:plan.nodes.length,connections:plan.edges.length,captions:graph.captions.length,positionOverrides:updates.filter(id=>map.get(id).componentId).length,quality:plan.quality,bounds:{x:boundsLeft,y:boundsTop,width:right-boundsLeft,height:bottom-boundsTop}}};
}
export const arrangeStoreMethods={
 async arrangeFlow(id,revision){
  // No SQLite transaction is held while the worker computes. A second revision
  // check rejects concurrent user edits rather than overwriting them.
  const before=this.getBoard(id);this.expect(before,revision);const referenceSizes=new Map(),sources=new Map();
  const references=before.document.flow?before.document.flow.nodes.filter(n=>n.kind==='frame'&&n.display==='live'):before.document.flowOverlay?.frames||[];
  for(const n of references){const ref=n.reference;let source=sources.get(ref.boardId);if(!source){source=this.readBoard(ref.boardId,false);sources.set(ref.boardId,source);}const root=source.document.nodes.find(f=>f.id===ref.frameId&&f.type==='frame');if(source.workspaceId!==ref.workspaceId||!root)fail('A live source frame is missing. Restore its reference before arranging.',404);referenceSizes.set(n.id,{width:root.width,height:root.height});}
  const graph=flowGraph(before.document,{referenceSizes}),plan=await computeFlowLayout(graph);
  return this.transaction(()=>{const current=this.getBoard(id);this.expect(current,revision);if(JSON.stringify(current.document)!==JSON.stringify(before.document))fail('The board file changed during layout. Try again.',409);for(const [sourceId,source] of sources){const latest=this.readBoard(sourceId,false);if(latest.revision!==source.revision||JSON.stringify(latest.document)!==JSON.stringify(source.document))fail('A live source changed during layout. Try again.',409);}const applied=applyLayout(current.document,graph,plan),board=this.writeBoard(current,applied.document,'Auto arrange flow');return {...board,arrangement:applied.summary};});
 }
};
