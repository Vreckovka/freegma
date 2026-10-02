const fail=message=>{throw Object.assign(new Error(message),{status:400});};
export function validateRoute(route){
 if(route==null)return;
 const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
 const point=p=>object(p)&&Object.keys(p).length===2&&['x','y'].every(k=>Number.isFinite(p[k])&&Math.abs(p[k])<=100000);
 if(!object(route)||Object.keys(route).some(k=>!['from','to','controls','via','pivots','label'].includes(k)))fail('Invalid arrow route.');
 if(route.label!==undefined&&!point(route.label))fail('An arrow label needs a bounded position.');
 for(const key of ['from','to'])if(route[key]!==undefined){const a=route[key];if(!object(a)||Object.keys(a).some(k=>!['side','offset'].includes(k))||!['top','right','bottom','left'].includes(a.side)||!Number.isFinite(a.offset)||a.offset<0||a.offset>1)fail('An arrow anchor needs a side and an offset between 0 and 1.');}
 if(route.controls!==undefined&&(!Array.isArray(route.controls)||route.controls.length!==2||!route.controls.every(point)))fail('A curve needs two bounded control offsets.');
 if(route.via!==undefined&&!point(route.via))fail('A repeat route needs a bounded outside point.');
 if(route.pivots!==undefined&&(!Array.isArray(route.pivots)||route.pivots.length>32||!route.pivots.every(point)))fail('An arrow supports up to 32 bounded pivot points.');
}
export function flowAnchor(bounds,anchor,fallback){
 if(!anchor)return fallback;
 const {left,top,width,height}=bounds,{side,offset}=anchor;
 return {x:side==='left'?left:side==='right'?left+width:left+width*offset,y:side==='top'?top:side==='bottom'?top+height:top+height*offset};
}
export function nearestFlowAnchor(bounds,p){
 const clamp=v=>Math.max(0,Math.min(1,v)),horizontal=clamp((p.x-bounds.left)/bounds.width),vertical=clamp((p.y-bounds.top)/bounds.height);
 return [{side:'top',offset:horizontal},{side:'right',offset:vertical},{side:'bottom',offset:horizontal},{side:'left',offset:vertical}].sort((a,b)=>{const ap=flowAnchor(bounds,a),bp=flowAnchor(bounds,b);return Math.hypot(ap.x-p.x,ap.y-p.y)-Math.hypot(bp.x-p.x,bp.y-p.y);})[0];
}
// Curve offsets follow their endpoint when a referenced frame moves or resizes.
export function draggedFlowRoute(geometry,route,handle,point,from,to){
 const next=structuredClone(route||{}),points=geometry.points;
 delete next.label;
 if(handle==='from'||handle==='to')next[handle]=nearestFlowAnchor(handle==='from'?from:to,point);
 else if(handle.startsWith('pivot_')){const i=Number(handle.slice(6));if(!Number.isInteger(i)||!next.pivots?.[i])fail('Pivot point not found.');next.pivots[i]={x:point.x,y:point.y};}
 else if(handle==='via')next.via={x:point.x,y:point.y};
 else {const [a,b,c,d]=points;next.controls||=[{x:b.x-a.x,y:b.y-a.y},{x:c.x-d.x,y:c.y-d.y}];const i=handle==='control1'?0:1,anchor=i?d:a;next.controls[i]={x:point.x-anchor.x,y:point.y-anchor.y};}
 validateRoute(next);return next;
}
export function addFlowPivot(geometry,route){
 const next=structuredClone(route||{}),points=geometry.points;
 delete next.label;
 if(!next.pivots?.length){if(geometry.polyline){next.pivots=points.slice(1,-1).map(p=>({...p}));next.via||={...points[2]};}else {const [a,b,c,d]=points;next.controls||=[{x:b.x-a.x,y:b.y-a.y},{x:c.x-d.x,y:c.y-d.y}];next.pivots=[{...geometry.label}];validateRoute(next);return next;}}
 if(next.pivots.length>=32)fail('An arrow supports up to 32 pivot points.');
 const path=[points[0],...next.pivots,points.at(-1)];let segment=0,length=-1;
 for(let i=0;i<path.length-1;i++){const distance=Math.hypot(path[i+1].x-path[i].x,path[i+1].y-path[i].y);if(distance>length){length=distance;segment=i;}}
 next.pivots.splice(segment,0,{x:(path[segment].x+path[segment+1].x)/2,y:(path[segment].y+path[segment+1].y)/2});validateRoute(next);return next;
}
export function removeFlowPivot(route,index){
 const next=structuredClone(route||{});if(!Number.isInteger(index)||!next.pivots?.[index])fail('Pivot point not found.');delete next.label;next.pivots.splice(index,1);if(!next.pivots.length)delete next.pivots;validateRoute(next);return next;
}
export function translatedFlowRoute(geometry,route,dx,dy){
 const next=structuredClone(route||{});
 if(next.label)next.label={x:next.label.x+dx,y:next.label.y+dy};
 if(next.pivots?.length)next.pivots=next.pivots.map(p=>({x:p.x+dx,y:p.y+dy}));
 else if(geometry.polyline)next.via={x:geometry.points[2].x+dx,y:geometry.points[2].y+dy};
 else {const [a,b,c,d]=geometry.points,controls=next.controls||[{x:b.x-a.x,y:b.y-a.y},{x:c.x-d.x,y:c.y-d.y}];next.controls=controls.map(p=>({x:p.x+dx,y:p.y+dy}));}
 validateRoute(next);return next;
}
function withPivots(geometry,route){
 if(!route?.pivots?.length)return route?.label?{...geometry,label:route.label}:geometry;
 const points=[geometry.points[0],...route.pivots,geometry.points.at(-1)];let longest=0,index=0;for(let i=0;i<points.length-1;i++){const length=Math.hypot(points[i+1].x-points[i].x,points[i+1].y-points[i].y);if(length>longest){longest=length;index=i;}}
 return {points,polyline:true,pivots:true,label:route?.label||{x:(points[index].x+points[index+1].x)/2,y:(points[index].y+points[index+1].y)/2}};
}
// World-space paths stay anchored to native frames; labels/popovers use viewport pixels.
export function overlayPath(from,to,{loop=false,repeat=false,lane=0,route,horizontal=false}={}){
 let a,b,c,d;const fx=from.left+from.width/2,fy=from.top+from.height/2,tx=to.left+to.width/2,ty=to.top+to.height/2;
 if(loop||repeat){const sign=loop||tx>=fx?1:-1,bottom=route?.via?.y??Math.max(from.top+from.height,to.top+to.height)+96+lane*48,outside=route?.via?.x??(sign>0?Math.max(from.left+from.width,to.left+to.width)+96+lane*48:Math.min(from.left,to.left)-96-lane*48),start=flowAnchor(from,route?.from,{x:fx,y:from.top+from.height}),end=flowAnchor(to,route?.to,{x:tx+sign*to.width/2,y:ty});const points=[start,{x:start.x,y:bottom},{x:outside,y:bottom},{x:outside,y:end.y},end];return withPivots({points,polyline:true,label:{x:(start.x+outside)/2,y:bottom}},route);}
 else if(horizontal||Math.abs(tx-fx)>=Math.abs(ty-fy)){
  const sign=tx>=fx?1:-1;a={x:fx+sign*from.width/2,y:fy};d={x:tx-sign*to.width/2,y:ty};const bend=Math.max(64,Math.abs(d.x-a.x)*.45);b={x:a.x+sign*bend,y:a.y+lane*48};c={x:d.x-sign*bend,y:d.y+lane*48};
 }else{const sign=ty>=fy?1:-1;a={x:fx,y:fy+sign*from.height/2};d={x:tx,y:ty-sign*to.height/2};const bend=Math.max(64,Math.abs(d.y-a.y)*.45);b={x:a.x+lane*48,y:a.y+sign*bend};c={x:d.x+lane*48,y:d.y-sign*bend};}
 const start=flowAnchor(from,route?.from,a),end=flowAnchor(to,route?.to,d);
 b=route?.controls?{x:start.x+route.controls[0].x,y:start.y+route.controls[0].y}:{x:b.x+start.x-a.x,y:b.y+start.y-a.y};
 c=route?.controls?{x:end.x+route.controls[1].x,y:end.y+route.controls[1].y}:{x:c.x+end.x-d.x,y:c.y+end.y-d.y};a=start;d=end;
 const label={x:(a.x+3*b.x+3*c.x+d.x)/8,y:(a.y+3*b.y+3*c.y+d.y)/8};
 return withPivots({points:[a,b,c,d],label},route);
}

