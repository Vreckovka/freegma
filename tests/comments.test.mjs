import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FreegmaStore} from '../server/store.mjs';
import {makeNode} from '../shared/design.mjs';
import {commentPosition,validateComments} from '../shared/comments.mjs';
import {callTool} from '../server/tools.mjs';
import {createServer} from '../server/http.mjs';
const alice={id:'alice',name:'Alice'},bob={id:'bob',name:'Bob'};
const setup=()=>{const store=new FreegmaStore(':memory:',{seed:false}),workspace=store.createWorkspace('Comment test'),frame=makeNode('frame',{x:100,y:200}),board=store.createBoard(workspace.id,'Board',{nodes:[frame]});return {store,workspace,frame,board};};
const edit=(store,b,op,actor=alice)=>store.comment(b.id,store.getBoard(b.id).commentsRevision,actor,op);
const create=(store,b,props={})=>edit(store,b,{op:'create',x:120,y:230,text:'Keep this feedback',...props});
test('comments use independent optimistic revisions and survive design undo/redo',()=>{
 const {store,frame,board}=setup();try{
  const initial=store.readBoard(board.id);let b=create(store,board);const thread=b.comments[0];assert.equal(b.commentsRevision,1);assert.equal(b.revision,board.revision);assert.deepEqual(store.readBoard(b.id).history,initial.history);
  b=edit(store,b,{op:'reply',threadId:thread.id,text:'Agree'},bob);assert.equal(b.comments[0].messages.length,2);
  b=store.mutate(b.id,b.revision,[{op:'update',id:frame.id,patch:{fill:'#abcdef'}}]);const revision=b.revision;
  b=edit(store,b,{op:'resolve',threadId:thread.id,resolved:true});assert.equal(b.revision,revision);
  b=store.travel(b.id,b.revision,'undo');assert.equal(b.comments[0].resolved,true);assert.equal(b.comments[0].messages[1].text,'Agree');assert.equal(b.document.nodes[0].fill,frame.fill);
  b=store.travel(b.id,b.revision,'redo');assert.equal(b.document.nodes[0].fill,'#abcdef');assert.equal(b.comments[0].resolved,true);
  const before=store.readBoard(b.id);assert.throws(()=>store.comment(b.id,0,alice,{op:'create',x:1,y:1,text:'stale'}),e=>e.status===409);assert.deepEqual(store.readBoard(b.id),before);
 }finally{store.close();}
});
test('authors own edits and recoverable deletions; reactions toggle and threads reopen',()=>{
 const {store,board}=setup();try{let b=create(store,board),t=b.comments[0],root=t.messages[0];b=edit(store,b,{op:'reply',threadId:t.id,text:'A reply'},bob);const reply=b.comments[0].messages[1];
  assert.throws(()=>edit(store,b,{op:'edit',threadId:t.id,messageId:root.id,text:'Hijack'},bob),e=>e.status===403);
  assert.throws(()=>edit(store,b,{op:'deleteThread',threadId:t.id},bob),e=>e.status===403);
  b=edit(store,b,{op:'edit',threadId:t.id,messageId:root.id,text:'Updated'});assert.equal(b.comments[0].messages[0].text,'Updated');
  b=edit(store,b,{op:'react',threadId:t.id,messageId:root.id,emoji:'👍'},bob);assert.equal(b.comments[0].messages[0].reactions['👍'][0].id,bob.id);
  b=edit(store,b,{op:'react',threadId:t.id,messageId:root.id,emoji:'👍'},bob);assert.deepEqual(b.comments[0].messages[0].reactions,{});
  b=edit(store,b,{op:'deleteMessage',threadId:t.id,messageId:reply.id},bob);assert.equal(store.listComments({boardId:b.id}).threads[0].messages.length,1);
  b=edit(store,b,{op:'restoreMessage',threadId:t.id,messageId:reply.id},bob);assert.equal(b.comments[0].messages[1].deleted,false);
  b=edit(store,b,{op:'resolve',threadId:t.id,resolved:true},bob);assert.deepEqual(b.comments[0].resolvedBy,bob);
  b=edit(store,b,{op:'resolve',threadId:t.id,resolved:false});assert.equal(b.comments[0].resolvedBy,null);
  b=edit(store,b,{op:'deleteMessage',threadId:t.id,messageId:root.id});assert.equal(b.comments[0].deleted,true);assert.equal(store.listComments({boardId:b.id}).threads.length,0);
  b=edit(store,b,{op:'restoreThread',threadId:t.id});assert.equal(b.comments[0].messages.length,2);assert.equal(store.listComments({boardId:b.id}).threads.length,1);
 }finally{store.close();}
});
test('frame anchors follow movement, measured layout and detach when layers are removed',()=>{
 const {store,frame,board}=setup();try{let b=create(store,board,{anchor:{nodeId:frame.id,offsetX:20,offsetY:30},region:{width:100,height:80}});let t=b.comments[0];assert.deepEqual(commentPosition(t,b.document),{x:120,y:230});
  b=store.mutate(b.id,b.revision,[{op:'update',id:frame.id,patch:{x:500,y:600}}]);assert.deepEqual(commentPosition(t,b.document),{x:520,y:630});assert.deepEqual(commentPosition(t,b.document,new Map([[frame.id,{x:50,y:60}]])),{x:70,y:90});
  const rev=b.commentsRevision;b=store.mutate(b.id,b.revision,[{op:'remove',id:frame.id}]);t=b.comments[0];assert.equal(t.anchor,null);assert.equal(b.commentsRevision,rev+1);assert.deepEqual(commentPosition(t,b.document),{x:520,y:630});
  b=store.travel(b.id,b.revision,'undo');assert.equal(b.comments[0].anchor,null);assert.equal(b.document.nodes.length,1);
  b=edit(store,b,{op:'move',threadId:t.id,x:700,y:800});assert.equal(b.comments[0].x,700);assert.equal(b.comments[0].region,null);
 }finally{store.close();}
});
test('invalid comments roll back atomically and portable files retain discussions without React pollution',()=>{
 const {store,board,frame}=setup();try{let b=create(store,board,{anchor:{nodeId:frame.id,offsetX:20,offsetY:30}}),before=store.readBoard(b.id);for(const op of [{op:'create',x:NaN,y:0,text:'Bad'},{op:'create',x:0,y:0,text:' '},{op:'create',x:0,y:0,text:'Bad',anchor:{nodeId:'missing',offsetX:0,offsetY:0}},{op:'react',threadId:b.comments[0].id,messageId:b.comments[0].messages[0].id,emoji:'__proto__'}]){assert.throws(()=>edit(store,b,op));assert.deepEqual(store.readBoard(b.id),before);}
  assert.doesNotMatch(store.export(b.id).jsxCode,/Keep this feedback|comment_/);
  const packageFile=store.exportFree(b.id,'board').package,copy=store.importFree(packageFile).boards[0];assert.notEqual(copy.id,b.id);assert.deepEqual(copy.comments,b.comments);assert.equal(copy.commentsRevision,b.commentsRevision);assert.equal(copy.comments[0].anchor.nodeId,frame.id);
  const invalid=structuredClone(packageFile);invalid.boards[0].comments[0].messages[0].text='';assert.throws(()=>store.importFree(invalid));assert.equal(store.workspaces().length,2);
  assert.throws(()=>validateComments(b.comments,-1));
 }finally{store.close();}
});
test('multiple store clients and rebuilt SQLite indexes read comments from canonical .free files',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-comments-test-')),db=path.join(root,'index.sqlite');let a,b;
 try{a=new FreegmaStore(db,{seed:false});const w=a.createWorkspace('Project'),board=a.createBoard(w.id,'Board');b=new FreegmaStore(db,{seed:false});const initial=b.getBoard(board.id);const updated=create(a,board);assert.equal(b.getBoard(board.id).commentsRevision,1);assert.throws(()=>b.comment(board.id,initial.commentsRevision,bob,{op:'create',x:1,y:1,text:'Conflict'}),e=>e.status===409);b.close();b=null;a.close();a=null;
  for(const suffix of ['', '-wal','-shm'])if(fs.existsSync(db+suffix))fs.unlinkSync(db+suffix);
  a=new FreegmaStore(db,{seed:false});assert.deepEqual(a.getBoard(board.id).comments,updated.comments);assert.deepEqual(a.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(x=>x.name),['file_refs','settings']);
 }finally{b?.close();a?.close();fs.rmSync(root,{recursive:true,force:true});}
});
test('HTTP and MCP share comments revisions and workspace deep links',async()=>{
 const {store,workspace,board}=setup(),server=createServer({store});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{const post=body=>fetch(origin+'/api/boards/'+board.id+'/comments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});let response=await post({expectedCommentsRevision:0,actor:alice,operation:{op:'create',x:5,y:6,text:'HTTP feedback'}});assert.equal(response.status,200);let b=await response.json();b=callTool(store,'freegma_comment',{boardId:b.id,expectedCommentsRevision:b.commentsRevision,actor:bob,operation:{op:'reply',threadId:b.comments[0].id,text:'MCP reply'}});
  response=await post({expectedCommentsRevision:0,actor:alice,operation:{op:'create',x:0,y:0,text:'stale'}});assert.equal(response.status,409);
  const list=await(await fetch(origin+'/api/workspaces/'+workspace.id+'/comments')).json();assert.equal(list.threads[0].messages[1].text,'MCP reply');assert.equal(list.threads[0].url,origin+'/w/'+workspace.id+'/b/'+board.id+'?comment='+b.comments[0].id);
  assert.equal(callTool(store,'freegma_list_comments',{boardId:board.id}).threads.length,1);assert.throws(()=>callTool(store,'freegma_list_comments',{}));
 }finally{await new Promise(r=>server.close(r));store.close();}
});
