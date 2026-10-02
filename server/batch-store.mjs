import {createHash} from 'node:crypto';
import {clone,validateDocument} from '../shared/design.mjs';
import {applyFlowOperations} from '../shared/flows.mjs';
import {applyOverlayOperations} from '../shared/flow-overlay.mjs';
import {detachMissingCommentAnchors} from '../shared/comments.mjs';
import {boardPath} from './files.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export const batchStoreMethods={
 batchDocument(document,{kind,operations}){
  if(kind==='design'){if(document.flow)fail('Design operations require a design board.');return this.lockedOperations(document,operations);}
  if(kind==='flow'){
   if(!document.flow)fail('Flow operations require a flow board.');
   const doc=applyFlowOperations(document,operations);
   for(const op of operations){if(op.op==='addNode'&&op.node.reference)this.checkFlowReference(op.node.reference);if(op.op==='updateNode'&&op.patch.reference)this.checkFlowReference(op.patch.reference);if(op.op==='addEdge'&&op.edge.trigger)this.checkFlowReference(op.edge.trigger);if(op.op==='updateEdge'&&op.patch.trigger)this.checkFlowReference(op.patch.trigger);}
   return validateDocument(doc);
  }
  if(kind!=='overlay'||document.flow)fail('Unknown or incompatible edit kind.');
  const doc=applyOverlayOperations(document,operations),refs=new Map((doc.flowOverlay.frames||[]).map(f=>[f.id,f]));
  for(const op of operations){if(op.op==='addFrame')this.checkFlowReference(op.frame.reference);if(op.op==='updateFrame'&&op.patch.reference)this.checkFlowReference(op.patch.reference);if(op.op==='addEdge'||op.op==='updateEdge'){const edge=doc.flowOverlay.edges.find(e=>e.id===(op.edge?.id||op.id)),source=refs.get(edge?.fromFrameId);if(source&&(op.op==='addEdge'||Object.hasOwn(op.patch,'fromFrameId')||Object.hasOwn(op.patch,'triggerId')))this.checkFlowReference({...source.reference,...(edge.triggerId?{elementId:edge.triggerId}:{})});}}
  for(const op of operations.filter(op=>op.op==='updateFrame'&&op.patch.reference)){const source=refs.get(op.id);for(const edge of doc.flowOverlay.edges.filter(e=>e.fromFrameId===op.id))this.checkFlowReference({...source.reference,...(edge.triggerId?{elementId:edge.triggerId}:{})});}
  return validateDocument(doc);
 },
 mutateBatch(id,expectedRevision,batchId,actions){return this.transaction(()=>{
  if(typeof batchId!=='string'||!/^[\w-]{8,100}$/.test(batchId))fail('Supply a unique batch ID.');
  if(!Array.isArray(actions)||!actions.length||actions.length>25||actions.some(a=>!a||!['design','flow','overlay','history'].includes(a.kind)||typeof a.label!=='string'||a.label.length>200||!Array.isArray(a.operations)||!a.operations.length)||actions.reduce((n,a)=>n+a.operations.length,0)>1000||Buffer.byteLength(JSON.stringify(actions))>8*1024*1024)fail('Edit batch exceeds its limits.');
  const digest=createHash('sha256').update(JSON.stringify({expectedRevision,actions})).digest('hex'),raw=this.readBoard(id,false),receipt=raw.saveBatches?.find(r=>r.id===batchId);
  if(receipt){if(receipt.digest!==digest)fail('Batch ID already used for different changes.',409);return this.getBoard(id);}
  this.expect(raw,expectedRevision);
  const b={...raw,comments:clone(raw.comments||[]),history:raw.history.map(h=>({...h}))},before=raw.document;
  let changed=false;
  for(const action of actions){
   if(action.kind==='history'){
    const direction=action.operations[0]?.op;if(action.operations.length!==1||!['undo','redo'].includes(direction))fail('Invalid history action.');
    const palette=this.colors(b.workspaceId);if(action.expectedPaletteRevision!==palette.revision)fail('Project colors changed. Reload before restoring a cached step.',409);
    const seq=direction==='undo'?b.cursor:b.cursor+1,h=b.history.find(h=>h.seq===seq);if(!h)fail('Cached history is no longer available.',409);
    const document=direction==='undo'?h.before:h.after;this.validateAssets(document,b.workspaceId);detachMissingCommentAnchors(b,document);const at=new Date().toISOString();if(direction==='undo')h.undoneAt=at;
    Object.assign(b,{document,cursor:direction==='undo'?seq-1:seq,revision:b.revision+1,updatedAt:at});changed=true;continue;
   }
   // Design actions validate each operation in lockedOperations; other kinds validate in batchDocument.
   const next=this.batchDocument(b.document,action);this.validateAssets(next,b.workspaceId);
   if(JSON.stringify(next)===JSON.stringify(b.document))continue;
   this.clearColorRedo(b.workspaceId);changed=true;b.history=b.history.filter(h=>h.seq<=b.cursor);
   detachMissingCommentAnchors(b,next);
   const at=new Date().toISOString();b.history.push({seq:++b.cursor,label:action.label,before:b.document,after:next,createdAt:at});b.document=next;b.revision++;b.updatedAt=at;
  }
  if(!changed)return this.getBoard(id);
  b.saveBatches=[...(raw.saveBatches||[]),{id:batchId,digest,revision:b.revision}].slice(-32);
  this.files.stage(boardPath(b.workspaceId,b.id),b);
  this.syncMasters(b,{previousDocument:before});
  return this.getBoard(id);
 });}
};
