const fail=message=>{throw Object.assign(new Error(message),{status:400});};
export function compactBoard(board,operations=[]){
 const doc=board.document||{};
 return {id:board.id,workspaceId:board.workspaceId,name:board.name,revision:board.revision,taskRef:board.taskRef,url:board.url,canUndo:board.canUndo,canRedo:board.canRedo,paletteRevision:board.palette?.revision,themeId:board.palette?.themeId,
  counts:{layers:doc.nodes?.length||0,flowSteps:doc.flow?.nodes.length||0,flowTransitions:doc.flow?.edges.length||0},
  operationTargets:[...new Set(operations.map(o=>o.id||o.node?.id||o.edge?.id||o.frame?.id||o.symbol?.id).filter(Boolean))]};
}
export function boardView(board,{view='summary',nodeId,offset=0,limit=50,expectedRevision}={}){
 if(!['summary','outline','nodes'].includes(view))fail('Choose summary, outline or nodes.');
 if(!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>200)fail('Use offset >= 0 and limit 1–200.');
 if(expectedRevision!==undefined&&board.revision!==expectedRevision)throw Object.assign(new Error('Board changed between pages; read again with its current revision.'),{status:409});
 const result=compactBoard(board);if(view==='summary'){if(nodeId||offset)fail('Use outline or nodes to inspect a layer.');return {...result,view};}
 const doc=board.document;let rows;
 if(doc.flow){
  const steps=doc.flow.nodes,edges=doc.flow.edges;
  if(nodeId&&!steps.some(n=>n.id===nodeId)&&!edges.some(n=>n.id===nodeId))fail('Flow element not found.');
  rows=[...steps.filter(n=>!nodeId||n.id===nodeId).map(value=>({collection:'flow.nodes',value})),...edges.filter(e=>!nodeId||e.id===nodeId||e.from===nodeId||e.to===nodeId).map(value=>({collection:'flow.edges',value}))];
 }else{
  let ids;if(nodeId){const children=new Map();for(const n of doc.nodes){if(!children.has(n.parentId))children.set(n.parentId,[]);children.get(n.parentId).push(n.id);}if(!doc.nodes.some(n=>n.id===nodeId))fail('Layer not found.');ids=new Set([nodeId]);const stack=[nodeId];while(stack.length)for(const id of children.get(stack.pop())||[])if(!ids.has(id)){ids.add(id);stack.push(id);}}
  rows=doc.nodes.filter(n=>!ids||ids.has(n.id)).map(value=>({collection:'nodes',value}));
 }
 const total=rows.length,nextOffset=offset+Math.min(limit,Math.max(0,total-offset)),items=rows.slice(offset,offset+limit);
 return {...result,view,scope:nodeId||null,page:{offset,limit,total,hasMore:nextOffset<total,nextOffset:nextOffset<total?nextOffset:null,revision:board.revision},items:view==='nodes'?items:items.map(({collection,value:n})=>({collection,value:{id:n.id,name:n.name||n.title,type:n.type||n.kind,parentId:n.parentId??null,...(n.from?{from:n.from,to:n.to}:{}),...(n.componentId?{componentId:n.componentId}:{}),...(n.componentMasterId?{componentMasterId:n.componentMasterId}:{}),...(n.reference?{reference:n.reference}:{})}}))};
}
