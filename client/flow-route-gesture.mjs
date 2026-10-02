import {draggedFlowRoute,translatedFlowRoute} from '../shared/flow-route.mjs';

// One completed pointer gesture produces one update, regardless of preview count.
export function createFlowRouteGesture(options){
 let drag=null,sequence=0;
 const release=d=>{try{if(d.target.hasPointerCapture?.(d.pointer))d.target.releasePointerCapture(d.pointer);}catch{}};
 function cancel(){const d=drag;if(!d)return;sequence++;drag=null;release(d);options.onDragging(false);options.onPreview(null);}
 return {
  active:()=>!!drag,
  down(e,path,handle='path'){
   if(options.busy()||e.button!==0||drag)return false;
   e.preventDefault();e.stopPropagation();
   const viewport={...options.viewport()},rect=options.rect();
   drag={sequence:++sequence,pointer:e.pointerId,target:e.currentTarget,handle,geometry:structuredClone(path.geometry),route:structuredClone(path.edge.route),from:{...path.from},to:{...path.to},id:path.edge.id,start:{x:e.clientX,y:e.clientY},viewport,rect:{left:rect.left,top:rect.top},next:null};
   try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
   options.onDragging(true);return true;
  },
  move(e){
   const d=drag;if(!d||d.pointer!==e.pointerId)return;
   e.preventDefault();e.stopPropagation();
   const dx=e.clientX-d.start.x,dy=e.clientY-d.start.y;
   if(Math.hypot(dx,dy)<2&&!d.next)return;
   const {viewport:v,rect}=d,bound=n=>Math.max(-99999,Math.min(99999,n));
   try{
    d.next=d.handle==='path'?translatedFlowRoute(d.geometry,d.route,dx/v.zoom,dy/v.zoom):draggedFlowRoute(d.geometry,d.route,d.handle,{x:bound((e.clientX-rect.left-v.x)/v.zoom),y:bound((e.clientY-rect.top-v.y)/v.zoom)},d.from,d.to);
    options.onPreview(d.next);
   }catch(error){options.onError(error.message);}
  },
  async up(e){
   const d=drag;if(!d||d.pointer!==e.pointerId)return;
   e.preventDefault();e.stopPropagation();drag=null;release(d);options.onDragging(false);
   if(!d.next){options.onPreview(null);return;}
   try{await options.onSave(d.id,d.next);}catch(error){options.onError(error.message);}finally{if(sequence===d.sequence)options.onPreview(null);}
  },
  cancel,
 };
}
