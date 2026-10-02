// A cubic stays inside the hull of its controls; rounded polylines stay inside
// the hull of their vertices. Bounds are deliberately conservative.
export function createFlowViewportFilter(){
 const bounds=new WeakMap();
 return (paths,viewport,size,keep=[],screenLabels=false)=>{
  const retained=new Set(keep.filter(Boolean)),z=viewport.zoom,x=viewport.x,y=viewport.y;
  const intersects=(left,top,right,bottom,pad=32*Math.max(1,z))=>right>=-pad&&bottom>=-pad&&left<=size.width+pad&&top<=size.height+pad;
  const routes=[],labels=[];
  for(const path of paths){
   const {geometry,edge}=path,always=retained.has(edge.id);let b=bounds.get(geometry);
   if(!b){const xs=geometry.points.map(p=>p.x),ys=geometry.points.map(p=>p.y);b={left:Math.min(...xs),right:Math.max(...xs),top:Math.min(...ys),bottom:Math.max(...ys)};bounds.set(geometry,b);}
   if(always||intersects(b.left*z+x,b.top*z+y,b.right*z+x,b.bottom*z+y))routes.push(path);
   const point=screenLabels?path.label:geometry.label,scale=screenLabels?1:z;
   const cx=screenLabels?point.x:point.x*z+x,cy=screenLabels?point.y:point.y*z+y;
   // Labels are not clipped; leave room for long titles, the event icon/text,
   // and the transform that places them above the line.
   const halfWidth=(256+(edge.title||'').length*24)*scale/2,height=100*scale;
   if(always||intersects(cx-halfWidth,cy-height,cx+halfWidth,cy+height))labels.push(path);
  }
  return {routes,labels};
 };
}
