import React from 'react';
import {draggedFlowRoute,overlaySvgPath} from '../shared/flow-route.mjs';
import {useFlowRouteGesture} from './useFlowRouteGesture.jsx';

export function FlowRouteHandles({path,viewport,canvasRef,busy,onPreview,onSave,onError,onSelectPivot,showCurveControls=false}){
 const gesture=useFlowRouteGesture({viewport,canvasRef,busy,onPreview,onSave:(_id,route)=>onSave(route),onError}),{move,up,cancel,dragging}=gesture;
 const {geometry,edge,from,to}=path,points=geometry.points;
 const controls=geometry.pivots?(edge.route?.pivots||[]).map((p,i)=>['pivot_'+i,p,'Pivot '+(i+1)]):geometry.polyline?[['via',points[2],'Repeat route']]:showCurveControls?[['control1',points[1],'Start curve'],['control2',points[2],'End curve']]:[];
 // Endpoints paint last and have the highest hit priority even when bends overlap.
 const handles=[...controls,['from',points[0],'Start point'],['to',points.at(-1),'End point']],screen=p=>({x:p.x*viewport.zoom+viewport.x,y:p.y*viewport.zoom+viewport.y});
 function down(e,handle){if(gesture.down(e,path,handle)&&handle.startsWith('pivot_'))onSelectPivot?.(Number(handle.slice(6)));}
 async function keyboard(e,handle,point){const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta||busy||dragging)return;e.preventDefault();e.stopPropagation();const step=e.shiftKey?1:10;try{await onSave(draggedFlowRoute(geometry,edge.route,handle,{x:point.x+delta[0]*step,y:point.y+delta[1]*step},from,to));}catch(error){onError(error.message);}}
 return <div className="flow-route-controls" onPointerDown={e=>e.stopPropagation()}>
  <svg className="flow-route-guides" aria-label="Drag selected arrow route"><path className="flow-route-line-hit" d={overlaySvgPath(geometry,screen,16*viewport.zoom)} onPointerDown={e=>down(e,'path')} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={cancel}/>{showCurveControls&&!geometry.polyline&&<>{[[points[0],points[1]],[points[3],points[2]]].map(([a,b],i)=>{a=screen(a);b=screen(b);return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;})}</>}</svg>
  {handles.map(([handle,point,label])=>{const p=screen(point);return <button key={handle} className={'flow-route-handle '+(handle==='from'||handle==='to'?'endpoint':handle.startsWith('pivot_')?'pivot':'curve')} style={{left:p.x,top:p.y}} aria-label={label+' for '+edge.title} title={label+' · Drag to adjust; arrow keys move; Escape cancels'} disabled={busy} onPointerDown={e=>down(e,handle)} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={cancel} onFocus={()=>handle.startsWith('pivot_')&&onSelectPivot?.(Number(handle.slice(6)))} onClick={()=>handle.startsWith('pivot_')&&onSelectPivot?.(Number(handle.slice(6)))} onKeyDown={e=>keyboard(e,handle,point)}/>;})}
 </div>;
}
