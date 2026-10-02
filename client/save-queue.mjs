// Acknowledged board + ordered unsaved actions. A reply can never replace the
// newer actions: they are replayed over that reply before it is published.
import {createStepCache,applyCachedStep,wireAction} from './step-cache.mjs';
export const SAVE_LIMITS={quietMs:500,maxWaitMs:2000,maxActions:25,maxOperations:1000,maxBytes:256*1024,maxPendingActions:250,maxPendingBytes:8*1024*1024};
export function createSaveQueue({getBoard,apply,send,onBoard,onState=()=>{},canPublish=()=>true,onError=()=>{},now=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout,id=()=>crypto.randomUUID(),limits=SAVE_LIMITS}){
 // Completed actions are independently owned and unchanged while pending.
 // Count each wire action once; array separators have exactly one UTF-8 byte.
 const weights=new WeakMap(),bytes=value=>{
  if(Array.isArray(value))return 2+Math.max(0,value.length-1)+value.reduce((n,a)=>n+bytes(a),0);
  if(!weights.has(value))weights.set(value,new TextEncoder().encode(JSON.stringify(wireAction(value))).length);
  return weights.get(value);
 };
 let base=null,view=null,pending=[],flight=null,failed=null,error=null,timer=null,firstAt=null,saved=0,total=0,deferred=false;
 const steps=createStepCache({now});const applyAction=(board,action)=>action.kind==='history'?applyCachedStep(board,action):apply(board,action);
 const count=()=>pending.length;
 const state=()=>({phase:error?'error':flight?'saving':count()?'scheduled':total?'saved':'idle',pending:count(),saved,total,error});
 const report=e=>{try{onError(e);}catch{}};
 const emit=()=>{try{onState(state());}catch(e){report(e);}};
 function clear(){if(timer!==null)clearTimer(timer);timer=null;}
 function publish(force=false){if(!view)return;if(force||canPublish()){try{onBoard(view);deferred=false;}catch(e){deferred=true;report(e);}}else deferred=true;}
 function accept(board){if(pending.length||flight||failed)return;if(base?.id!==board?.id||base?.revision!==board?.revision||base?.palette?.revision!==board?.palette?.revision||base?.palette?.themeId!==board?.palette?.themeId||base?.palette?.ownerId!==board?.palette?.ownerId){steps.clear();if(base?.id!==board?.id){saved=0;total=0;}}base=board;view=board;error=null;emit();}
 function schedule(){
  clear();if(!count()||flight||error)return;
  const operations=pending.reduce((n,a)=>n+a.operations.length,0),full=count()>=limits.maxActions||operations>=limits.maxOperations||bytes(pending)>=limits.maxBytes;
  timer=setTimer(()=>{timer=null;pump().catch(()=>{});},full?0:Math.max(0,Math.min(limits.quietMs,limits.maxWaitMs-(now()-firstAt))));
 }
 function enqueue(action){
  const current=view||getBoard();if(!current)throw Error('Choose a board first.');
  if(!base||base.id!==current.id){if(pending.length||flight)throw Error('Save the current board before switching.');accept(current);}
  const stable=action.kind==='history'?{...wireAction(action),localStep:action.localStep}:structuredClone(action),next=applyAction(current,stable);
  if(JSON.stringify(next.document)===JSON.stringify(current.document))return current;
  if(stable.operations.length>limits.maxOperations||bytes(stable)>limits.maxPendingBytes||count()>=limits.maxPendingActions||bytes([...pending,stable])>limits.maxPendingBytes)throw Error('Too many unsaved changes. Wait for saving or retry before editing more.');
  if(!count()&&!flight&&!error){firstAt=now();saved=0;total=0;}
  if(stable.kind!=='history')steps.record(current,next);
  pending.push(stable);view=next;total++;publish(true);emit();schedule();return view;
 }
 function prefix(){let size=2,operations=0,n=0;for(const action of pending){const extra=bytes(action)+1;if(n&&(n>=limits.maxActions||operations+action.operations.length>limits.maxOperations||size+extra>limits.maxBytes))break;size+=extra;operations+=action.operations.length;n++;}return pending.slice(0,n);}
 async function pump(){
  clear();if(flight)return flight.promise;if(error)throw error;if(!count())return view;
  const request=failed||{boardId:base.id,expectedRevision:base.revision,batchId:id(),actions:prefix().map(wireAction)};
  const active={request,promise:null};flight=active;emit();
  const promise=(async()=>{
   try{
    const reply=await send(request);
    if(!reply||reply.id!==request.boardId||!Number.isSafeInteger(reply.revision)||reply.revision<request.expectedRevision)throw Error('Invalid save acknowledgement. The draft is retained.');
    // Do not remove edits that arrived while the request was in flight.
    const remaining=pending.slice(request.actions.length);
    let rebased=reply;for(const action of remaining)rebased=applyAction(rebased,action);
    pending=remaining;base=reply;view=rebased;saved+=request.actions.length;failed=null;error=null;
    publish();
    if(!pending.length)firstAt=null;
    return view;
   }catch(e){failed=request;error=e;report(e);throw e;}
   finally{flight=null;emit();if(pending.length&&!error){firstAt??=now();schedule();}}
  })();active.promise=promise;return promise;
 }
 async function flush(){clear();while(count()||flight){if(error)throw error;await pump();clear();}if(error)throw error;publish();return view;}
 async function retry(){error=null;emit();return flush();}
 function history(direction){if(view?.[direction+'Kind']==='color')return null;const step=steps.peek(direction);if(!step)return null;const result=enqueue({kind:'history',label:direction==='undo'?'Undo design step':'Redo design step',operations:[{op:direction}],expectedPaletteRevision:view?.palette?.revision,localStep:{...step,moreRedo:steps.count.redo>1}});steps.move(direction);return result;}
 return {enqueue,accept,history,flush,retry,publish:()=>{if(deferred)publish();},get board(){return view||getBoard();},get pending(){return count()>0||!!flight;},get state(){return state();},get draft(){return {boardId:base?.id,expectedRevision:base?.revision,failedBatch:failed,actions:structuredClone(pending),document:view?.document};},dispose:()=>{clear();steps.clear();}};
}