export function flowStepBounds(step){const live=step.kind==='frame'&&step.display==='live',symbol=['start','decision','end'].includes(step.kind),size=step.kind==='decision'?64:32;return {left:step.x,top:step.y,width:live?step.width||240:symbol?size:240,height:live?step.height||260:symbol?size:step.kind==='frame'?260:170};}
export function flowStepPath(from,to,edge){
 const a=flowStepBounds(from),b=flowStepBounds(to),repeat=edge.action==='repeat'||from.id===to.id||b.left<a.left+a.width;
 const route=repeat?edge.route:{from:{side:'right',offset:.5},to:{side:'left',offset:.5},...edge.route};
 return {edge,from:a,to:b,geometry:overlayPath(a,b,{repeat,loop:from.id===to.id,route,horizontal:true})};
}

// Round the outside corners while preserving bottom departure and side arrival.
export function overlaySvgPath(geometry,convert=p=>p,radius=16){
 const points=geometry.points.map(convert),[a,b,c,d]=points;if(!geometry.polyline)return `M ${a.x} ${a.y} C ${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}`;
 let path=`M ${a.x} ${a.y}`;for(let i=1;i<points.length-1;i++){const p=points[i-1],q=points[i],r=points[i+1],before=Math.hypot(q.x-p.x,q.y-p.y),after=Math.hypot(r.x-q.x,r.y-q.y),bend=Math.min(radius,before/2,after/2);if(!before||!after){path+=` L ${q.x} ${q.y}`;continue;}const start={x:q.x+(p.x-q.x)*bend/before,y:q.y+(p.y-q.y)*bend/before},end={x:q.x+(r.x-q.x)*bend/after,y:q.y+(r.y-q.y)*bend/after};path+=` L ${start.x} ${start.y} Q ${q.x} ${q.y} ${end.x} ${end.y}`;}const last=points.at(-1);return path+` L ${last.x} ${last.y}`;
}

export function overlayLabelCandidates(geometry){
 if(geometry.polyline)return [geometry.label];
 const [a,b,c,d]=geometry.points;
 return [geometry.label,...[.35,.65,.25,.75].map(t=>{const u=1-t;return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};})];
}
