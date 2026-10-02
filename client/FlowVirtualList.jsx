import React,{useMemo,useRef,useState,useLayoutEffect,useEffect} from 'react';
import {flowListLayout,flowListWindow,flowListScrollDelta} from './flow-list-window.mjs';
export function FlowVirtualList({items,subtitle,selectedId,scrollRef,label,renderRow}){
 const listRef=useRef(null),focusFrame=useRef(null),[focused,setFocused]=useState(null),[range,setRange]=useState({top:0,height:0});
 const layout=useMemo(()=>flowListLayout(items,subtitle),[items,subtitle]);
 function measure(){const list=listRef.current,root=scrollRef.current;if(!list||!root)return;const top=root.getBoundingClientRect().top-list.getBoundingClientRect().top,height=root.clientHeight;setRange(old=>old.top===top&&old.height===height?old:{top,height});}
 function reveal(id,focus=false){const i=layout.index.get(id),root=scrollRef.current,list=listRef.current;if(i===undefined||!root||!list)return;const top=root.getBoundingClientRect().top-list.getBoundingClientRect().top;root.scrollTop+=flowListScrollDelta(layout.rows[i],top,root.clientHeight);measure();if(focus){setFocused(id);cancelAnimationFrame(focusFrame.current);focusFrame.current=requestAnimationFrame(()=>{list.querySelector(`[data-flow-list-id="${id}"] button`)?.focus({preventScroll:true});});}}
 useEffect(()=>{const root=scrollRef.current,list=listRef.current;if(!root||!list)return;const observer=new ResizeObserver(measure);observer.observe(root);observer.observe(list);root.addEventListener('scroll',measure,{passive:true});measure();return()=>{observer.disconnect();root.removeEventListener('scroll',measure);cancelAnimationFrame(focusFrame.current);};},[scrollRef]);
 // Board catalog rows above a section can move it without resizing it.
 useLayoutEffect(measure,[layout,renderRow]);
 const hasSelected=layout.index.has(selectedId);
 useLayoutEffect(()=>{if(hasSelected)reveal(selectedId);},[selectedId,hasSelected]);
 const indices=flowListWindow(layout,range.top,range.height,focused);
 const tabId=hasSelected?selectedId:items[0]?.id,tabVisible=indices.includes(layout.index.get(tabId));
 return <div ref={listRef} role="list" aria-label={label} tabIndex={items.length&&!tabVisible?0:-1} className="flow-virtual-list" style={{height:layout.totalHeight}}
  onFocus={e=>{if(e.target===e.currentTarget)reveal(tabId,true);}}
  onFocusCapture={e=>setFocused(e.target.closest('[data-flow-list-id]')?.dataset.flowListId||null)}
  onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(null);}}
  onKeyDown={e=>{const id=e.target.closest('[data-flow-list-id]')?.dataset.flowListId,i=layout.index.get(id);if(i===undefined)return;let next;if(e.key==='ArrowDown')next=Math.min(items.length-1,i+1);else if(e.key==='ArrowUp')next=Math.max(0,i-1);else if(e.key==='Home')next=0;else if(e.key==='End')next=items.length-1;else if(e.key==='Tab'){next=i+(e.shiftKey?-1:1);if(next<0||next>=items.length)return;}else return;e.preventDefault();reveal(items[next].id,true);}}>
  {indices.map(i=>{const row=layout.rows[i];return <div role="listitem" aria-posinset={i+1} aria-setsize={items.length} data-flow-list-id={row.item.id} key={row.item.id} style={{position:'absolute',left:0,right:0,top:row.top,height:row.height}}>{renderRow(row.item)}</div>;})}
 </div>;
}
