import {useRef,useState,useEffect} from 'react';
import {createFlowRouteGesture} from './flow-route-gesture.mjs';

export function useFlowRouteGesture({viewport,canvasRef,busy,onPreview,onSave,onError}){
 const latest=useRef(null),controller=useRef(null),[dragging,setDragging]=useState(false);
 latest.current={viewport,canvasRef,busy,onPreview,onSave,onError};
 if(!controller.current)controller.current=createFlowRouteGesture({
  viewport:()=>latest.current.viewport,rect:()=>latest.current.canvasRef.current.getBoundingClientRect(),busy:()=>latest.current.busy,
  onPreview:r=>latest.current.onPreview(r),onSave:(id,r)=>latest.current.onSave(id,r),onError:e=>latest.current.onError(e),onDragging:setDragging,
 });
 useEffect(()=>{const c=controller.current,key=e=>{if(c.active()&&(e.key==='Escape'||(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z')){e.preventDefault();e.stopImmediatePropagation();c.cancel();}},blur=()=>c.cancel();window.addEventListener('keydown',key,true);window.addEventListener('blur',blur);return()=>{window.removeEventListener('keydown',key,true);window.removeEventListener('blur',blur);c.cancel();};},[]);
 return {...controller.current,dragging};
}
