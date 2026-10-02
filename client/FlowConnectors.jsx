import React,{useEffect,useRef,useState,useId,useMemo} from 'react';
import {PORT_SIDES,portAnchor,portPoint,connectorDrop} from '../shared/flow-ports.mjs';
import {nearestFlowAnchor,overlayPath,overlaySvgPath} from '../shared/flow-route.mjs';
import {Icon} from './icons.jsx';
import {contextualConnectorOwners} from './flow-connector-visibility.mjs';
import './flow-connectors.css';

// Shared by the diagram canvas and the design canvas. Only accepted drops write history.
export function FlowConnectors({owners,activeIds=[],viewport,canvasRef,busy,onPort,onConnect,onAdd,onReference}){
 const [draft,setDraft]=useState(null),[saving,setSaving]=useState(false),[error,setError]=useState(''),[target,setTarget]=useState('');
 const [hoveredId,setHoveredId]=useState(null),[focusedId,setFocusedId]=useState(null),[engagedId,setEngagedId]=useState(null);
 const current=useRef(null),gesture=useRef(null),ownerRef=useRef(owners),marker=useId().replaceAll(':','');ownerRef.current=owners;
 const ownerIds=useMemo(()=>new Set(owners.map(o=>o.id)),[owners]),ownerIdsRef=useRef(ownerIds);ownerIdsRef.current=ownerIds;
 function show(next){current.current=next;setDraft(next);}
 function cancel(){gesture.current=null;show(null);setError('');setTarget('');}
 const source=owners.find(o=>o.id===draft?.sourceId),screen=p=>({x:p.x*viewport.zoom+viewport.x,y:p.y*viewport.zoom+viewport.y});
 function world(e){const r=canvasRef.current.getBoundingClientRect();return {x:Math.max(-99999,Math.min(99999,(e.clientX-r.left-viewport.x)/viewport.zoom)),y:Math.max(-99999,Math.min(99999,(e.clientY-r.top-viewport.y)/viewport.zoom))};}
 useEffect(()=>{const stop=e=>{if(current.current&&(e.key==='Escape'||(e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z')){e.preventDefault();e.stopImmediatePropagation();cancel();}};window.addEventListener('keydown',stop,true);return()=>window.removeEventListener('keydown',stop,true);},[]);
 useEffect(()=>{if(draft&&!source)cancel();},[owners]);
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  function ownerOf(target){for(let el=target;el&&el!==canvas;el=el.parentElement){const id=el.dataset?.connectorOwner||el.dataset?.flowOwner||el.dataset?.flowFrame||el.dataset?.flowSymbol||el.dataset?.nodeId;if(id&&ownerIdsRef.current.has(id))return id;}return null;}
  const hover=e=>{if(!gesture.current)setHoveredId(ownerOf(e.target));},leave=()=>setHoveredId(null),focus=e=>setFocusedId(ownerOf(e.target)),blur=e=>setFocusedId(ownerOf(e.relatedTarget)),engage=e=>{if(!e.target.closest('.flow-connector-picker'))setEngagedId(ownerOf(e.target));};
  canvas.addEventListener('pointermove',hover);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('focusin',focus);canvas.addEventListener('focusout',blur);canvas.addEventListener('pointerdown',engage,true);
  return()=>{canvas.removeEventListener('pointermove',hover);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('focusin',focus);canvas.removeEventListener('focusout',blur);canvas.removeEventListener('pointerdown',engage,true);};
 },[canvasRef]);
 async function accept(other,anchor,key){const d=current.current,s=ownerRef.current.find(o=>o.id===d?.sourceId);if(!d||!s||saving||busy)return;setSaving(true);setError('');try{await onConnect({from:s.id,to:other.id,fromPort:d.port,toPort:key,route:{from:portAnchor(s,d.port),to:anchor||nearestFlowAnchor(other.bounds,d.point)}});cancel();}catch(e){setError(e.message);}finally{setSaving(false);}}
 function down(e,owner,key){e.preventDefault();e.stopPropagation();if(busy||saving||e.button!==0)return;
  if(current.current?.pending){accept(owner,portAnchor(owner,key),key);return;}
  
  const p=portPoint(owner,key);setError('');setTarget('');show({sourceId:owner.id,port:key,point:p,pending:false});gesture.current={pointer:e.pointerId,x:e.clientX,y:e.clientY,moved:false};e.currentTarget.setPointerCapture(e.pointerId);
 }
 function move(e){const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;g.moved||=Math.hypot(e.clientX-g.x,e.clientY-g.y)>3;show({...current.current,point:world(e)});}
 async function up(e){const g=gesture.current,d=current.current;if(!g||g.pointer!==e.pointerId||!d)return;gesture.current=null;const result=connectorDrop(ownerRef.current,d.sourceId,d.point,16/viewport.zoom);
  if(!g.moved){if(source?.canSource===false){cancel();return;}show({...d,pending:true});return;}
  if(result.kind==='move'){setSaving(true);try{await onPort(d.sourceId,d.port,result.anchor);cancel();}catch(err){setError(err.message);show({...d,pending:true});}finally{setSaving(false);}return;}
  if(source?.canSource===false){cancel();return;}
  if(result.kind==='connect'){const port=PORT_SIDES.find(key=>{const p=portPoint(result.target,key);return Math.hypot(p.x-d.point.x,p.y-d.point.y)<16/viewport.zoom;});await accept(result.target,port?portAnchor(result.target,port):result.anchor,port);return;}
  if(result.kind==='cancel'){cancel();return;}show({...d,pending:true});
 }
 async function add(kind){if(!draft||saving||busy)return;setSaving(true);setError('');try{await onAdd(kind,draft.point,{from:source.id,fromPort:draft.port,route:{from:portAnchor(source,draft.port)}});cancel();}catch(e){setError(e.message);}finally{setSaving(false);}}
 const size={width:canvasRef.current?.clientWidth||800,height:canvasRef.current?.clientHeight||600};
 const preview=source&&overlayPath(source.bounds,{left:draft.point.x,top:draft.point.y,width:0,height:0},{route:{from:portAnchor(source,draft.port)}}),drop=source&&connectorDrop(owners,source.id,draft.point,16/viewport.zoom);
 const relevantOwners=contextualConnectorOwners(owners,{activeIds,hoveredId,focusedId,engagedId,sourceId:source?.id,targetId:drop?.target?.id||(draft?.pending?(target||hoveredId):null),drafting:!!draft});
 return <div className="flow-connectors" onPointerDown={e=>e.stopPropagation()}>
  {draft&&preview&&<svg className="flow-connector-draft" aria-label="Draft navigation line"><defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#399cff"/></marker></defs><path d={overlaySvgPath(preview,screen)} markerEnd={'url(#'+marker+')'}/></svg>}
  {relevantOwners.filter(o=>{const b=o.bounds,z=viewport.zoom;return o.showPorts!==false&&b.left*z+viewport.x+b.width*z>=-24&&b.top*z+viewport.y+b.height*z>=-24&&b.left*z+viewport.x<=size.width+24&&b.top*z+viewport.y<=size.height+24;}).flatMap(owner=>PORT_SIDES.map(key=>{const p=screen(portPoint(owner,key));return <button data-connector-owner={owner.id} key={owner.id+'_'+key} className={'flow-connector-dot '+(source?.id===owner.id&&draft?.port===key||drop?.target?.id===owner.id?'active':'')} style={{left:p.x,top:p.y}} aria-label={`${key} connector for ${owner.name}`} title="Drag along the edge to move · Drag to another frame to connect · Drop in space to choose a target" disabled={busy||saving||draft?.pending&&owner.canTarget===false} onPointerDown={e=>down(e,owner,key)} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={()=>{if(gesture.current)cancel();}} onClick={e=>{e.stopPropagation();if(e.detail===0&&!busy&&!saving){if(draft?.pending)accept(owner,portAnchor(owner,key),key);else if(owner.canSource!==false)show({sourceId:owner.id,port:key,point:portPoint(owner,key),pending:true});}}}><span/></button>;}))}
  {draft?.pending&&source&&<section className="flow-connector-picker" aria-label="Finish navigation line" style={{left:Math.max(8,Math.min(size.width-294,screen(draft.point).x+18)),top:Math.max(100,Math.min(size.height-250,screen(draft.point).y))}}>
   <header><strong><Icon name="link" size={14}/> Connect from {source.name}</strong><button aria-label="Cancel navigation line" disabled={saving} onClick={cancel}><Icon name="close" size={14}/></button></header>
   <p>Choose a target or click one of its connector dots. Esc cancels the draft.</p>
   <select aria-label="Navigation target" value={target} disabled={saving} onChange={e=>setTarget(e.target.value)}><option value="">Existing frame or flow point…</option>{owners.filter(o=>o.canTarget!==false).map(o=><option value={o.id} key={o.id}>{o.name}{o.id===source.id?' · Repeat':''}</option>)}</select>
   <button className="primary-button" disabled={!target||saving||busy} onClick={()=>{const o=owners.find(o=>o.id===target);accept(o,portAnchor(o,'left'),'left');}}>Connect →</button>
   <footer>{['decision','end'].map(kind=><button key={kind} disabled={saving||busy} onClick={()=>add(kind)}>＋ {kind==='decision'?'Decision':'End'}</button>)}{onReference&&<button disabled={saving||busy} onClick={()=>onReference({...draft,route:{from:portAnchor(source,draft.port)}})}>＋ Frame reference</button>}</footer>
   {error&&<p role="alert">{error}</p>}
  </section>}
  {error&&!draft?.pending&&<p className="flow-connector-error" role="alert">{error}</p>}
 </div>;
}


