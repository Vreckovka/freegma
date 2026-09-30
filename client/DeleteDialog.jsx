import React,{useState} from 'react';
import {Icon} from './icons.jsx';

export function DeleteDialog({preview,busy,onCancel,onDelete}){
  const [name,setName]=useState(''),[error,setError]=useState('');
  const label=preview.kind==='board'?'board':'workspace';
  return <div className="dialog-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onCancel();}}>
    <form className="studio-dialog delete-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title" onSubmit={async e=>{e.preventDefault();setError('');try{await onDelete(preview,name);}catch(e){setError(e.message);}}}>
      <div className="dialog-title"><h2 id="delete-title">Delete {label}?</h2><button type="button" aria-label="Close deletion dialog" disabled={busy} onClick={onCancel}><Icon name="close"/></button></div>
      <p><strong>{preview.name}</strong></p>
      <p>{preview.kind==='workspace'?`${preview.workspaces} workspace${preview.workspaces===1?'':'s'} · ${preview.boards} boards · ${preview.components} components · ${preview.assets} assets`:'This removes the board, its comments and edit history. Shared library components and assets stay in the workspace.'}</p>
      {preview.kind==='workspace'&&<p>Includes every child workspace and its boards, library and assets.</p>}
      <p>A local recovery copy will be kept in the storage <code>.trash</code> folder. Canvas Undo does not restore deleted boards or workspaces.</p>
      <label>Type <strong>{preview.name}</strong> to confirm<input aria-label="Confirm deletion name" value={name} autoFocus disabled={busy} onChange={e=>setName(e.target.value)}/></label>
      {error&&<p className="delete-error" role="alert">{error}</p>}
      <div className="dialog-actions"><button type="button" disabled={busy} onClick={onCancel}>Cancel</button><button className="danger-button" type="submit" disabled={busy||name!==preview.name}>{busy?'Deleting…':'Delete '+label}</button></div>
    </form>
  </div>;
}
