import React,{useRef,useState,useEffect} from 'react';
import {draggedFlowRoute} from '../shared/flow-overlay.mjs';

export function FlowRouteHandles({path,viewport,canvasRef,busy,onPreview,onSave,onError}){
 const drag=useRef(null),[dragging,setDragging]=useState(false);
 const cancel=()=>{drag.current=null;setDragging(false);onPreview(null);};
 useEffect(()=>{const key=e=>{if(drag.current&&(e.key==='Escape'||(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z')){e.preventDefault();e.stopImmediatePropagation();cancel();}};const blur=()=>{if(drag.current)cancel();};window.addEventListener('keydown',key,true);window.addEventListener('blur',blur);return()=>{window.removeEventListener('keydown',key,true);window.removeEventListener('blur',blur);};},[]);
 const {geometry,edge,from,to}=path,points=geometry.points;
 const controls=geometry.polyline?[['via',points[2],'Repeat route']]:[['control1',points[1],'Start curve'],['control2',points[2],'End curve']];
 const handles=[['from',points[0],'Start point'],['to',points.at(-1),'End point'],...controls],screen=p=>({x:p.x*viewport.zoom+viewport.x,y:p.y*viewport.zoom+viewport.y});
 function down(e,handle){if(busy||e.button!==0)return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);drag.current={pointer:e.pointerId,handle,geometry,route:edge.route,from,to,start:{x:e.clientX,y:e.clientY},next:null};setDragging(true);}
 function move(e){const d=drag.current;if(!d||d.pointer!==e.pointerId)return;const rect=canvasRef.current.getBoundingClientRect(),point={x:Math.max(-99999,Math.min(99999,(e.clientX-rect.left-viewport.x)/viewport.zoom)),y:Math.max(-99999,Math.min(99999,(e.clientY-rect.top-viewport.y)/viewport.zoom))};if(Math.hypot(e.clientX-d.start.x,e.clientY-d.start.y)<2&&!d.next)return;try{d.next=draggedFlowRoute(d.geometry,d.route,d.handle,point,d.from,d.to);onPreview(d.next);}catch(error){onError(error.message);}}
 async function up(e){const d=drag.current;if(!d||d.pointer!==e.pointerId)return;drag.current=null;setDragging(false);if(!d.next){onPreview(null);return;}try{await onSave(d.next);}catch(error){onError(error.message);}finally{onPreview(null);}}
 async function keyboard(e,handle,point){const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!delta||busy||dragging)return;e.preventDefault();e.stopPropagation();const step=e.shiftKey?1:10;try{await onSave(draggedFlowRoute(geometry,edge.route,handle,{x:point.x+delta[0]*step,y:point.y+delta[1]*step},from,to));}catch(error){onError(error.message);}}
 return <div className="flow-route-controls" onPointerDown={e=>e.stopPropagation()}>
  {!geometry.polyline&&<svg className="flow-route-guides" aria-hidden="true">{[[points[0],points[1]],[points[3],points[2]]].map(([a,b],i)=>{a=screen(a);b=screen(b);return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}/>;})}</svg>}
  {handles.map(([handle,point,label])=>{const p=screen(point);return <button key={handle} className={'flow-route-handle '+(handle==='from'||handle==='to'?'endpoint':'curve')} style={{left:p.x,top:p.y}} aria-label={label+' for '+edge.title} title={label+' · Drag to adjust; arrow keys move; Escape cancels'} disabled={busy} onPointerDown={e=>down(e,handle)} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={()=>{if(drag.current)cancel();}} onKeyDown={e=>keyboard(e,handle,point)}/>;})}
 </div>;
}
