import {flowStepPath} from '../shared/flow-route.mjs';
import {routeForPorts} from '../shared/flow-ports.mjs';

// Bound to one editor. Exact input identities invalidate the last calculation;
// hover, popovers and selection without a route preview do not change geometry.
export function createFlowRoutingCache(){
 let previous=null,indexedNodes=null,nodeIndex=null;
 return (nodes,edges,selected=null,preview=null)=>{
  const routePreview=preview||null,routeSelected=routePreview?selected:null;
  if(previous&&previous.nodes===nodes&&previous.edges===edges&&previous.selected===routeSelected&&previous.preview===routePreview)return previous.paths;
  if(indexedNodes!==nodes){nodeIndex=new Map(nodes.map(n=>[n.id,n]));indexedNodes=nodes;}
  const paths=edges.map(e=>{const a=nodeIndex.get(e.from),b=nodeIndex.get(e.to);return a&&b?flowStepPath(a,b,{...e,route:e.id===routeSelected&&routePreview?routePreview:routeForPorts(e,a.ports,b.ports)}):null;}).filter(Boolean);
  previous={nodes,edges,selected:routeSelected,preview:routePreview,paths};return paths;
 };
}
