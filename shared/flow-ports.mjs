import {flowAnchor,nearestFlowAnchor} from './flow-route.mjs';
export const PORT_SIDES=['top','right','bottom','left'];
const fail=m=>{throw Object.assign(Error(m),{status:400});};
export function validatePorts(ports){
 if(ports==null)return;
 if(!ports||typeof ports!=='object'||Array.isArray(ports)||Object.keys(ports).some(k=>!PORT_SIDES.includes(k)))fail('Invalid connector ports.');
 for(const a of Object.values(ports))if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).some(k=>!['side','offset'].includes(k))||!PORT_SIDES.includes(a.side)||!Number.isFinite(a.offset)||a.offset<0||a.offset>1)fail('A connector needs an edge and an offset between 0 and 1.');
}
export function portAnchor(owner,key){return owner.ports?.[key]||{side:key,offset:.5};}
export function portPoint(owner,key){return flowAnchor(owner.bounds,portAnchor(owner,key));}
export function routeForPorts(edge,fromPorts,toPorts){
 const route={...edge.route};
 if(edge.fromPort&&!route.from)route.from=fromPorts?.[edge.fromPort]||{side:edge.fromPort,offset:.5};
 if(edge.toPort&&!route.to)route.to=toPorts?.[edge.toPort]||{side:edge.toPort,offset:.5};
 return Object.keys(route).length?route:undefined;
}
export function connectorDrop(owners,sourceId,point,tolerance=16){
 const source=owners.find(n=>n.id===sourceId);if(!source)return {kind:'cancel'};
 const anchor=nearestFlowAnchor(source.bounds,point),p=flowAnchor(source.bounds,anchor);
 // The source edge wins over nested controls within the hit tolerance.
 if(Math.hypot(p.x-point.x,p.y-point.y)<=tolerance)return {kind:'move',anchor};
 const hits=owners.filter(n=>n.id!==sourceId&&n.canTarget!==false&&point.x>=n.bounds.left-tolerance&&point.y>=n.bounds.top-tolerance&&point.x<=n.bounds.left+n.bounds.width+tolerance&&point.y<=n.bounds.top+n.bounds.height+tolerance).sort((a,b)=>a.bounds.width*a.bounds.height-b.bounds.width*b.bounds.height);
 if(hits.length)return {kind:'connect',target:hits[0],anchor:nearestFlowAnchor(hits[0].bounds,point)};
 return {kind:'pending',point};
}
export function updateAttachedPort(edges,ownerId,key,anchor,overlay=false){
 const from=overlay?'fromFrameId':'from',to=overlay?'toFrameId':'to';
 for(const e of edges){if(e[from]===ownerId&&e.fromPort===key)e.route={...e.route,from:structuredClone(anchor)};if(e[to]===ownerId&&e.toPort===key)e.route={...e.route,to:structuredClone(anchor)};}
}
