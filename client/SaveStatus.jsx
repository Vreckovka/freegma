import React from 'react';
export function SaveStatus({state,busy,preview,board,onRetry,onCopy}){
 const phase=busy?'saving':state.phase,working=phase==='saving'||phase==='scheduled',error=phase==='error';
 const label=busy?'Updating…':error?'Save paused':working?(phase==='scheduled'?'Save scheduled':'Saving…')+(state.boards>1?` · ${state.boards} boards`:state.total?` ${state.saved} / ${state.total}`:''):preview?'Color preview':board?'Saved':'Local workspace';
 return <span className={'save-status '+(working?'working':error?'failed':'complete')} role="status" aria-live="polite" aria-atomic="true" title={busy?'Applying the requested history or component action.':error?state.error?.message:working?'Completed changes are being saved. You can keep editing.':board?'All completed edits are saved.':''}>
  {working?<svg className="save-spinner" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/></svg>:board&&!error&&!preview?<svg className="save-check" viewBox="0 0 20 20" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg>:<i/>}<span>{label}</span>
  {error&&<><button type="button" onClick={onRetry}>Retry</button><button type="button" onClick={onCopy}>Copy unsaved edits</button></>}
 </span>;
}
