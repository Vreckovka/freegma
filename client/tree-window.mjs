// Layer rows have a fixed height. Keep full hierarchy data for navigation;
// mount only a small scroll window, plus the row currently holding focus.
export const TREE_ROW_HEIGHT=31;
export function treeTabStop(index,selectedId){return index.has(selectedId)?selectedId:index.keys().next().value;}
export function treeWindow(count,scrollTop,height,{rowHeight=TREE_ROW_HEIGHT,overscan=6,focusedIndex=-1}={}){
  const totalHeight=count*rowHeight,top=Math.max(0,Math.min(scrollTop,Math.max(0,totalHeight-height)));
  const start=Math.max(0,Math.floor(top/rowHeight)-overscan),end=Math.min(count,Math.ceil((top+height)/rowHeight)+overscan);
  const indices=Array.from({length:Math.max(0,end-start)},(_,i)=>start+i);
  if(focusedIndex>=0&&focusedIndex<count&&!indices.includes(focusedIndex))indices.push(focusedIndex);
  indices.sort((a,b)=>a-b);
  return {indices,totalHeight};
}
export function revealTreeRow(index,scrollTop,height,rowHeight=TREE_ROW_HEIGHT){
  const top=index*rowHeight,bottom=top+rowHeight;
  return Math.max(0,top<scrollTop?top:bottom>scrollTop+height?bottom-height:scrollTop);
}
