import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FreegmaStore} from '../server/store.mjs';
import {makeNode} from '../shared/design.mjs';
import {themeColors,colorHistoryState} from '../shared/colors.mjs';
import {callTool} from '../server/tools.mjs';
const fixture=()=>{const s=new FreegmaStore(':memory:',{seed:false}),root=s.createWorkspace('Project'),w=s.createWorkspace('Child',root.id),n=makeNode('frame',{fill:'#101219',colorBindings:[{path:'fill',token:'background',source:'#101219'}]}),b=s.createBoard(w.id,'Board',{nodes:[n]});return {s,root,w,n,b};};
const color=(s,w,value)=>s.updateColors(w.id,s.colors(w.id).revision,{op:'setColor',key:'background',value});
const travel=(s,b,direction)=>{const current=s.getBoard(b.id);return s.travel(b.id,current.revision,direction,current.palette.revision);};
test('accepted project color is one undoable action without rewriting any board, and is inherited on navigation',()=>{
 const {s,root,w,n,b}=fixture();try{const sibling=s.createWorkspace('Sibling',root.id),other=s.createBoard(sibling.id,'Other',{nodes:[makeNode('frame')]}),original=fs.readFileSync(b.filePath),otherOriginal=fs.readFileSync(other.filePath);
  let p=color(s,w,'#123456');assert.equal(p.colorHistory.cursor,1);assert.equal(p.colorHistory.entries.length,1);assert.deepEqual(fs.readFileSync(b.filePath),original);assert.deepEqual(fs.readFileSync(other.filePath),otherOriginal);assert.equal(themeColors(s.colors(sibling.id)).background,'#123456');
  let current=s.getBoard(b.id);assert.equal(current.undoKind,'color');assert.equal(current.canUndo,true);assert.equal(current.revision,b.revision);
  current=travel(s,b,'undo');assert.equal(themeColors(current.palette).background,'#101219');assert.equal(current.redoKind,'color');assert.equal(current.revision,b.revision);assert.deepEqual(current.document,b.document);
  current=travel(s,b,'redo');assert.equal(themeColors(current.palette).background,'#123456');assert.deepEqual(fs.readFileSync(b.filePath),original);
  const revision=current.palette.revision;p=color(s,w,'#123456');assert.equal(p.revision,revision);assert.equal(p.colorHistory.entries.length,1);
  assert.equal(s.history(b.id)[0].kind,'color');
 }finally{s.close();}
});
test('palette and design Undo/Redo interleave chronologically; new changes discard redo branches',()=>{
 const {s,w,n,b}=fixture();try{
  color(s,w,'#112233');let current=s.getBoard(b.id);current=s.mutate(b.id,current.revision,[{op:'update',id:n.id,patch:{x:42}}]);assert.equal(current.undoKind,'design');
  current=travel(s,b,'undo');assert.equal(current.document.nodes[0].x,0);assert.equal(current.undoKind,'color');current=travel(s,b,'undo');assert.equal(themeColors(current.palette).background,'#101219');assert.equal(current.redoKind,'color');
  current=travel(s,b,'redo');assert.equal(themeColors(current.palette).background,'#112233');assert.equal(current.redoKind,'design');current=travel(s,b,'redo');assert.equal(current.document.nodes[0].x,42);
  color(s,w,'#445566');current=travel(s,b,'undo');assert.equal(current.redoKind,'color');current=s.mutate(b.id,current.revision,[{op:'update',id:n.id,patch:{y:33}}]);assert.equal(current.palette.colorHistory.entries.length,1);assert.equal(current.canRedo,false);
  current=travel(s,b,'undo');assert.equal(current.document.nodes[0].y,0);color(s,w,'#778899');current=s.getBoard(b.id);assert.equal(current.canRedo,false);current=travel(s,b,'undo');assert.equal(current.canRedo,true);assert.equal(current.redoKind,'color');assert.equal(colorHistoryState(current,current.palette).redoKind,'color');
 }finally{s.close();}
});
test('stale color undo conflicts atomically and portable palettes retain independent color history',()=>{
 const {s,root,w,b}=fixture();try{color(s,w,'#abcdef');let current=s.getBoard(b.id);assert.throws(()=>s.travel(b.id,current.revision,'undo',current.palette.revision-1),e=>e.status===409);assert.equal(themeColors(s.colors(w.id)).background,'#abcdef');
  const copy=s.importFree(s.exportFree(w.id).package),other=copy.boards[0];assert.deepEqual(other.palette.colorHistory,current.palette.colorHistory);const restored=travel(s,other,'undo');assert.equal(themeColors(restored.palette).background,'#101219');assert.equal(themeColors(s.colors(w.id)).background,'#abcdef');
  current=callTool(s,'freegma_undo',{boardId:b.id,expectedRevision:current.revision,expectedPaletteRevision:current.palette.revision});assert.equal(themeColors(current.palette).background,'#101219');
  const invalid=s.exportFree(root.id).package;invalid.workspace.colorSystem.colorHistory.cursor=999;assert.throws(()=>s.importFree(invalid));
 }finally{s.close();}
});
test('validated file cache avoids repeated parsing, isolates caller edits, and detects other store writes',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-color-cache-')),db=path.join(folder,'index.sqlite');let a,b;
 try{a=new FreegmaStore(db,{seed:false});const w=a.createWorkspace('Project'),board=a.createBoard(w.id,'Board',{nodes:[makeNode('frame')]});a.getBoard(board.id);let reads=0;const read=a.files.json.bind(a.files);a.files.json=(...args)=>{reads++;return read(...args);};
  a.getBoard(board.id);a.getBoard(board.id);assert.equal(reads,0);const returned=a.getBoard(board.id);returned.document.nodes[0].fill='#ff0000';assert.notEqual(a.getBoard(board.id).document.nodes[0].fill,'#ff0000');
  b=new FreegmaStore(db,{seed:false});color(b,w,'#123456');assert.equal(themeColors(a.getBoard(board.id).palette).background,'#123456');assert.ok(reads>0);let fresh=b.getBoard(board.id);b.mutate(fresh.id,fresh.revision,[{op:'update',id:fresh.document.nodes[0].id,patch:{x:91}}]);assert.equal(a.getBoard(board.id).document.nodes[0].x,91);
 }finally{b?.close();a?.close();assert.ok(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep+'freegma-color-cache-'));fs.rmSync(folder,{recursive:true,force:true});}
});
