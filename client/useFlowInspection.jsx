import {useEffect,useReducer,useRef} from 'react';
import {transitionInspection} from './flow-inspection.mjs';
export function useFlowInspection(boardId,edges){
 const [state,dispatch]=useReducer(transitionInspection,{hover:null,details:null}),leave=useRef(null);
 const cancel=()=>clearTimeout(leave.current);
 const clear=()=>{cancel();dispatch({type:'close'});};
 const enter=id=>{cancel();dispatch({type:'hover',id});};
 const exit=()=>{cancel();leave.current=setTimeout(()=>dispatch({type:'leave'}),150);};
 const open=id=>{cancel();dispatch({type:'open',id});};
 useEffect(()=>{clear();},[boardId]);
 useEffect(()=>{dispatch({type:'validate',ids:new Set(edges.map(e=>e.id))});},[edges]);
 useEffect(()=>()=>cancel(),[]);
 return {hover:state.hover||state.details,detailsId:state.details,enter,exit,open,clear};
}
