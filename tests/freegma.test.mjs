import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {FreegmaStore} from '../server/store.mjs';
import {createServer,defaultBuild} from '../server/http.mjs';
import {rpc,callTool} from '../server/tools.mjs';
import {makeNode,subtree,applyOperations,generateReact,selectionRoots,VERSION,reactComponentName} from '../shared/design.mjs';
import {createRequire} from 'node:module';
const dependencies=async()=>({require:createRequire(import.meta.url)});
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
function fixture(){const store=new FreegmaStore(':memory:',{seed:false}),w=store.createWorkspace('Studio'),b=store.createBoard(w.id,'Board');return {store,w,b};}

test('invalid batches roll back all operations and history; stale edits conflict',()=>{
  const {store,b}=fixture();try{
    const frame=makeNode('frame'),child=makeNode('frame',{parentId:frame.id});
    const saved=store.mutate(b.id,b.revision,[{op:'add',node:frame},{op:'add',node:child}]);
    assert.throws(()=>store.mutate(b.id,saved.revision,[{op:'update',id:frame.id,patch:{fill:'#123456'}},{op:'update',id:frame.id,patch:{parentId:child.id}}]),/cycles/);
    assert.deepEqual(store.getBoard(b.id),saved);
    assert.equal(store.history(b.id).length,1);
    assert.throws(()=>store.mutate(b.id,b.revision,[{op:'remove',id:frame.id}]),e=>e.status===409);
    assert.throws(()=>store.mutate(b.id,saved.revision,[{op:'update',id:frame.id,patch:{fill:'url(https://example.com)'}}]),/fill/);
  }finally{store.close();}
});
test('nested documents clone correctly even when a child precedes its parent',()=>{
  const root=makeNode('frame'),child=makeNode('text',{parentId:root.id}),doc={nodes:[child,root]};
  const tree=subtree(doc,root.id);assert.equal(tree.nodes[0].id,root.id);assert.equal(tree.nodes[1].parentId,root.id);
  const duplicate=applyOperations(doc,[{op:'duplicate',id:root.id}]);assert.equal(duplicate.nodes.length,4);
  assert.equal(duplicate.nodes[3].parentId,duplicate.nodes[2].id);
});
test('reordering works in both directions without changing descendants',()=>{
  const a=makeNode('frame'),b=makeNode('frame'),c=makeNode('frame'),child=makeNode('text',{parentId:a.id});
  const moved=applyOperations({nodes:[a,child,b,c]},[{op:'reorder',id:a.id,index:2}]);
  assert.deepEqual(moved.nodes.filter(n=>!n.parentId).map(n=>n.id),[b.id,c.id,a.id]);
  assert.equal(moved.nodes.find(n=>n.id===child.id).parentId,a.id);
  assert.deepEqual(applyOperations(moved,[{op:'reorder',id:a.id,index:0}]).nodes.filter(n=>!n.parentId).map(n=>n.id),[a.id,b.id,c.id]);
});
test('removing a multiselection containing an ancestor and distant descendant is atomic',()=>{
  const root=makeNode('frame'),child=makeNode('frame',{parentId:root.id}),grandchild=makeNode('text',{parentId:child.id}),other=makeNode('ellipse'),doc={nodes:[root,child,grandchild,other]};
  const ids=selectionRoots(doc.nodes,[root.id,grandchild.id]);assert.deepEqual(ids,[root.id]);
  assert.deepEqual(applyOperations(doc,ids.map(id=>({op:'remove',id}))).nodes,[other]);
});
test('SQLite survives reopening; shared history supports undo, redo and redo branching',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-')),file=path.join(folder,'design.sqlite');let store;
  try{store=new FreegmaStore(file,{seed:false});const w=store.createWorkspace('Persistent'),b=store.createBoard(w.id,'Board'),n=makeNode('text');let saved=store.mutate(b.id,b.revision,[{op:'add',node:n}]);store.close();store=new FreegmaStore(file,{seed:false});assert.equal(store.getBoard(b.id).document.nodes[0].text,'Your text');
    saved=store.travel(b.id,saved.revision,'undo');assert.equal(saved.document.nodes.length,0);assert.equal(saved.canRedo,true);
    saved=store.travel(b.id,saved.revision,'redo');assert.equal(saved.document.nodes.length,1);
    saved=store.travel(b.id,saved.revision,'undo');saved=store.mutate(b.id,saved.revision,[{op:'add',node:makeNode('ellipse')}]);assert.equal(saved.canRedo,false);
    const other=new FreegmaStore(file,{seed:false});try{assert.equal(other.getBoard(b.id).revision,saved.revision);assert.throws(()=>other.mutate(b.id,1,[{op:'add',node:n}]),e=>e.status===409);}finally{other.close();}
  }finally{store?.close();fs.rmSync(folder,{recursive:true,force:true});}
});
test('components propagate changes while preserving overrides, stable IDs and positions',()=>{
  const {store,w,b}=fixture();try{
    const root=makeNode('frame',{fill:'#111111'}),text=makeNode('text',{parentId:root.id,text:'Default'});
    let master=store.mutate(b.id,b.revision,[{op:'add',node:root},{op:'add',node:text}]);
    const published=store.saveComponent(b.id,master.revision,root.id,'Card');master=published.board;
    const target=store.createBoard(w.id,'Instances'),inserted=store.insertComponent(target.id,target.revision,published.component.id,{x:500,y:600}),instanceText=inserted.board.document.nodes.find(n=>n.sourceId===text.id);
    store.mutate(target.id,inserted.board.revision,[{op:'override',id:instanceText.id,property:'text',enabled:true},{op:'update',id:instanceText.id,patch:{text:'Override'}}]);
    const newChild=makeNode('icon',{parentId:root.id});master=store.mutate(b.id,master.revision,[{op:'update',id:root.id,patch:{fill:'#abcdef'}},{op:'update',id:text.id,patch:{fontSize:32,text:'Changed'}},{op:'add',node:newChild}]);
    store.saveComponent(b.id,master.revision,root.id,'Card','component',published.component.id);
    const result=store.getBoard(target.id),instance=result.document.nodes.find(n=>n.id===inserted.nodeId),label=result.document.nodes.find(n=>n.id===instanceText.id);
    assert.equal(instance.x,500);assert.equal(instance.y,600);assert.equal(instance.fill,'#abcdef');assert.equal(label.text,'Override');assert.equal(label.fontSize,32);assert.equal(result.document.nodes.length,3);
    const w2=store.createWorkspace('Other'),b2=store.createBoard(w2.id,'Isolated');assert.throws(()=>store.insertComponent(b2.id,b2.revision,published.component.id),/another workspace/);
  }finally{store.close();}
});
test('templates are independent and image assets cannot cross workspace boundaries',()=>{
  const {store,w,b}=fixture();try{
    const n=makeNode('frame');let master=store.mutate(b.id,b.revision,[{op:'add',node:n}]);const template=store.saveComponent(b.id,master.revision,n.id,'Template','template');
    assert.equal(template.board.document.nodes[0].componentMasterId,undefined);
    const insert=store.insertComponent(b.id,template.board.revision,template.component.id);assert.equal(insert.board.document.nodes.find(n=>n.id===insert.nodeId).componentId,undefined);
    const asset=store.addAsset(w.id,{filename:'reference.png',mime:'image/png',base64:png});const other=store.createWorkspace('Other'),target=store.createBoard(other.id,'Board');
    assert.throws(()=>store.mutate(target.id,target.revision,[{op:'add',node:makeNode('image',{src:asset.src})}]),/workspace/);
    assert.throws(()=>store.addAsset(w.id,{mime:'image/png',base64:Buffer.from('not an image').toString('base64')}),/MIME/);
    assert.equal(store.asset(asset.id).bytes.length,Buffer.from(png,'base64').length);
  }finally{store.close();}
});
test('React export compiles escaped text, quoted image names, real icons and negative coordinates',async()=>{
  const root=makeNode('frame',{x:-100,y:-20,layout:'vertical',gap:12,paddingLeft:20}),text=makeNode('text',{parentId:root.id,text:'<script> "quote" {expression}'}),image=makeNode('image',{parentId:root.id,src:'/assets/asset_1',name:'a "quoted" image'}),icon=makeNode('icon',{parentId:root.id,icon:'folder'});
  const doc={nodes:[root,text,image,icon]},result=generateReact(doc),{require}=await dependencies();require('esbuild').transformSync(result.code,{loader:'jsx'});
  assert.match(result.code,/<svg/);assert.match(result.code,/"left":0/);assert.match(result.code,/"gap":12/);assert.deepEqual(result.assets,['/assets/asset_1']);
  assert.throws(()=>generateReact(doc,'missing'),/not found/);assert.equal(generateReact(doc,root.id).filename,'Frame.jsx');
});
test('MCP exposes board resources, consistent links, task metadata and conflicts as tool errors',()=>{
  const {store,w,b}=fixture();try{
    assert.equal(rpc(store,{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25'}}).result.protocolVersion,'2025-11-25');
    const linked=callTool(store,'freegma_link_task',{boardId:b.id,expectedRevision:b.revision,taskRef:'DASH-622'});assert.equal(linked.taskRef,'DASH-622');assert.match(linked.url,new RegExp('/w/'+w.id+'/b/'+b.id));
    const stale=rpc(store,{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'freegma_apply_operations',arguments:{boardId:b.id,expectedRevision:1,operations:[{op:'add',node:makeNode('text')}]}}});assert.equal(stale.result.isError,true);
    const resource=rpc(store,{jsonrpc:'2.0',id:3,method:'resources/read',params:{uri:'freegma://board/'+b.id}});assert.equal(JSON.parse(resource.result.contents[0].text).taskRef,'DASH-622');
  }finally{store.close();}
});
test('real stdio MCP handshake and tools work with clean JSON-only stdout',async(t)=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-mcp-')),child=spawn(process.execPath,['server/mcp.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,FREEGMA_DB:path.join(folder,'design.sqlite')},stdio:['pipe','pipe','pipe']});
  t.after(()=>{child.kill();});let buffer='',id=0;const waiting=new Map();child.stdout.on('data',chunk=>{buffer+=chunk;let at;while((at=buffer.indexOf('\n'))>=0){const message=JSON.parse(buffer.slice(0,at));buffer=buffer.slice(at+1);const callback=waiting.get(message.id);if(callback){waiting.delete(message.id);callback(message);}}});child.stderr.resume();
  const request=(method,params)=>new Promise((resolve,reject)=>{const requestId=++id,timer=setTimeout(()=>reject(new Error('MCP response timed out')),5000);waiting.set(requestId,result=>{clearTimeout(timer);resolve(result);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:requestId,method,params})+'\n');});
  try{const initialized=await request('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'Freegma test',version:'1'}});assert.equal(initialized.result.serverInfo.name,'Freegma');child.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');assert.equal((await request('tools/list',{})).result.tools.length,31);
    const workspaces=(await request('tools/call',{name:'freegma_list_workspaces',arguments:{}})).result.structuredContent.workspaces;assert.equal(workspaces.length,1);
    const board=(await request('tools/call',{name:'freegma_create_board',arguments:{workspaceId:workspaces[0].id,name:'Agent board'}})).result.structuredContent;
    const edited=(await request('tools/call',{name:'freegma_apply_operations',arguments:{boardId:board.id,expectedRevision:board.revision,operations:[{op:'add',node:{type:'text',text:'Built by MCP'}}]}})).result.structuredContent;
    assert.equal(edited.document.nodes[0].text,'Built by MCP');assert.match((await request('tools/call',{name:'freegma_export_react',arguments:{boardId:board.id}})).result.structuredContent.code,/Built by MCP/);
  }finally{child.stdin.end();await new Promise(resolve=>child.once('exit',resolve));fs.rmSync(folder,{recursive:true,force:true});}
});
test('HTTP serves stable board links, rejects cross-origin mutations and reports conflicts',async()=>{
  const {store,w,b}=fixture(),server=createServer({store,build:defaultBuild});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  try{
    assert.equal((await(await fetch(origin+'/api/health')).json()).version,VERSION);
    const page=await fetch(origin+'/w/'+w.id+'/b/'+b.id);assert.equal(page.status,200);assert.match(await page.text(),/Freegma/);assert.match(page.headers.get('content-security-policy'),/frame-ancestors/);
    assert.equal((await fetch(origin+'/api/workspaces',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.example'},body:'{"name":"Blocked"}'})).status,403);
    assert.equal((await fetch(origin+'/api/workspaces',{method:'POST',body:'name=x'})).status,415);
    const payload={expectedRevision:b.revision,operations:[{op:'add',node:{type:'text',text:'HTTP edit'}}]};const edit=()=>fetch(origin+'/api/boards/'+b.id+'/operations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    assert.equal((await edit()).status,200);assert.equal((await edit()).status,409);
    const asset=store.addAsset(w.id,{mime:'image/png',base64:png}),response=await fetch(origin+asset.src);assert.equal(response.headers.get('content-type'),'image/png');
  }finally{await new Promise(resolve=>server.close(resolve));store.close();}
});


test('export names follow layers, library components and boards with safe React identifiers',async()=>{
  const {store,w,b}=fixture();try{
    const root=makeNode('frame',{name:'Štatistiky / task card'});
    const saved=store.mutate(b.id,b.revision,[{op:'add',node:root}]);
    assert.equal(store.export(b.id).filename,'Board.jsx');
    let result=store.export(b.id,root.id);assert.equal(result.filename,'StatistikyTaskCard.jsx');assert.match(result.jsxCode,/import ".\/StatistikyTaskCard.css"/);
    const component=store.saveComponent(b.id,saved.revision,root.id,'Worker summary');
    assert.equal(store.export(b.id,root.id).filename,'WorkerSummary.jsx');
    const target=store.createBoard(w.id,'Instances'),inserted=store.insertComponent(target.id,target.revision,component.component.id);
    assert.equal(store.export(target.id,inserted.nodeId).filename,'WorkerSummary.jsx');
    for(const [name,expected] of [['2 tasks','Component2Tasks'],['!!!','FreegmaDesign'],['taskCard','TaskCard'],['../../Card\r\nInjected: yes','CardInjectedYes']])assert.equal(reactComponentName(name),expected);
    result=store.export(b.id,root.id,'9 custom export');const {require}=await dependencies();require('esbuild').transformSync(result.jsxCode,{loader:'jsx'});
    assert.equal(result.filename,'Component9CustomExport.jsx');
  }finally{store.close();}
});

test('source attachment downloads preserve the displayed snapshot and CSS draft',async()=>{
  const {store,b}=fixture(),server=createServer({store});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  const prepare=data=>fetch(origin+'/api/source-downloads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
  try{
    const output=await(await fetch(origin+'/api/boards/'+b.id+'/export')).json();assert.equal(output.filename,'Board.jsx');
    for(const [filename,content,mime] of [[output.filename,output.jsxCode,'text/javascript'],[output.cssFilename,output.css+'\n/* unsaved Š draft */','text/css']]){
      const response=await prepare({filename,content});assert.equal(response.status,201);const {url}=await response.json();
      store.mutate(b.id,store.getBoard(b.id).revision,[{op:'add',node:makeNode('text',{text:'Newer canvas'})}]);
      const file=await fetch(origin+url);assert.equal(file.status,200);assert.equal(file.headers.get('content-disposition'),`attachment; filename="${filename}"`);assert.match(file.headers.get('content-type'),new RegExp(mime));assert.equal(await file.text(),content);
    }
    assert.equal((await prepare({filename:'../../Injected.jsx',content:'test'})).status,400);
    assert.equal((await prepare({filename:'Card.jsx',content:'a'.repeat(4*1024*1024+1)})).status,413);
    assert.equal((await fetch(origin+'/api/source-downloads/unknown')).status,404);
    assert.equal((await fetch(origin+'/api/source-downloads/00000000-0000-0000-0000-000000000000')).status,404);
    const first=await(await prepare({filename:'Card.jsx',content:'first'})).json();
    for(let i=0;i<8;i++)await prepare({filename:'Card.jsx',content:String(i)});
    assert.equal((await fetch(origin+first.url)).status,404);
  }finally{await new Promise(resolve=>server.close(resolve));store.close();}
});
