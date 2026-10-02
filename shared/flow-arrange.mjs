// Geometry only: no artwork, themes, source files or database state enter ELK.
// Keep this policy separate so routing rules can evolve without editor changes.
export const ARRANGE_POLICY={version:1,lane:120,approach:120,gutter:560,row:360,caption:96};
import {layoutQuality} from './flow-layout-quality.mjs';
import {routeReturn} from './flow-return-route.mjs';
const round=v=>Math.round(v*1000)/1000;
const sideName={left:'WEST',right:'EAST',top:'NORTH',bottom:'SOUTH'};
const point=(node,side,offset)=>({x:side==='left'?node.insetX:side==='right'?node.insetX+node.width:node.insetX+node.width*offset,y:side==='top'?node.insetY:side==='bottom'?node.insetY+node.height:node.insetY+node.height*offset});
export async function arrangeGraph(input,elk){
 const nodes=[...input.nodes].sort((a,b)=>a.id.localeCompare(b.id)),edges=[...input.edges].sort((a,b)=>a.id.localeCompare(b.id));
 const map=new Map(nodes.map(n=>[n.id,n])),attachments=new Map(nodes.map(n=>[n.id,{}]));
 const ranks=new Map(),indegree=new Map(nodes.map(n=>[n.id,0]));for(const e of edges.filter(e=>e.action!=='repeat'))indegree.set(e.to,indegree.get(e.to)+1);const queue=nodes.filter(n=>!indegree.get(n.id)).map(n=>n.id);for(const id of queue){ranks.set(id,ranks.get(id)||0);for(const e of edges.filter(e=>e.action!=='repeat'&&e.from===id)){ranks.set(e.to,Math.max(ranks.get(e.to)||0,ranks.get(id)+1));indegree.set(e.to,indegree.get(e.to)-1);if(!indegree.get(e.to))queue.push(e.to);}}
 const specs=edges.map(e=>{const repeat=e.action==='repeat'||e.from===e.to;return {...e,fromSide:repeat?'bottom':'right',toSide:repeat&&(ranks.get(e.from)||0)>=(ranks.get(e.to)||0)?'right':'left'};});
 for(const e of specs)for(const [id,side,key] of [[e.from,e.fromSide,e.id+'_from'],[e.to,e.toSide,e.id+'_to']]){const sides=attachments.get(id);(sides[side]||=[]).push(key);}
 const anchors=new Map();
 const children=nodes.map(n=>({id:n.id,width:n.boxWidth,height:n.boxHeight,layoutOptions:{'elk.portConstraints':'FIXED_POS'},ports:Object.entries(attachments.get(n.id)).flatMap(([side,ids])=>ids.map((id,i)=>{const offset=(i+1)/(ids.length+1);anchors.set(id,{side,offset});return {id,width:0,height:0,...point(n,side,offset),layoutOptions:{'elk.port.side':sideName[side]}};}))}));
 const graph={id:'root',layoutOptions:{'elk.algorithm':'layered','elk.direction':'RIGHT','elk.edgeRouting':'ORTHOGONAL','elk.randomSeed':'1','elk.padding':'[top=80,left=80,bottom=80,right=80]','elk.spacing.nodeNode':String(ARRANGE_POLICY.row),'elk.layered.spacing.nodeNodeBetweenLayers':String(ARRANGE_POLICY.gutter),'elk.spacing.edgeEdge':String(ARRANGE_POLICY.lane),'elk.layered.spacing.edgeEdgeBetweenLayers':String(ARRANGE_POLICY.lane),'elk.spacing.edgeNode':String(ARRANGE_POLICY.approach),'elk.layered.spacing.edgeNodeBetweenLayers':String(ARRANGE_POLICY.approach),'elk.spacing.labelNode':'40','elk.spacing.edgeLabel':'24','elk.layered.edgeLabels.sideSelection':'ALWAYS_UP','elk.layered.mergeEdges':'false','elk.layered.mergeHierarchyEdges':'false','elk.layered.nodePlacement.bk.edgeStraightening':'IMPROVE_STRAIGHTNESS'},children,edges:specs.map(e=>({id:e.id,sources:[e.id+'_from'],targets:[e.id+'_to'],labels:[{id:e.id+'_label',text:e.title,width:e.labelWidth,height:40,layoutOptions:{'elk.edgeLabels.placement':'CENTER'}}]}))};
 graph.edges=graph.edges.filter(e=>edges.find(s=>s.id===e.id).action!=='repeat');
 graph.layoutOptions['elk.layered.spacing.nodeNodeBetweenLayers']=String(ARRANGE_POLICY.gutter/2);
 if(nodes.length>24){graph.layoutOptions['elk.layered.wrapping.strategy']='MULTI_EDGE';graph.layoutOptions['elk.aspectRatio']='1.6';graph.layoutOptions['elk.layered.spacing.nodeNodeBetweenLayers']=String(ARRANGE_POLICY.gutter);for(const e of graph.edges)e.labels=[];}
 const result=await elk.layout(graph),positions=new Map(result.children.map(n=>[n.id,n]));
 const shift={x:input.origin.x-Math.min(...result.children.map(n=>n.x)),y:input.origin.y-Math.min(...result.children.map(n=>n.y))};
 const positioned=nodes.map(n=>{const p=positions.get(n.id);return {id:n.id,x:round(p.x+n.insetX+shift.x),y:round(p.y+n.insetY+shift.y)};});
 const routes=(result.edges||[]).map(e=>{if(e.sections?.length!==1)throw Error('The router could not produce one continuous connection.');const section=e.sections[0],points=[section.startPoint,...section.bendPoints||[],section.endPoint].map(p=>({x:round(p.x+shift.x),y:round(p.y+shift.y)}));
  // Snap floating-point roundoff only. Do not silently straighten a diagonal.
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(Math.abs(a.x-b.x)<.01)b.x=a.x;else if(Math.abs(a.y-b.y)<.01)b.y=a.y;else throw Error('The router returned a non-orthogonal segment.');}
  const pivots=points.slice(1,-1);if(pivots.length>32)throw Error('This flow needs more than 32 bends on a connection. Split it into smaller flows.');
  // Aligned runs still need a polyline so repeat rendering cannot invent a loop.
  if(!pivots.length)pivots.push({x:round((points[0].x+points.at(-1).x)/2),y:round((points[0].y+points.at(-1).y)/2)});
  let label=e.labels?.[0];if(!label){const spans=points.slice(1).map((p,i)=>({a:points[i],b:p,length:Math.abs(p.x-points[i].x)})).filter(s=>s.a.y===s.b.y).sort((a,b)=>b.length-a.length),span=spans[0];if(!span)throw Error('No clear horizontal run for a transition label.');label={x:(span.a.x+span.b.x)/2-shift.x-150,y:span.a.y-shift.y-56,width:300,height:40};}
  const route={from:anchors.get(e.id+'_from'),to:anchors.get(e.id+'_to'),pivots,label:{x:round(label.x+label.width/2+shift.x),y:round(label.y+(input.type==='flow'?label.height/2+12:label.height+6)+shift.y)}};
  const original=edges.find(s=>s.id===e.id);return {id:e.id,from:original.from,to:original.to,route,points,labelBox:{x:label.x+shift.x,y:label.y+shift.y,width:label.width,height:label.height}};});
 const bodies=positioned.map(n=>({...n,width:map.get(n.id).width,height:map.get(n.id).height})),placed=new Map(bodies.map(n=>[n.id,n]));
 for(const e of specs.filter(e=>e.action==='repeat').sort((a,b)=>placed.get(a.from).y-placed.get(b.from).y||placed.get(a.from).x-placed.get(b.from).x||a.id.localeCompare(b.id))){const from=placed.get(e.from),to=placed.get(e.to),a=point({...from,insetX:from.x,insetY:from.y},e.fromSide,anchors.get(e.id+'_from').offset),b=point({...to,insetX:to.x,insetY:to.y},e.toSide,anchors.get(e.id+'_to').offset);let points=routeReturn(a,b,bodies,routes,ARRANGE_POLICY.lane);
  let labelBox;for(let attempt=0;attempt<2&&!labelBox;attempt++){if(attempt)points=routeReturn(a,b,bodies,routes,ARRANGE_POLICY.lane,{labelWidth:e.labelWidth,forceLabel:true});const spans=points.slice(1).map((p,i)=>({a:points[i],b:p,length:Math.abs(p.x-points[i].x)})).filter(s=>near(s.a.y,s.b.y)).sort((a,b)=>b.length-a.length);
  for(const span of spans){if(span.length<e.labelWidth+40)continue;for(const t of [.5,.35,.65]){const box={x:span.a.x+(span.b.x-span.a.x)*t-e.labelWidth/2,y:span.a.y-56,width:e.labelWidth,height:40};const overlaps=r=>box.x<r.x+r.width+12&&box.x+box.width+12>r.x&&box.y<r.y+r.height+12&&box.y+box.height+12>r.y;if(!bodies.some(overlaps)&&!routes.some(r=>overlaps(r.labelBox))){labelBox=box;break;}}if(labelBox)break;}}if(!labelBox)throw Error('No clear horizontal run for a return label. Split this flow into smaller boards.');
  const route={from:anchors.get(e.id+'_from'),to:anchors.get(e.id+'_to'),pivots:points.slice(1,-1),label:{x:labelBox.x+labelBox.width/2,y:labelBox.y+(input.type==='flow'?32:46)}};if(route.pivots.length>32)throw Error('This return needs too many bends. Split the flow into smaller boards.');routes.push({id:e.id,from:e.from,to:e.to,route,points,labelBox});
 }
 const quality=layoutQuality(bodies,routes);
 if(quality.sharedRuns||quality.touching||quality.artworkHits||quality.labelOverlaps)throw Error('The layout could not keep every route and label separate. The original board is unchanged. Split this busy flow into smaller boards.');
 const plan={policyVersion:ARRANGE_POLICY.version,nodes:positioned,edges:routes,width:result.width,height:result.height,quality};
 if([...positioned,...routes.flatMap(e=>[...e.points,e.route.label])].some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>100000||Math.abs(p.y)>100000))throw Error('This layout exceeds the canvas limits. Split it into smaller flows.');
 return plan;
}
const near=(a,b)=>Math.abs(a-b)<.02;

