// Visibility is transient UI state; it never changes ports or the saved document.
export function connectorSelectionIds(ids,nodes,owners){
 const result=new Set(),available=new Set(owners.map(o=>o.id));
 for(const id of ids){let current=id;const visited=new Set();while(current&&!visited.has(current)){visited.add(current);if(available.has(current)){result.add(current);break;}current=nodes.get(current)?.parentId;}}
 return [...result];
}
export function contextualConnectorOwners(owners,{activeIds=[],hoveredId,focusedId,engagedId,sourceId,targetId,drafting=false}={}){
 const relevant=new Set(drafting?[sourceId,targetId]:[...activeIds,hoveredId,focusedId,engagedId]);
 return owners.filter(owner=>relevant.has(owner.id)&&owner.showPorts!==false);
}
