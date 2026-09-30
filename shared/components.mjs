// Resolve a selected sublayer to its nearest instance or main component.
export function componentContext(nodes,nodeId){
  const map=new Map(nodes.map(n=>[n.id,n]));let node=map.get(nodeId);
  while(node){if(node.componentId||node.componentMasterId)return {node,id:node.componentId||node.componentMasterId,kind:node.componentId?'instance':'master'};node=map.get(node.parentId);}
  return null;
}
