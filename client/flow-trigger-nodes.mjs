import {belongsToFrame} from '../shared/flow-overlay.mjs';
// Source choices are needed only while editing a transition.
export function flowTriggerNodes(nodes,map,frameId,externalSource,sourceElements){
 if(!frameId)return [];
 if(externalSource)return sourceElements;
 return nodes.filter(node=>node.id!==frameId&&belongsToFrame(map,node.id,frameId));
}
