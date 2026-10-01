// Recent completed steps only. No server history preload and no intermediate
// pointer/color-picker frames. Snapshots share immutable document references.
export const STEP_LIMITS={steps:20,bytes:32*1024*1024,ttlMs:5*60*1000};
export function createStepCache({limits=STEP_LIMITS,now=()=>Date.now()}={}){
 let undo=[],redo=[],used=0;
 const weights=new WeakMap(),size=d=>{if(!weights.has(d))weights.set(d,new TextEncoder().encode(JSON.stringify(d)).length);return weights.get(d);};
 function clear(){undo=[];redo=[];used=0;}
 function trim(){while(undo.length+redo.length>limits.steps||used>limits.bytes){const stack=undo.length?undo:redo;const entry=stack.shift();used-=entry.bytes;}}
 function prune(){if([...undo,...redo].some(e=>now()-e.at>limits.ttlMs))clear();}
 return {clear,record(before,after){prune();used-=redo.reduce((n,e)=>n+e.bytes,0);redo=[];const bytes=size(before.document)+size(after.document);if(bytes>limits.bytes){clear();return;}undo.push({before:before.document,after:after.document,beforeState:{canUndo:before.canUndo,canRedo:before.canRedo,undoKind:before.undoKind,redoKind:before.redoKind},at:now(),bytes});used+=bytes;trim();},
  peek(direction){prune();return (direction==='undo'?undo:redo).at(-1)||null;},
  move(direction){prune();const from=direction==='undo'?undo:redo,to=direction==='undo'?redo:undo,e=from.pop();if(!e)return null;to.push(e);return e;},
  get count(){prune();return {undo:undo.length,redo:redo.length,bytes:used};}};
}
export function applyCachedStep(board,action){const direction=action.operations[0].op,step=action.localStep;if(!step)throw Error('Cached history step is unavailable. Your draft is retained.');const expected=direction==='undo'?step.after:step.before;
 if(JSON.stringify(board.document)!==JSON.stringify(expected))throw Error('The cached step changed during saving. Your draft is retained.');
 return {...board,document:direction==='undo'?step.before:step.after,...(direction==='undo'?{...step.beforeState,designCanUndo:!!step.beforeState.canUndo,designCanRedo:true,canRedo:true,redoKind:'design'}:{designCanUndo:true,canUndo:true,undoKind:'design',designCanRedo:!!step.moreRedo,canRedo:!!step.moreRedo,redoKind:'design'})};
}
export const wireAction=({localStep,...action})=>action;
