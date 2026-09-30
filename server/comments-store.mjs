import {applyCommentOperation} from '../shared/comments.mjs';
import {boardPath,validateBoard} from './files.mjs';
export const commentStoreMethods={
 comment(boardId,expectedCommentsRevision,actor,operation){return this.transaction(()=>{
  const board=this.readBoard(boardId);
  if(!Number.isSafeInteger(expectedCommentsRevision)||expectedCommentsRevision<0)throw Object.assign(new Error('Supply expectedCommentsRevision.'),{status:400});
  if((board.commentsRevision||0)!==expectedCommentsRevision)throw Object.assign(new Error('Comments changed elsewhere. Reload before commenting.'),{status:409});
  board.comments=applyCommentOperation(board,actor,operation);board.commentsRevision=expectedCommentsRevision+1;board.commentsUpdatedAt=new Date().toISOString();validateBoard(board);this.files.stage(boardPath(board.workspaceId,board.id),board);return this.getBoard(board.id);
 });},
 listComments({boardId,workspaceId},origin=process.env.FREEGMA_ORIGIN||'http://127.0.0.1:4330'){return this.transaction(()=>{
  if(!boardId&&!workspaceId)throw Object.assign(new Error('Supply boardId or workspaceId.'),{status:400});
  const boards=boardId?[this.getBoard(boardId)]:this.boards(workspaceId).map(b=>this.getBoard(b.id));
  return {threads:boards.flatMap(b=>b.comments.filter(t=>!t.deleted).map(t=>({...t,messages:t.messages.filter(m=>!m.deleted),boardId:b.id,boardName:b.name,workspaceId:b.workspaceId,commentsRevision:b.commentsRevision,url:`${origin}/w/${b.workspaceId}/b/${b.id}?comment=${t.id}`})))};
 });}
};
