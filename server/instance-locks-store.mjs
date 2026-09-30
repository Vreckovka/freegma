import {applyOperations,clone,isOverrideProperty} from '../shared/design.mjs';
import {instanceContext,bindingProperty} from '../shared/instance-locks.mjs';
import {relatedCssProperties} from '../shared/css.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fail=property=>{throw Object.assign(Error(`Component property "${property}" is locked. Edit its main component or explicitly enable this property override.`),{status:423});};
export const instanceLockStoreMethods={
  assertInstancePatch(doc,id,patch){
    const context=instanceContext(doc.nodes,id),target=Object.hasOwn(patch,'parentId')&&instanceContext(doc.nodes,patch.parentId);
    if(target&&target.node.id!==context?.node.id)fail('component structure');if(!context)return;
    const node=doc.nodes.find(n=>n.id===id),keys=new Set(node.overrides||[]),allowed=key=>keys.has(key)||key.startsWith('paths.')&&keys.has('paths')||key.startsWith('cssOverrides.')&&(keys.has('cssOverrides')||Object.keys(patch).some(p=>keys.has(p)&&relatedCssProperties(p).includes(key.slice(13))));
    if(Object.hasOwn(patch,'parentId')&&patch.parentId!==node.parentId&&id!==context.node.id&&instanceContext(doc.nodes,patch.parentId)?.node.id!==context.node.id)fail('component structure');
    for(const key of Object.keys(patch)){
      if(key==='colorBindings'){
        if(keys.has(key))continue;const a=new Map((node.colorBindings||[]).map(b=>[b.path,b])),b=new Map((patch.colorBindings||[]).map(b=>[b.path,b]));
        for(const path of new Set([...a.keys(),...b.keys()]))if(!same(a.get(path),b.get(path))&&!allowed(bindingProperty(path)))fail(bindingProperty(path));
      }else if(key==='paths'){
        if(keys.has(key))continue;if(!Array.isArray(patch.paths)||patch.paths.length!==node.paths.length)fail('paths');for(let i=0;i<node.paths.length;i++)for(const p of new Set([...Object.keys(node.paths[i]),...Object.keys(patch.paths[i])]))if(!same(node.paths[i][p],patch.paths[i][p])&&!allowed(`paths.${i}.${p}`))fail(`paths.${i}.${p}`);
      }else if(key==='cssOverrides'){
        if(keys.has(key))continue;for(const css of new Set([...Object.keys(node.cssOverrides||{}),...Object.keys(patch.cssOverrides||{})]))if(!same(node.cssOverrides?.[css],patch.cssOverrides?.[css])&&!allowed('cssOverrides.'+css))fail('cssOverrides.'+css);
      }else if(!allowed(key))fail(key);
    }
  },
  lockedOperations(document,operations){
    let doc=clone(document);const addedInstances=new Set();
    if(!Array.isArray(operations)||!operations.length||operations.length>1000)return applyOperations(doc,operations);
    for(const original of operations){let op=original;const context=instanceContext(doc.nodes,op.id||op.node?.parentId);
      if(op.op==='override'){
        if(!context||!isOverrideProperty(op.property)||typeof op.enabled!=='boolean')throw Object.assign(Error('Select one valid property of a linked instance.'),{status:400});
        const node=doc.nodes.find(n=>n.id===op.id),c=this.component(context.id),master=c.definition.nodes.find(n=>n.id===node.sourceId);if(!master)throw Object.assign(Error('This layer has no source property. Edit the main component or detach the instance.'),{status:400});
        const placement=node.componentId?(node.instancePlacement||{x:node.x,y:node.y,parentId:node.parentId}):null;
        const cssKey=op.property.startsWith('cssOverrides.')?op.property.slice(13):null;
        const base=placement&&['x','y','parentId'].includes(op.property)?placement:master;
        const path=op.property.startsWith('paths.')?op.property.split('.'):null;
        if(path&&(!node.paths?.[path[1]]||!master.paths?.[path[1]]))throw Object.assign(Error('This vector path is not present in the main component.'),{status:400});
        let value=path?master.paths[path[1]][path[2]]:cssKey?master.cssOverrides?.[cssKey]:base[op.property];const present=path?Object.hasOwn(master.paths[path[1]],path[2]):cssKey?Object.hasOwn(master.cssOverrides||{},cssKey):Object.hasOwn(base,op.property);
        if(op.property==='parentId'&&!placement)value=doc.nodes.find(n=>n.sourceId===master.parentId&&instanceContext(doc.nodes,n.id)?.node.id===context.node.id)?.id||context.node.id;
        if(op.property==='parentId'&&placement&&value&&!doc.nodes.some(n=>n.id===value))value=node.parentId;
        if(!op.enabled&&(cssKey||path)){const parent=cssKey?'cssOverrides':'paths';if(node.overrides?.includes(parent)){const expanded=cssKey?[...new Set([...Object.keys(node.cssOverrides||{}),...Object.keys(master.cssOverrides||{})])].map(p=>'cssOverrides.'+p):node.paths.flatMap((p,i)=>Object.keys(p).map(k=>`paths.${i}.${k}`));node.overrides=[...new Set([...node.overrides.filter(k=>k!==parent),...expanded.filter(k=>k!==op.property)])];}}
        const owns=path=>bindingProperty(path)===op.property||['paths','cssOverrides'].includes(op.property)&&path.startsWith(op.property+'.');
        const bindings=[...(node.colorBindings||[]).filter(b=>!owns(b.path)),...(master.colorBindings||[]).filter(b=>owns(b.path))],css={...node.cssOverrides};
        if(!cssKey&&!['cssOverrides','colorBindings'].includes(op.property))for(const key of relatedCssProperties(op.property)){if(Object.hasOwn(master.cssOverrides||{},key))css[key]=master.cssOverrides[key];else delete css[key];}
        op={op:'override',id:op.id,property:op.property,enabled:op.enabled,...(placement?{placement}:{}),...(!op.enabled?{restore:{present,value,...(!['colorBindings','cssOverrides'].includes(op.property)?{bindings,...(!cssKey?{css}: {})}: {})}}:{})};
      }else if(op.op==='update')this.assertInstancePatch(doc,op.id,op.patch||{});
      else if(context&&['add','remove','duplicate','reorder','detach'].includes(op.op)&&(op.op==='add'||op.id!==context.node.id)&&!(op.op==='add'&&addedInstances.has(context.node.id)))fail('component structure');
      doc=applyOperations(doc,[op]);
      if(op.op==='add'&&op.node.componentId)addedInstances.add(op.node.id);
    }
    return doc;
  },
  assertInstanceReplacement(before,after){
    for(const node of before.nodes){const context=instanceContext(before.nodes,node.id);if(!context||!after.nodes.some(n=>n.id===context.node.id))continue;const next=after.nodes.find(n=>n.id===node.id);if(!next)fail('component structure');
      for(const key of ['componentId','sourceId','overrides','instancePlacement'])if(!same(node[key],next[key]))fail('component reference');
      const patch=Object.fromEntries([...new Set([...Object.keys(node),...Object.keys(next)])].filter(k=>!same(node[k],next[k])).map(k=>[k,next[k]]));this.assertInstancePatch(before,node.id,patch);
    }
    for(const node of after.nodes)if(!before.nodes.some(n=>n.id===node.id)&&instanceContext(before.nodes,node.parentId))fail('component structure');
  }
};
