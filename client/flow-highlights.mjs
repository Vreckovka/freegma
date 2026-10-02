// Highlight only the linked endpoints and enclosing frames; keep ancestors visible.
export function flowEndpointIds(edge){
 if(!edge)return [];
 return [...new Set([edge.fromFrameId??edge.from,edge.triggerId??edge.trigger?.elementId,edge.toFrameId??edge.to].filter(Boolean))];
}
export function flowFrameHighlights(edge,ownerId){
 if(!edge)return [];
 const from=edge.fromFrameId??edge.from,to=edge.toFrameId??edge.to;
 return [...new Set([...(from===ownerId||to===ownerId?[ownerId]:[]),...(from===ownerId?[edge.triggerId??edge.trigger?.elementId]:[])].filter(Boolean))];
}
export function highlightLayers(nodes,ids){
 const map=nodes instanceof Map?nodes:new Map((nodes||[]).map(n=>[n.id,n])),highlighted=new Set(),path=new Set();
 for(const id of Array.isArray(ids)?ids:ids?[ids]:[]){
  let node=map.get(id);if(!node)continue;highlighted.add(id);
  const visited=new Set();
  while(node&&!visited.has(node.id)){
   visited.add(node.id);path.add(node.id);if(node.type==='frame')highlighted.add(node.id);node=map.get(node.parentId);
  }
 }
 return {highlighted,path};
}
