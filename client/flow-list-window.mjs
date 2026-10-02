export function flowListLayout(items,subtitle){
 let top=0;const index=new Map();const rows=items.map((item,i)=>{const height=subtitle(item)?56:39,row={item,top,height};index.set(item.id,i);top+=height;return row;});return {rows,index,totalHeight:top};
}
export function flowListWindow(layout,top,height,focusedId=null,overscan=6){
 const {rows,totalHeight,index}=layout,indices=[];
 if(rows.length&&top+height>=0&&top<=totalHeight){
  const firstAfter=p=>{let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].top+rows[mid].height<=p)lo=mid+1;else hi=mid;}return lo;};
  const start=Math.max(0,firstAfter(Math.max(0,top))-overscan),end=Math.min(rows.length,firstAfter(Math.min(totalHeight,top+height))+1+overscan);
  for(let i=start;i<end;i++)indices.push(i);
 }
 const focused=index.get(focusedId);if(focused!==undefined&&!indices.includes(focused))indices.push(focused);
 return indices.sort((a,b)=>a-b);
}
export function flowListScrollDelta(row,top,height){return row.top<top?row.top-top:row.top+row.height>top+height?row.top+row.height-top-height:0;}
