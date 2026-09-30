import {componentContext} from './components.mjs';
import {clone} from './design.mjs';
import {relatedCssProperties} from './css.mjs';
export function instanceContext(nodes,id){const c=componentContext(nodes,id);return c?.kind==='instance'?c:null;}
export function propertyEditable(nodes,id,key){const node=nodes.find(n=>n.id===id);return !instanceContext(nodes,id)||(node?.overrides||[]).includes(key)||((key.startsWith('cssOverrides.')||key.startsWith('paths.'))&&(node?.overrides||[]).includes(key.split('.')[0]));}
export function bindingProperty(path){return path.startsWith('cssOverrides.')||path.startsWith('paths.')?path:path.split('.')[0];}
export function mergePropertyBindings(target,prior,key){const owns=path=>bindingProperty(path)===key||['paths','cssOverrides'].includes(key)&&path.startsWith(key+'.');target.colorBindings=[...(target.colorBindings||[]).filter(b=>!owns(b.path)),...(prior.colorBindings||[]).filter(b=>owns(b.path)).map(clone)];}
export function applyInstanceOverrides(next,prior){
  if(!prior)return next;
  for(const key of next.overrides||[]){
    if(key.startsWith('paths.')){const [,index,p]=key.split('.');if(next.paths?.[index]&&prior.paths?.[index])next.paths[index][p]=clone(prior.paths[index][p]);mergePropertyBindings(next,prior,key);}
    else if(key.startsWith('cssOverrides.')){next.cssOverrides={...next.cssOverrides};const cssKey=key.slice(13);if(Object.hasOwn(prior.cssOverrides||{},cssKey))next.cssOverrides[cssKey]=prior.cssOverrides[cssKey];else delete next.cssOverrides[cssKey];mergePropertyBindings(next,prior,key);}
    else {if(Object.hasOwn(prior,key))next[key]=clone(prior[key]);else delete next[key];if(!['colorBindings','cssOverrides'].includes(key)){mergePropertyBindings(next,prior,key);next.cssOverrides={...next.cssOverrides};for(const cssKey of relatedCssProperties(key)){if(Object.hasOwn(prior.cssOverrides||{},cssKey))next.cssOverrides[cssKey]=prior.cssOverrides[cssKey];else delete next.cssOverrides[cssKey];}}}
  }
  return next;
}
