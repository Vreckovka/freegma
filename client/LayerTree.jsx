import React,{useState,useRef,useMemo,useLayoutEffect,useImperativeHandle} from 'react';
import {TREE_ROW_HEIGHT,treeWindow,revealTreeRow,treeTabStop} from './tree-window.mjs';

export function LayerTree({ref,rows,selectedId,renderRow,onDrop}){
  const scrollRef=useRef(null),frameRef=useRef(null);
  const [size,setSize]=useState({top:0,height:450}),[focusedId,setFocusedId]=useState(null);
  const index=useMemo(()=>new Map(rows.map((r,i)=>[r.node.id,i])),[rows]);
  function measure(){const el=scrollRef.current;if(el)setSize(current=>current.top===el.scrollTop&&current.height===el.clientHeight?current:{top:el.scrollTop,height:el.clientHeight});}
  function revealRow(id,focus=false){
    const el=scrollRef.current,i=index.get(id);if(!el||i===undefined)return;
    el.scrollTop=revealTreeRow(i,el.scrollTop,el.clientHeight);measure();
    if(focus){cancelAnimationFrame(frameRef.current);frameRef.current=requestAnimationFrame(()=>{const row=[...el.querySelectorAll('[data-layer-id]')].find(r=>r.dataset.layerId===id);row?.focus({preventScroll:true});});}
  }
  useImperativeHandle(ref,()=>({revealRow}),[index]);
  useLayoutEffect(()=>{const observer=new ResizeObserver(measure);observer.observe(scrollRef.current);measure();return()=>{observer.disconnect();cancelAnimationFrame(frameRef.current);};},[]);
  useLayoutEffect(()=>{revealRow(selectedId);},[rows,selectedId]);
  const window=treeWindow(rows.length,size.top,size.height,{focusedIndex:index.get(focusedId)});
  const tabId=treeTabStop(index,selectedId);
  const tabVisible=window.indices.includes(index.get(tabId));
  return <div ref={scrollRef} className="layer-tree" onScroll={measure}>
    <div role="tree" aria-label="Design layers" aria-multiselectable="true" tabIndex={tabVisible?-1:0}
      style={{position:'relative',height:window.totalHeight}}
      onFocus={e=>{if(e.target===e.currentTarget)revealRow(tabId,true);}}
      onFocusCapture={e=>setFocusedId(e.target.closest('[data-layer-id]')?.dataset.layerId||null)}
      onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocusedId(null);}}>
      {window.indices.map(i=><div key={rows[i].node.id} role="none" style={{position:'absolute',left:0,right:0,top:i*TREE_ROW_HEIGHT,height:TREE_ROW_HEIGHT}}>{renderRow(rows[i],tabId)}</div>)}
    </div>
    <button className="drop-to-canvas" onDragOver={e=>e.preventDefault()} onDrop={onDrop}>Drop here to move to canvas</button>
  </div>;
}
