import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {FreegmaStore} from '../server/store.mjs';
import {makeNode} from '../shared/design.mjs';
import {createServer} from '../server/http.mjs';
import {callTool} from '../server/tools.mjs';

test('board deletion retains exact recovery file, shared library and siblings; stays deleted after reindex',()=>{
  const s=new FreegmaStore(':memory:',{seed:false});try{
    const w=s.createWorkspace('Project'),b=s.createBoard(w.id,'Board',{nodes:[makeNode('frame')]}),other=s.createBoard(w.id,'Other');
    s.saveComponent(b.id,b.revision,b.document.nodes[0].id,'Card','component');
    const bytes=fs.readFileSync(b.filePath),p=s.deletionPreview('board',b.id);
    assert.throws(()=>s.deleteDesign('board',b.id,{...p,confirmName:'wrong'}),/exact name/);
    const result=callTool(s,'freegma_delete_design',{kind:'board',id:b.id,confirmationToken:p.confirmationToken,confirmName:p.name});
    assert.deepEqual(fs.readFileSync(path.join(result.recoveryPath,w.id,'b',b.id+'.free')),bytes);
    assert.throws(()=>s.getBoard(b.id),e=>e.status===404);assert.equal(s.components(w.id).length,1);assert.equal(s.getBoard(other.id).name,'Other');
    s.transaction(()=>s.reindex());assert.equal(s.boards(w.id).length,1);
  }finally{s.close();}
});

test('parent workspace deletion includes descendants and files but preserves siblings',()=>{
  const s=new FreegmaStore(':memory:',{seed:false});try{
    const root=s.createWorkspace('Parent'),child=s.createWorkspace('Child',root.id),grand=s.createWorkspace('Nested',child.id),other=s.createWorkspace('Other');
    for(const w of [root,child,grand,other])s.createBoard(w.id,'Board');
    const p=s.deletionPreview('workspace',root.id);assert.equal(p.workspaces,3);assert.equal(p.boards,3);
    const result=s.deleteDesign('workspace',root.id,{confirmationToken:p.confirmationToken,confirmName:p.name});
    assert.equal(result.workspaceIds.length,3);s.transaction(()=>s.reindex());assert.deepEqual(s.workspaces().map(w=>w.id),[other.id]);
    assert.ok(fs.existsSync(path.join(result.recoveryPath,grand.id,grand.id+'.free')));
  }finally{s.close();}
});

test('new edits, comments and descendants invalidate a pending deletion confirmation',()=>{
  const s=new FreegmaStore(':memory:',{seed:false});try{
    const w=s.createWorkspace('Project'),b=s.createBoard(w.id,'Board'),p=s.deletionPreview('board',b.id);
    s.comment(b.id,0,{id:'me',name:'Me'},{op:'create',x:1,y:1,text:'Keep this'});
    assert.throws(()=>s.deleteDesign('board',b.id,{confirmationToken:p.confirmationToken,confirmName:p.name}),e=>e.status===409);
    const scope=s.deletionPreview('workspace',w.id);s.createWorkspace('New child',w.id);
    assert.throws(()=>s.deleteDesign('workspace',w.id,{confirmationToken:scope.confirmationToken,confirmName:scope.name}),e=>e.status===409);
    assert.equal(s.getBoard(b.id).comments.length,1);
  }finally{s.close();}
});

test('interrupted deletion rolls forward from journal, retaining a recovery copy',()=>{
  const s=new FreegmaStore(':memory:',{seed:false});try{
    const w=s.createWorkspace('Project'),b=s.createBoard(w.id,'Board'),p=s.deletionPreview('board',b.id),publish=s.files.publish.bind(s.files);
    let count=0;s.files.publish=e=>{if(++count===2)throw Error('Simulated crash');return publish(e);};
    assert.throws(()=>s.deleteDesign('board',b.id,{confirmationToken:p.confirmationToken,confirmName:p.name}),/Simulated crash/);
    s.files.publish=publish;assert.equal(s.boards(w.id).length,0);assert.throws(()=>s.getBoard(b.id),e=>e.status===404);
    assert.ok(fs.readdirSync(path.join(s.files.root,'.trash')).length);assert.ok(!fs.existsSync(path.join(s.files.root,'.transaction.json')));
  }finally{s.close();}
});

test('deleting the final workspace remains empty after reopening the database',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-delete-')),db=path.join(folder,'index.sqlite');let s;
  try{s=new FreegmaStore(db);const w=s.workspaces()[0],p=s.deletionPreview('workspace',w.id);s.deleteDesign('workspace',w.id,{confirmationToken:p.confirmationToken,confirmName:p.name});s.close();s=new FreegmaStore(db);assert.equal(s.workspaces().length,0);}
  finally{s?.close();fs.rmSync(folder,{recursive:true,force:true});}
});

test('HTTP deletion requires an exact fresh confirmation and rejects cross-origin deletion',async()=>{
  const s=new FreegmaStore(':memory:',{seed:false}),w=s.createWorkspace('Project'),b=s.createBoard(w.id,'Board'),server=createServer({store:s});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  try{
    const preview=await (await fetch(origin+'/api/boards/'+b.id+'/deletion')).json(),url=origin+'/api/boards/'+b.id,body=JSON.stringify({confirmName:preview.name,confirmationToken:preview.confirmationToken});
    assert.equal((await fetch(url,{method:'DELETE',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body})).status,403);
    assert.equal((await fetch(url,{method:'DELETE',headers:{'Content-Type':'application/json'},body:'{}'})).status,400);
    assert.equal((await fetch(url,{method:'DELETE',headers:{'Content-Type':'application/json'},body})).status,200);
    assert.equal((await fetch(url)).status,404);
  }finally{await new Promise(r=>server.close(r));s.close();}
});
