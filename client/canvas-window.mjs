export function indexCanvas(nodes=[]){
  const children=new Map(),roots=[];
  for(const n of nodes){if(!n.parentId)roots.push(n);else{if(!children.has(n.parentId))children.set(n.parentId,[]);children.get(n.parentId).push(n);}}
  const bounds=new Map(),owners=new Map();
  function visit(n,root,x,y,clipped=false){
    owners.set(n.id,root.id);const left=x+n.x,top=y+n.y;
    if(!clipped){const b=bounds.get(root.id),angle=(n.rotation||0)*Math.PI/180,w=Math.abs(n.width*Math.cos(angle))+Math.abs(n.height*Math.sin(angle)),h=Math.abs(n.height*Math.cos(angle))+Math.abs(n.width*Math.sin(angle));
      b.left=Math.min(b.left,left+(n.width-w)/2);b.top=Math.min(b.top,top+(n.height-h)/2);b.right=Math.max(b.right,left+(n.width+w)/2);b.bottom=Math.max(b.bottom,top+(n.height+h)/2);
      // Dynamic CSS and unbounded auto-layout need the DOM to measure their extent.
      if((n.rotation&&children.has(n.id)&&!n.clip)||Object.keys(n.cssOverrides||{}).length||(!n.clip&&(n.layout!=='free'||n.widthSizing==='hug'||n.heightSizing==='hug')))b.unbounded=true;
    }
    for(const child of children.get(n.id)||[])visit(child,root,left,top,clipped||n.clip);
  }
  for(const root of roots){bounds.set(root.id,{left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity});visit(root,root,0,0);}
  return {roots,children,bounds,owners};
}
export function visibleCanvasRoots(index,viewport,size,pinned=[],overscan=160){
  if(!size.width||!size.height)return index.roots;
  const keep=new Set(pinned.map(id=>index.owners.get(id))),z=viewport.zoom||1,left=(-viewport.x-overscan)/z,top=(-viewport.y-overscan)/z,right=(size.width-viewport.x+overscan)/z,bottom=(size.height-viewport.y+overscan)/z;
  return index.roots.filter(n=>{const b=index.bounds.get(n.id);return keep.has(n.id)||b.unbounded||(b.right>=left&&b.left<=right&&b.bottom>=top&&b.top<=bottom);});
}
