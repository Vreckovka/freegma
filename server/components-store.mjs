import {clone,subtree,descendants,newId} from '../shared/design.mjs';
import {applyInstanceOverrides} from '../shared/instance-locks.mjs';
import {componentContext} from '../shared/components.mjs';
const definitionOf=(document,nodeId)=>{const definition=subtree(document,nodeId);for(const n of definition.nodes){delete n.componentId;delete n.componentMasterId;delete n.sourceId;delete n.overrides;delete n.instancePlacement;}Object.assign(definition.nodes[0],{x:0,y:0});return definition;};
export const componentStoreMethods={
  syncMasters(board,{updateHistory=true,previousDocument=null}={}){
    if(this.syncingComponents)return;
    for(const node of board.document.nodes.filter(n=>n.componentMasterId)){
      const ref=this.db.prepare("SELECT workspace_id FROM file_refs WHERE kind='component' AND id=?").get(node.componentMasterId);
      if(!ref||ref.workspace_id!==board.workspaceId)continue;
      const c=this.component(node.componentMasterId),definition=definitionOf(board.document,node.id);
      // Moving a master on the canvas is not a change to its reusable layout.
      if(JSON.stringify(definition)===JSON.stringify(definitionOf(c.definition,c.definition.nodes[0].id)))continue;
      const previousName=previousDocument?.nodes.find(n=>n.id===node.id)?.name;
      this.publishComponent(previousName&&previousName!==node.name?{...c,name:node.name}:c,definition,{sourceBoardId:board.id,updateHistory});
    }
  },
  publishComponent(component,definition,{sourceBoardId=null,updateHistory=true}={}){
    const id=component.id,owner=component.workspace_id,w=this.manifest(owner);
    const saved=w.components.find(c=>c.id===id);Object.assign(saved,{name:component.name,definition,updatedAt:new Date().toISOString()});this.stageManifest(w);
    const previous=this.syncingComponents;this.syncingComponents=true;
    try{
      for(const ws of this.workspaces().filter(w=>this.workspaceAncestors(w.id).some(parent=>parent.id===owner))){
        for(const entry of this.manifest(ws.id).boards){
          const raw=this.readBoard(entry.id);if(!raw.document.nodes.some(n=>n.componentId===id))continue;
          const b=this.getBoard(entry.id),doc=clone(b.document);
          for(const instance of [...doc.nodes.filter(n=>n.componentId===id)]){
            const old=descendants(doc.nodes,instance.id),oldMap=new Map(old.filter(n=>n.sourceId).map(n=>[n.sourceId,n]));
            const remap=new Map(definition.nodes.map(n=>[n.id,oldMap.get(n.id)?.id||newId()]));remap.set(definition.nodes[0].id,instance.id);
            const validParents=new Set([...remap.values(),...old.filter(n=>!n.sourceId).map(n=>n.id)]);
            const updated=definition.nodes.map((n,i)=>{const prior=oldMap.get(n.id),next={...clone(n),id:remap.get(n.id),sourceId:n.id,parentId:i===0?instance.parentId:remap.get(n.parentId),overrides:prior?.overrides||[]};applyInstanceOverrides(next,prior);if(i===0)Object.assign(next,{parentId:instance.parentId,x:instance.x,y:instance.y,componentId:id,...(instance.instancePlacement?{instancePlacement:clone(instance.instancePlacement)}:{})});else if(!validParents.has(next.parentId)){next.parentId=remap.get(n.parentId);next.overrides=next.overrides.filter(k=>k!=='parentId');}return next;});
            const oldIds=new Set(old.map(n=>n.id)),custom=old.filter(n=>!n.sourceId&&n.id!==instance.id),valid=new Set([...updated,...doc.nodes.filter(n=>!oldIds.has(n.id))].map(n=>n.id)),kept=[];
            for(let pending=[...custom],again=true;again;){again=false;pending=pending.filter(n=>{if(!n.parentId||valid.has(n.parentId)){kept.push(n);valid.add(n.id);again=true;return false;}return true;});}
            // Keep the original stacking order; appending updated instances changes overlaps.
            const first=doc.nodes.findIndex(n=>n.id===instance.id);const at=doc.nodes.slice(0,first).filter(n=>!oldIds.has(n.id)).length;
            doc.nodes=doc.nodes.filter(n=>!oldIds.has(n.id));doc.nodes.splice(at,0,...updated,...kept);
          }
          if(b.id===sourceBoardId){const raw=this.readBoard(b.id);raw.document=doc;if(updateHistory){const entry=raw.history.find(h=>h.seq===raw.cursor);if(entry)entry.after=clone(doc);}this.files.stage(this.ref('board',b.id).path,raw);}
          else this.writeBoard(b,doc,'Sync shared component '+component.name);
        }
      }
    }finally{this.syncingComponents=previous;}
  },
  componentReference(boardId,nodeId){return this.transaction(()=>{
    const b=this.getBoard(boardId),context=componentContext(b.document.nodes,nodeId);if(!context)return null;
    const c=this.component(context.id),owner=this.workspace(c.workspace_id),usages=[];let master=null;
    for(const ws of this.workspaces().filter(w=>this.workspaceAncestors(w.id).some(p=>p.id===owner.id))){
      for(const entry of this.manifest(ws.id).boards){const board=this.readBoard(entry.id);
        for(const n of board.document.nodes){const location={workspaceId:ws.id,workspaceName:ws.name,boardId:board.id,boardName:board.name,nodeId:n.id,nodeName:n.name,url:`/w/${ws.id}/b/${board.id}`};
          if(n.componentMasterId===c.id&&ws.id===owner.id)master=location;
          if(n.componentId===c.id)usages.push(location);
        }
      }
    }
    const overrides=[...new Set(descendants(b.document.nodes,context.node.id).flatMap(n=>n.overrides||[]))];
    return {id:c.id,name:c.name,kind:context.kind,nodeId:context.node.id,ownerId:owner.id,ownerName:owner.name,master,usages,usageCount:usages.length,boardCount:new Set(usages.map(u=>u.boardId)).size,overrides};
  });}
};
