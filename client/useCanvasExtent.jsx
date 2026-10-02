import {useLayoutEffect,useState} from 'react';
export function useCanvasExtent(ref){
 const [size,setSize]=useState({width:1200,height:800});
 useLayoutEffect(()=>{const el=ref.current;if(!el)return;const measure=()=>setSize(old=>old.width===el.clientWidth&&old.height===el.clientHeight?old:{width:el.clientWidth,height:el.clientHeight});const observer=new ResizeObserver(measure);observer.observe(el);measure();return()=>observer.disconnect();},[ref]);
 return size;
}
