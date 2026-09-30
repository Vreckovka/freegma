import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {newId} from '../shared/design.mjs';
import {boardPath,workspacePath} from './files.mjs';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};

export const deletionStoreMethods={
  deletionPlan(kind,id){
    if(!['board','workspace'].includes(kind))fail('Invalid deletion kind.');
    let name,workspaceId,workspaceIds=[],boardIds=[],files=[],components=0,assets=0;
    if(kind==='board'){
      const board=this.readBoard(id);name=board.name;workspaceId=board.workspaceId;boardIds=[id];files=[boardPath(workspaceId,id)];
    }else{
      const all=this.workspaces(),root=this.workspace(id);name=root.name;workspaceId=id;workspaceIds=[id];
      for(let i=0;i<workspaceIds.length;i++)for(const child of all.filter(w=>w.parentId===workspaceIds[i]))workspaceIds.push(child.id);
      for(const workspaceId of workspaceIds){
        const manifest=this.manifest(workspaceId);boardIds.push(...manifest.boards.map(b=>b.id));components+=manifest.components.length;assets+=manifest.assets.length;
        const walk=relative=>{for(const entry of fs.readdirSync(this.files.resolve(relative),{withFileTypes:true})){const file=relative+'/'+entry.name;this.files.resolve(file);if(entry.isDirectory())walk(file);else if(entry.isFile())files.push(file);else fail('Unsupported storage entry.');}};
        walk(workspaceId);
      }
    }
    files.sort();const hash=createHash('sha256').update(kind+'\0'+id+'\0');
    for(const file of files)hash.update(file+'\0').update(this.files.bytes(file));
    if(kind==='board')hash.update(this.files.bytes(workspacePath(workspaceId)));
    return {kind,id,name,workspaceId,workspaceIds,boardIds,files,components,assets,confirmationToken:hash.digest('hex')};
  },
  deletionPreview(kind,id){return this.transaction(()=>{const p=this.deletionPlan(kind,id);return {kind,id,name:p.name,workspaceId:p.workspaceId,workspaces:p.workspaceIds.length,boards:p.boardIds.length,components:p.components,assets:p.assets,confirmationToken:p.confirmationToken};});},
  deleteDesign(kind,id,{confirmationToken,confirmName}={}){
    return this.transaction(()=>{
      const plan=this.deletionPlan(kind,id);
      if(confirmName!==plan.name)fail('Type the exact name to confirm deletion.');
      if(!confirmationToken||confirmationToken!==plan.confirmationToken)fail('Designs changed. Reopen the deletion confirmation.',409);
      const trash='.trash/'+newId('deletion');
      for(const file of plan.files){this.files.stage(trash+'/'+file,this.files.bytes(file));this.files.remove(file);}
      this.files.stage(trash+'/deletion.json',{kind,id,name:plan.name,deletedAt:new Date().toISOString(),workspaceIds:plan.workspaceIds,boardIds:plan.boardIds,files:plan.files});
      if(kind==='board'){
        const w=this.manifest(plan.workspaceId);w.boards=w.boards.filter(b=>b.id!==id);this.stageManifest(w);this.db.prepare("DELETE FROM file_refs WHERE kind='board' AND id=?").run(id);
      }else for(const workspaceId of plan.workspaceIds)this.db.prepare('DELETE FROM file_refs WHERE workspace_id=?').run(workspaceId);
      return {deleted:true,kind,id,workspaceId:plan.workspaceId,workspaceIds:plan.workspaceIds,boardIds:plan.boardIds,recoveryPath:this.files.resolve(trash)};
    });
  },
};
