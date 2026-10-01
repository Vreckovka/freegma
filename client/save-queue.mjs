// Acknowledged board + ordered unsaved actions. A reply can never replace the
// newer actions: they are replayed over that reply before it is published.
export const SAVE_LIMITS={quietMs:500,maxWaitMs:2000,maxActions:25,maxOperations:1000,maxBytes:256*1024,maxPendingActions:250,maxPendingBytes:8*1024*1024};
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
export function createSaveQueue({getBoard,apply,send,onBoard,onState=()=>{},canPublish=()=>true,onError=()=>{},now=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout,id=()=>crypto.randomUUID(),limits=SAVE_LIMITS}){
 let base=null,view=null,pending=[],flight=null,failed=null,error=null,timer=null,firstAt=null,saved=0,total=0,deferred=false;
 const count=()=>pending.length;
 const state=()=>({phase:error?'error':flight?'saving':count()?'scheduled':total?'saved':'idle',pending:count(),saved,total,error});
 const report=e=>{try{onError(e);}catch{}};
 const emit=()=>{try{onState(state());}catch(e){report(e);}};
 function clear(){if(timer!==null)clearTimer(timer);timer=null;}
 function publish(force=false){if(!view)return;if(force||canPublish()){try{onBoard(view);deferred=false;}catch(e){deferred=true;report(e);}}else deferred=true;}
 function accept(board){if(pending.length||flight||failed)return;if(base?.id!==board?.id){saved=0;total=0;}base=board;view=board;error=null;emit();}
 function schedule(){
  clear();if(!count()||flight||error)return;
  const operations=pending.reduce((n,a)=>n+a.operations.length,0),full=count()>=limits.maxActions||operations>=limits.maxOperations||bytes(pending)>=limits.maxBytes;
  timer=setTimer(()=>{timer=null;pump().catch(()=>{});},full?0:Math.max(0,Math.min(limits.quietMs,limits.maxWaitMs-(now()-firstAt))));
 }
 function enqueue(action){
  const current=view||getBoard();if(!current)throw Error('Choose a board first.');
  if(!base||base.id!==current.id){if(pending.length||flight)throw Error('Save the current board before switching.');accept(current);}
  const stable=structuredClone(action),next=apply(current,stable);
  if(JSON.stringify(next.document)===JSON.stringify(current.document))return current;
  if(stable.operations.length>limits.maxOperations||bytes(stable)>limits.maxPendingBytes||count()>=limits.maxPendingActions||bytes([...pending,stable])>limits.maxPendingBytes)throw Error('Too many unsaved changes. Wait for saving or retry before editing more.');
  if(!count()&&!flight&&!error){firstAt=now();saved=0;total=0;}
  pending.push(stable);view=next;total++;publish(true);emit();schedule();return view;
 }
 function prefix(){let size=2,operations=0,n=0;for(const action of pending){const extra=bytes(action)+1;if(n&&(n>=limits.maxActions||operations+action.operations.length>limits.maxOperations||size+extra>limits.maxBytes))break;size+=extra;operations+=action.operations.length;n++;}return pending.slice(0,n);}
 async function pump(){
  clear();if(flight)return flight.promise;if(error)throw error;if(!count())return view;
  const request=failed||{boardId:base.id,expectedRevision:base.revision,batchId:id(),actions:prefix()};
  const active={request,promise:null};flight=active;emit();
  const promise=(async()=>{
   try{
    const reply=await send(request);
    if(!reply||reply.id!==request.boardId||!Number.isSafeInteger(reply.revision)||reply.revision<request.expectedRevision)throw Error('Invalid save acknowledgement. The draft is retained.');
    // Do not remove edits that arrived while the request was in flight.
    const remaining=pending.slice(request.actions.length);
    let rebased=reply;for(const action of remaining)rebased=apply(rebased,action);
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
 return {enqueue,accept,flush,retry,publish:()=>{if(deferred)publish();},get board(){return view||getBoard();},get pending(){return count()>0||!!flight;},get state(){return state();},get draft(){return {boardId:base?.id,expectedRevision:base?.revision,failedBatch:failed,actions:structuredClone(pending),document:view?.document};},dispose:clear};
}
