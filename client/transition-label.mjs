import {transitionEvent} from '../shared/flow-events.mjs';
// Existing transition dialogs preview their draft without mutating saved data.
// Cancel restores the original; Save submits one atomic transition update.
export function previewTransition(edges,draft){
 return draft&&edges.some(edge=>edge.id===draft.id)?edges.map(edge=>edge.id===draft.id?{...edge,...draft}:edge):edges;
}
export function transitionLabel(edge){
 const title=edge.title?.trim()||'',plain=edge.action==='none',event=transitionEvent(edge);
 return {title,event:!plain&&event.id!=='none'?event:null,action:!plain&&edge.action!=='straight'?(edge.action==='if'?'If':'Repeat'):'',visible:!!title||!plain&&(event.id!=='none'||edge.action!=='straight')};
}
