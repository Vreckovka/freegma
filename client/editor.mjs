// Editor navigation and measured geometry stay separate from the saved scene model.
export function ancestors(nodes,id){
  const map=new Map(nodes.map(n=>[n.id,n])),result=[];let node=map.get(id);
  while(node?.parentId){node=map.get(node.parentId);if(!node)break;result.push(node);}
  return result;
}
export function visibleLayers(nodes,collapsed=new Set(),query=''){
  const children=new Map(),map=new Map(nodes.map(n=>[n.id,n])),matches=new Set(),search=query.trim().toLowerCase();
  for(const n of nodes){const key=n.parentId||null;if(!children.has(key))children.set(key,[]);children.get(key).push(n);}
  if(search)for(const n of nodes)if(n.name.toLowerCase().includes(search)){let current=n;while(current&&!matches.has(current.id)){matches.add(current.id);current=map.get(current.parentId);}}
  const rows=[];
  function visit(parent=null,depth=0){for(const node of children.get(parent)||[]){if(search&&!matches.has(node.id))continue;rows.push({node,depth,hasChildren:children.has(node.id)});if(search||!collapsed.has(node.id))visit(node.id,depth+1);}}
  visit();return rows;
}
export function treeNavigation(rows,id,key,collapsed){
  const index=rows.findIndex(r=>r.node.id===id),row=rows[index];if(!row)return null;
  if(key==='Home')return {id:rows[0].node.id};
  if(key==='End')return {id:rows.at(-1).node.id};
  if(key==='ArrowDown'||key==='ArrowUp')return {id:rows[Math.max(0,Math.min(rows.length-1,index+(key==='ArrowDown'?1:-1)))].node.id};
  if(key==='ArrowRight'&&row.hasChildren)return collapsed.has(id)?{expand:id}:{id:rows[index+1]?.node.id||id};
  if(key==='ArrowLeft')return row.hasChildren&&!collapsed.has(id)?{collapse:id}:row.node.parentId?{id:row.node.parentId}:null;
  return null;
}
export function viewportForBounds(bounds,size,current,{fit=false,padding=60}={}){
  const zoom=fit?Math.max(.05,Math.min(2,(size.width-padding*2)/Math.max(1,bounds.width),(size.height-padding*2)/Math.max(1,bounds.height))):current.zoom;
  return {zoom,x:size.width/2-(bounds.left+bounds.width/2)*zoom,y:size.height/2-(bounds.top+bounds.height/2)*zoom};
}
export function spacingGuides(node,bounds,children=[]){
  const {left,top,width,height}=bounds,border=node.strokeWidth||0,w=Math.max(0,width-border*2),h=Math.max(0,height-border*2),p={Top:Math.min(h,Math.max(0,node.paddingTop)),Right:Math.min(w,Math.max(0,node.paddingRight)),Bottom:Math.min(h,Math.max(0,node.paddingBottom)),Left:Math.min(w,Math.max(0,node.paddingLeft))};
  const strips={Top:{left:left+border,top:top+border,width:w,height:p.Top},Bottom:{left:left+border,top:top+height-border-p.Bottom,width:w,height:p.Bottom},Left:{left:left+border,top:top+border+p.Top,width:p.Left,height:Math.max(0,h-p.Top-p.Bottom)},Right:{left:left+width-border-p.Right,top:top+border+p.Top,width:p.Right,height:Math.max(0,h-p.Top-p.Bottom)}};
  const result=Object.entries(strips).filter(([,r])=>r.width>0&&r.height>0).map(([side,r])=>({...r,kind:'padding',field:'Padding '+side.toLowerCase(),label:String(node['padding'+side])}));
  if(node.layout==='free')return result;
  const horizontal=node.layout==='horizontal',ordered=[...children].sort((a,b)=>horizontal?a.left-b.left:a.top-b.top);
  for(let i=1;i<ordered.length;i++){
    const a=ordered[i-1],b=ordered[i],start=horizontal?a.left+a.width:a.top+a.height,end=horizontal?b.left:b.top,length=end-start;
    if(length<=.5)continue;
    const crossStart=Math.max(horizontal?a.top:a.left,horizontal?b.top:b.left),crossEnd=Math.min(horizontal?a.top+a.height:a.left+a.width,horizontal?b.top+b.height:b.left+b.width);
    if(crossEnd<=crossStart)continue;
    result.push({kind:'gap',field:'Gap',label:String(Math.round(length*10)/10),...(horizontal?{left:start,top:crossStart,width:length,height:crossEnd-crossStart}:{left:crossStart,top:start,width:crossEnd-crossStart,height:length})});
  }
  return result;
}
export function colorForPicker(value) {
 const hex=String(value).match(/^#([\da-f]{3,8})$/i);
 if(hex&&[3,4,6,8].includes(hex[1].length)){const raw=hex[1];return '#'+(raw.length<5?[...raw.slice(0,3)].map(c=>c+c).join(''):raw.slice(0,6));}
 const rgb=String(value).match(/^rgba?\(([^)]+)\)$/i);
 const pack=channels=>'#'+channels.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
 if(rgb){const channels=rgb[1].split(',').slice(0,3).map(v=>parseFloat(v)*(v.includes('%')?2.55:1));if(channels.length===3&&channels.every(Number.isFinite))return pack(channels);}
 const hsl=String(value).match(/^hsla?\(([^)]+)\)$/i);
 if(hsl){const [h,s,l]=hsl[1].split(',').map(parseFloat);if([h,s,l].every(Number.isFinite)){const hue=(h%360+360)%360/30,a=s/100*Math.min(l/100,1-l/100);return pack([0,8,4].map(n=>{const k=(n+hue)%12;return 255*(l/100-a*Math.max(-1,Math.min(k-3,9-k,1)));}));}}
 return '#000000';
}

export function workspaceTrail(workspaces,id){return [...ancestors(workspaces,id)].reverse().concat(workspaces.find(w=>w.id===id)||[]);}
export function workspaceRows(workspaces,collapsed=new Set()){return visibleLayers(workspaces.map(w=>({...w,parentId:w.parentId||null})),collapsed);}
export function workspaceParentOptions(workspaces,id){return workspaces.filter(w=>w.id!==id&&!ancestors(workspaces,w.id).some(a=>a.id===id));}
