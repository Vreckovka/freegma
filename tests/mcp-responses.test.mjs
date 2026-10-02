import test from 'node:test';import assert from 'node:assert/strict';
import {FreegmaStore} from '../server/store.mjs';import {makeNode} from '../shared/design.mjs';import {callTool,rpc} from '../server/tools.mjs';
const setup=()=>{const store=new FreegmaStore(':memory:',{seed:false}),w=store.createWorkspace('MCP tests'),root=makeNode('frame',{id:'root'}),child=makeNode('text',{id:'child',parentId:'root',text:'Important text'}),other=makeNode('frame',{id:'other'}),board=store.createBoard(w.id,'Read scope',{version:1,nodes:[root,child,other]});return {store,w,board};};
test('legacy full reads and writes remain intact; compact writes retain revision and undo receipt',()=>{
 const {store,board}=setup();try{
  const full=callTool(store,'freegma_get_board',{boardId:board.id});assert.equal(full.document.nodes.length,3);
  const r=callTool(store,'freegma_apply_operations',{boardId:board.id,expectedRevision:full.revision,responseMode:'compact',operations:[{op:'update',id:'child',patch:{text:'Changed'}}]});
  assert.equal(r.revision,full.revision+1);assert.equal(r.canUndo,true);assert.equal(r.document,undefined);assert.deepEqual(r.operationTargets,['child']);assert.equal(r.counts.layers,3);
  assert.equal(callTool(store,'freegma_get_board',{boardId:board.id}).document.nodes[1].text,'Changed');
  assert.throws(()=>callTool(store,'freegma_apply_operations',{boardId:board.id,expectedRevision:full.revision,responseMode:'compact',operations:[{op:'update',id:'child',patch:{text:'Stale'}}]}),/changed elsewhere/);
  const undone=callTool(store,'freegma_undo',{boardId:board.id,expectedRevision:r.revision,responseMode:'compact'});assert.equal(undone.revision,r.revision+1);assert.equal(undone.canRedo,true);
 }finally{store.close();}
});
test('scoped pages contain complete properties and preserve order and revision boundaries',()=>{
 const {store,board}=setup();try{
  const a=callTool(store,'freegma_get_board',{boardId:board.id,view:'nodes',nodeId:'root',limit:1});assert.equal(a.items[0].value.id,'root');assert.equal(a.page.total,2);assert.equal(a.page.nextOffset,1);
  const b=callTool(store,'freegma_get_board',{boardId:board.id,view:'nodes',nodeId:'root',offset:1,limit:1,expectedRevision:a.revision});assert.equal(b.items[0].value.text,'Important text');assert.equal(b.page.hasMore,false);
  assert.deepEqual([a.items[0].value,b.items[0].value],board.document.nodes.slice(0,2));
  const outline=callTool(store,'freegma_get_board',{boardId:board.id,view:'outline'});assert.equal(outline.items[1].value.parentId,'root');assert.equal(outline.items[1].value.text,undefined);
  assert.equal(callTool(store,'freegma_get_board',{boardId:board.id,view:'summary'}).items,undefined);
  for(const args of [{limit:201},{limit:0},{offset:-1},{nodeId:'missing'},{expectedRevision:0}])assert.throws(()=>callTool(store,'freegma_get_board',{boardId:board.id,view:'nodes',...args}));
  assert.throws(()=>callTool(store,'freegma_get_board',{boardId:board.id,offset:0}),/Supply view/);
  store.mutate(board.id,board.revision,[{op:'update',id:'child',patch:{text:'Other actor'}}]);assert.throws(()=>callTool(store,'freegma_get_board',{boardId:board.id,view:'nodes',expectedRevision:a.revision}),/between pages/);
 }finally{store.close();}
});
test('flow scope includes the selected step and all of its connections with bounded continuation',()=>{
 const {store,w}=setup();try{
  const f=store.createFlowWorkspace('Flow',w.id),doc={version:1,nodes:[],flow:{version:1,nodes:[{id:'start',kind:'start',title:'Start',explanation:'',x:0,y:0},{id:'end',kind:'end',title:'End',explanation:'',x:100,y:0}],edges:[{id:'edge',from:'start',to:'end',event:'page-load',action:'straight',title:'Continue',explanation:'Navigate'}]}};
  const b=store.replace(f.board.id,f.board.revision,doc),r=callTool(store,'freegma_get_board',{boardId:b.id,view:'nodes',nodeId:'start'});assert.deepEqual(r.items.map(x=>x.value.id),['start','edge']);assert.equal(r.items[1].collection,'flow.edges');
  assert.equal(callTool(store,'freegma_get_board',{boardId:b.id,view:'nodes',nodeId:'edge'}).items.length,1);
  const reply=rpc(store,{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'freegma_apply_flow',arguments:{boardId:b.id,expectedRevision:b.revision,responseMode:'compact',operations:[{op:'updateNode',id:'end',patch:{title:'Finished'}}]}}});
  assert.equal(reply.result.isError,false);assert.equal(reply.result.structuredContent.counts.flowTransitions,1);assert.deepEqual(JSON.parse(reply.result.content[0].text),reply.result.structuredContent);
 }finally{store.close();}
});
