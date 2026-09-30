import {projectColors,sharedComponentDocument,exampleDocument,guideDocument} from '../shared/project-template.mjs';
export const projectStoreMethods={
  createProject(name,template='empty'){
    if(!['empty','light-dark'].includes(template))throw Object.assign(Error('Choose Empty or Light & Dark template.'),{status:400});
    return this.transaction(()=>{
      const workspace=this.createWorkspace(name);
      if(template==='empty')return {workspace,board:this.createBoard(workspace.id,'Untitled board'),children:[]};
      const w=this.manifest(workspace.id);w.colorSystem=projectColors();this.stageManifest(w);
      let masters=this.createBoard(w.id,'Shared components',sharedComponentDocument());
      const button=this.saveComponent(masters.id,masters.revision,'shared_button','Button');masters=button.board;
      const card=this.saveComponent(masters.id,masters.revision,'shared_card','Card');
      let board=this.createBoard(w.id,'Example dashboard',exampleDocument());
      board=this.insertComponent(board.id,board.revision,card.component.id,{parentId:'example',x:32,y:160}).board;
      board=this.insertComponent(board.id,board.revision,button.component.id,{parentId:'example',x:32,y:360}).board;
      board=this.insertComponent(board.id,board.revision,card.component.id,{parentId:'example',x:396,y:160}).board;
      board=this.insertComponent(board.id,board.revision,button.component.id,{parentId:'example',x:396,y:360}).board;
      this.createBoard(w.id,'Folders & themes guide',guideDocument());
      const children=['Light Mode','Dark Mode'].map((name,i)=>{const child=this.createWorkspace(name,w.id);const manifest=this.manifest(child.id);manifest.colorTheme=i?'theme_dark':'theme_light';this.stageManifest(manifest);return child;});
      return {workspace:this.workspace(w.id),board:this.getBoard(board.id),children};
    });
  }
};
