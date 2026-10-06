import React,{useEffect,useRef,useState} from 'react';
import {inputValue} from './live-input.mjs';

// Keep incomplete numbers/CSS drafts in the field. Valid edits reach the
// optimistic board immediately; its existing queue batches persistence.
export function LiveInput({value,onChange,type='text',multiline=false,min,max,validate,...props}){
 const [draft,setDraft]=useState(value??''),element=useRef(null);
 useEffect(()=>{if(document.activeElement!==element.current)setDraft(value??'');},[value]);
 function change(event){const text=event.target.value;setDraft(text);const next=inputValue(text,{type,min,max,validate});if(next.valid&&next.value!==value)onChange(next.value);}
 function finish(){const next=inputValue(draft,{type,min,max,validate});if(!next.valid)setDraft(value??'');else if(next.value!==value)onChange(next.value);}
 const Tag=multiline?'textarea':'input';
 return <Tag {...props} ref={element} type={multiline?undefined:type} min={min} max={max} value={draft} onChange={change} onBlur={finish}/>;
}

export function InlineText({value,onChange,onDone}){
 const element=useRef(null);
 useEffect(()=>{element.current.textContent=value;element.current.focus();},[]);
 return <span className="inline-text" ref={element} contentEditable suppressContentEditableWarning onInput={event=>onChange(event.currentTarget.textContent)} onBlur={event=>{onChange(event.currentTarget.textContent);onDone();}} onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape')event.currentTarget.blur();}}/>;
}
