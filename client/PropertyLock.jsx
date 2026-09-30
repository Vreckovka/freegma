import React,{createContext,useContext,useEffect,useState} from 'react';
import {Icon} from './icons.jsx';
import {OVERRIDE_PROPERTIES} from '../shared/design.mjs';
import {CSS_PROPERTIES} from '../shared/css.mjs';
export const PropertyEditContext=createContext(null);
const labels={X:'x',Y:'y',W:'width',H:'height',Rotation:'rotation',Corner:'radius',Gap:'gap','Layer name':'name','Font family':'fontFamily','Font size':'fontSize',Weight:'fontWeight','Line height':'lineHeight','Letter spacing':'letterSpacing','Stroke width':'strokeWidth',Opacity:'opacity',Fill:'fill',Stroke:'stroke','Text color':'color','Icon color':'color','Text content':'text'};
export function propertyForLabel(label){return labels[label]||(/^Padding (top|right|bottom|left)$/.test(label)?'padding'+label.slice(8,9).toUpperCase()+label.slice(9):/^Margin (top|right|bottom|left)$/.test(label)?'margin'+label.slice(7,8).toUpperCase()+label.slice(8):label==='Horizontal padding'?['paddingLeft','paddingRight']:label==='Vertical padding'?['paddingTop','paddingBottom']:null);}
export function PropertyControl({property,label,children}){
 const edit=useContext(PropertyEditContext),keys=Array.isArray(property)?property:[property],name=label||keys.join(', ');
 if(!edit?.instance||!property)return children;
 const active=keys.filter(key=>(edit.node.overrides||[]).includes(key)||(key.startsWith('cssOverrides.')||key.startsWith('paths.'))&&(edit.node.overrides||[]).includes(key.split('.')[0])),enabled=active.length===keys.length;
 return <div className={'property-guard '+(active.length?'has-override':'')}><div className="property-guard-actions">{!enabled&&<button type="button" aria-label={'Override '+name} title={'Locked: override '+name+' here, or edit the main component'} disabled={edit.busy} onClick={()=>edit.toggle(keys.filter(k=>!active.includes(k)),true)}><Icon name="lock" size={11}/></button>}{active.length>0&&<><span className="override-warning" title="Local override: this value is kept when its master changes">⚠</span><button type="button" aria-label={'Reset '+name+' to main component'} title={'Reset '+name+' to the latest master value'} disabled={edit.busy} onClick={()=>edit.toggle(active,false)}><Icon name="undo" size={11}/></button></>}</div><fieldset disabled={!enabled||edit.busy}>{children}</fieldset></div>;
}
export function AdvancedOverrides(){
 const edit=useContext(PropertyEditContext),[property,setProperty]=useState('radius'),[draft,setDraft]=useState(''),[error,setError]=useState('');
 const value=property.startsWith('cssOverrides.')?edit?.node.cssOverrides?.[property.slice(13)]:property.startsWith('paths.')?edit?.node.paths?.[property.split('.')[1]]?.[property.split('.')[2]]:edit?.node[property];
 useEffect(()=>{setDraft(JSON.stringify(value??null,null,2));setError('');},[property,value,edit?.node.id]);
 if(!edit?.instance)return null;
 async function apply(){try{const value=JSON.parse(draft);await edit.patch(property.startsWith('cssOverrides.')?{cssOverrides:{...edit.node.cssOverrides,[property.slice(13)]:value}}:property.startsWith('paths.')?{paths:edit.node.paths.map((p,i)=>i===Number(property.split('.')[1])?{...p,[property.split('.')[2]]:value}:p)}:{[property]:value});setError('');}catch(e){setError(e.message);}}
 return <details className="advanced-overrides"><summary>All property overrides</summary><p>Choose any native property or individual CSS declaration. Enable its lock before editing. Reset restores the latest master.</p><label>Property<select aria-label="Override property" value={property} onChange={e=>setProperty(e.target.value)}>{[...OVERRIDE_PROPERTIES,...CSS_PROPERTIES.map(p=>'cssOverrides.'+p),...(edit.node.paths||[]).flatMap((p,i)=>Object.keys(p).map(k=>`paths.${i}.${k}`))].map(p=><option key={p}>{p}</option>)}</select></label><PropertyControl property={property} label={property}><label>Value (JSON)<textarea aria-label="Override property value" value={draft} onChange={e=>setDraft(e.target.value)}/></label><button className="panel-action" onClick={apply}>Apply property value</button></PropertyControl>{error&&<p role="alert">{error}</p>}</details>;
}
