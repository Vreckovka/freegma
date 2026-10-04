import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../server/http.mjs';
import {FreegmaStore} from '../server/store.mjs';
import {makeNode,VERSION} from '../shared/design.mjs';

const headers={'content-type':'application/json',accept:'application/json, text/event-stream'};
async function setup(){
  const store=new FreegmaStore(':memory:',{seed:false});
  const workspace=store.createWorkspace('Remote MCP test');
  const board=store.createBoard(workspace.id,'Native test',{version:1,nodes:[makeNode('text',{id:'title',text:'Original'})]});
  const server=createServer({store,access:()=>({origins:['https://studio.example'],embedOrigins:[]})});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const request=(body,extra={})=>fetch(base+'/mcp',{method:'POST',headers:{...headers,...extra},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  const call=async(name,args,extra={})=>(await request({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}},extra)).json();
  const close=async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));store.close();};
  return {store,workspace,board,server,base,request,call,close};
}
test('HTTP initialization, notifications, tools and editor share one native store without auth',async()=>{
  const s=await setup();try{
    const init=await s.request({jsonrpc:'2.0',id:0,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'http-test',version:'1'}}});
    assert.equal(init.status,200);assert.match(init.headers.get('content-type'),/application\/json/);assert.equal(init.headers.get('cache-control'),'no-store');assert.equal(init.headers.get('mcp-session-id'),null);
    const result=await init.json();assert.equal(result.id,0);assert.equal(result.result.protocolVersion,'2025-11-25');assert.equal(result.result.serverInfo.version,VERSION);
    const notification=await s.request({jsonrpc:'2.0',method:'notifications/initialized'});assert.equal(notification.status,202);assert.equal(await notification.text(),'');
    const tools=await (await s.request({jsonrpc:'2.0',id:'tools',method:'tools/list'},{'mcp-protocol-version':'2025-11-25'})).json();
    assert.ok(tools.result.tools.length>20);assert.ok(tools.result.tools.every(t=>t.securitySchemes[0].type==='noauth'));
    assert.equal(tools.result.tools.find(t=>t.name==='freegma_get_board').annotations.readOnlyHint,true);
    assert.equal(tools.result.tools.find(t=>t.name==='freegma_delete_design').annotations.destructiveHint,true);
    const update=await s.call('freegma_apply_operations',{boardId:s.board.id,expectedRevision:1,responseMode:'compact',operations:[{op:'update',id:'title',patch:{text:'Remote edit'}}]});
    assert.equal(update.result.isError,false);assert.equal(update.result.structuredContent.revision,2);
    const editor=await (await fetch(s.base+'/api/boards/'+s.board.id)).json();assert.equal(editor.document.nodes[0].text,'Remote edit');
    const stale=await s.call('freegma_apply_operations',{boardId:s.board.id,expectedRevision:1,operations:[{op:'update',id:'title',patch:{text:'Overwrite'}}]});
    assert.equal(stale.result.isError,true);assert.equal(s.store.getBoard(s.board.id).document.nodes[0].text,'Remote edit');
    const undo=await s.call('freegma_undo',{boardId:s.board.id,expectedRevision:2,responseMode:'compact'});assert.equal(undo.result.isError,false);assert.equal(s.store.getBoard(s.board.id).document.nodes[0].text,'Original');
    const exported=await s.call('freegma_export_react',{boardId:s.board.id,name:'RemoteExample'});assert.equal(exported.result.isError,false);assert.match(JSON.stringify(exported.result.structuredContent),/RemoteExample/);
    const sources=await (await s.request({jsonrpc:'2.0',id:2,method:'resources/list'})).json();assert.equal(sources.result.resources.length,1);
    const resource=await (await s.request({jsonrpc:'2.0',id:3,method:'resources/read',params:{uri:sources.result.resources[0].uri}})).json();assert.match(resource.result.contents[0].text,/Original/);
  }finally{await s.close();}
});
test('public MCP returns public links, allows ChatGPT origin only on MCP, and rejects hostile origins',async()=>{
  const s=await setup();try{
    const remote={'x-forwarded-for':'192.0.2.1','x-forwarded-host':'studio.example',origin:'https://chatgpt.com'};
    const workspaces=await s.call('freegma_list_workspaces',{},remote);assert.equal(workspaces.result.structuredContent.workspaces[0].url,'https://studio.example/w/'+s.workspace.id);
    const board=await s.call('freegma_get_board',{boardId:s.board.id,view:'outline'},remote);assert.equal(board.result.structuredContent.url,'https://studio.example/w/'+s.workspace.id+'/b/'+s.board.id);
    const denied=await s.request({jsonrpc:'2.0',id:1,method:'tools/list'},{...remote,origin:'https://evil.example'});assert.equal(denied.status,403);
    const malformed=await s.request({jsonrpc:'2.0',id:1,method:'tools/list'},{...remote,origin:'https://chatgpt.com/path'});assert.equal(malformed.status,403);
    const editor=await fetch(s.base+'/api/workspaces',{headers:remote});assert.equal(editor.status,403);
    const options=await fetch(s.base+'/mcp',{method:'OPTIONS',headers:remote});assert.equal(options.status,204);assert.equal(options.headers.get('access-control-allow-origin'),'https://chatgpt.com');assert.match(options.headers.get('access-control-allow-headers'),/MCP-Protocol-Version/);
    const withoutOrigin=await s.call('freegma_list_boards',{workspaceId:s.workspace.id},{'x-forwarded-for':'192.0.2.1','x-forwarded-host':'studio.example'});assert.match(withoutOrigin.result.structuredContent.boards[0].url,/^https:\/\/studio.example/);
  }finally{await s.close();}
});
test('MCP transport validates messages, content negotiation and unsupported methods without editor fallback',async()=>{
  const s=await setup();try{
    for(const method of ['GET','DELETE','PUT','HEAD']){const r=await fetch(s.base+'/mcp',{method});assert.equal(r.status,405);assert.match(r.headers.get('content-type'),/application\/json/);}
    for(const body of [[],{},null,{jsonrpc:'2.0',id:null,method:'ping'},{jsonrpc:'2.0',id:1,method:'ping',params:[]},{jsonrpc:'2.0',id:1,method:17,result:{}},{jsonrpc:'2.0',id:1,result:{},error:{code:1,message:'Bad'}},{jsonrpc:'2.0',id:1,error:[]}]){const r=await s.request(body);assert.equal(r.status,400);assert.equal((await r.json()).error.code,-32600);}
    const malformed=await fetch(s.base+'/mcp',{method:'POST',headers,body:'{broken'});assert.equal(malformed.status,400);assert.equal((await malformed.json()).error.code,-32700);
    const media=await s.request({jsonrpc:'2.0',id:1,method:'ping'},{'content-type':'text/plain'});assert.equal(media.status,415);
    for(const accept of ['application/json','text/event-stream','application/json;q=0, text/event-stream'])assert.equal((await s.request({jsonrpc:'2.0',id:1,method:'ping'},{accept})).status,406);
    const protocol=await s.request({jsonrpc:'2.0',id:1,method:'ping'},{'mcp-protocol-version':'invalid'});assert.equal(protocol.status,400);
    const legacy=await (await s.request({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2024-11-05'}})).json();assert.equal(legacy.result.protocolVersion,'2025-11-25');
    const missing=await (await s.request({jsonrpc:'2.0',id:9,method:'unknown'})).json();assert.equal(missing.id,9);assert.equal(missing.error.code,-32601);
    const unknownTool=await s.call('missing',{});assert.equal(unknownTool.result.isError,true);
    const response=await s.request({jsonrpc:'2.0',id:9,result:{}});assert.equal(response.status,202);
    for(const path of ['/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp','/.well-known/oauth-authorization-server','/.well-known/openid-configuration'])assert.equal((await fetch(s.base+path)).status,404);
    const huge=await fetch(s.base+'/mcp',{method:'POST',headers,body:JSON.stringify({data:'x'.repeat(12*1024*1024)})});assert.equal(huge.status,413);
  }finally{await s.close();}
});
