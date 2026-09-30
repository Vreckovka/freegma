import {resolveNode,detachPatchedColors,readPath} from '../shared/colors.mjs';
import {clearCssForPatch} from '../shared/css.mjs';

// One picker session owns its latest valid preview and at most one in-flight save.
export function createColorEdit({target,value,commit,publish,close}){
 let saving=null;
 const edit={target,initialValue:value,value,text:value,valid:true,phase:'editing',error:'',
  preview(next,valid=true){if(edit.phase==='saving')return false;edit.text=next;edit.valid=valid;if(valid)edit.value=next;edit.error='';publish(edit);return true;},
  cancel(){if(edit.phase==='saving')return false;close(edit);return true;},
  flush(){
   if(saving)return saving;
   if(!edit.valid){edit.error='Enter a valid color or cancel this edit.';publish(edit);return Promise.reject(new Error(edit.error));}
   if(edit.value===edit.initialValue){close(edit);return Promise.resolve();}
   edit.phase='saving';edit.error='';publish(edit);
   saving=Promise.resolve().then(()=>commit(edit.value,edit.target)).then(result=>{close(edit);return result;}).catch(error=>{edit.phase='editing';edit.error=error.message;publish(edit);throw error;}).finally(()=>{saving=null;});
   return saving;
  }
 };
 return edit;
}

export function literalColorPatch(node,path,value){
 const parts=path.split('.');
 let patch;
 if(parts.length===1)patch={[path]:value};
 else if(parts[0]==='paths'){const paths=node.paths.map(part=>({...part}));paths[Number(parts[1])][parts[2]]=value;patch={paths};}
 else if(parts[0]==='cssOverrides')patch={cssOverrides:{...node.cssOverrides,[parts[1]]:value}};
 else throw new Error('Unsupported color property.');
 if(node.colorBindings?.some(binding=>binding.path===path))patch.colorBindings=node.colorBindings.filter(binding=>binding.path!==path);
 return patch;
}
export function previewPalette(palette,edit){
 if(!palette||edit?.target.kind!=='palette'||edit.target.ownerId!==palette.ownerId||edit.target.themeId!==palette.themeId)return palette;
 return {...palette,themes:palette.themes.map(theme=>theme.id===edit.target.themeId?{...theme,colors:{...theme.colors,[edit.target.key]:edit.value}}:theme)};
}
// Unchanged layers retain their resolved objects; only linked or local targets are copied.
export function previewDocument(resolved,original,palette,edit){
 if(!resolved||!edit)return resolved;
 const target=edit.target;
 if(target.kind==='palette')return {...resolved,nodes:resolved.nodes.map((node,index)=>original.nodes[index].colorBindings?.some(binding=>binding.token===target.key)?resolveNode(original.nodes[index],palette):node)};
 if(target.kind!=='literal')return resolved;
 return {...resolved,nodes:resolved.nodes.map((node,index)=>{
  if(node.id!==target.nodeId)return node;
  const copy=structuredClone(original.nodes[index]);
  const patch=literalColorPatch(copy,target.path,edit.value);
  detachPatchedColors(copy,patch);clearCssForPatch(copy,patch);Object.assign(copy,patch);
  if(copy.colorBindings)copy.colorBindings=copy.colorBindings.filter(binding=>readPath(copy,binding.path));
  return resolveNode(copy,palette);
 })};
}
export function hexToRgb(hex){const raw=hex.replace('#','');const full=raw.length<5?[...raw.slice(0,3)].map(c=>c+c).join(''):raw.slice(0,6);return [0,2,4].map(index=>parseInt(full.slice(index,index+2),16));}
export function rgbToHex(channels){return '#'+channels.map(value=>Math.round(Math.max(0,Math.min(255,value))).toString(16).padStart(2,'0')).join('');}
export function rgbToHsv([r,g,b]){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;let hue=0;if(delta){hue=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;hue*=60;if(hue<0)hue+=360;}return {h:hue,s:max?delta/max:0,v:max};}
export function hsvToHex({h,s,v}){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c,values=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return rgbToHex(values.map(value=>(value+m)*255));}
