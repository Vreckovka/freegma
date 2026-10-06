import test from 'node:test';
import assert from 'node:assert/strict';
import {FreegmaStore} from '../server/store.mjs';
import {makeNode} from '../shared/design.mjs';
import {callTool} from '../server/tools.mjs';
import {inputValue} from '../client/live-input.mjs';
import {transitionLabel,previewTransition} from '../client/transition-label.mjs';

test('plain untitled arrows round trip through MCP, storage, Undo and export in both flow views',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});
 try{
  const w=s.createWorkspace('Pages'),a=makeNode('frame'),b=makeNode('frame',{x:700});
  const board=s.createBoard(w.id,'Pages',{version:1,nodes:[a,b]});
  callTool(s,'freegma_apply_flow_overlay',{boardId:board.id,expectedRevision:board.revision,operations:[{op:'addEdge',edge:{id:'plain',fromFrameId:a.id,toFrameId:b.id,action:'none',event:'none',title:'',explanation:''}}]});
  const native=s.getBoard(board.id);assert.equal(native.document.flowOverlay.edges[0].title,'');assert.equal(native.document.flowOverlay.edges[0].action,'none');
  assert.deepEqual(native.document.nodes,board.document.nodes);
  assert.deepEqual(s.travel(board.id,native.revision,'undo').document,board.document);
  const undone=s.getBoard(board.id);assert.equal(s.travel(board.id,undone.revision,'redo').document.flowOverlay.edges[0].action,'none');
  assert.equal(s.exportFree(w.id).package.boards[0].document.flowOverlay.edges[0].title,'');
  const flow=s.createFlowWorkspace('Journey'),ref={workspaceId:w.id,boardId:board.id,frameId:a.id};
  const current=s.mutateFlow(flow.board.id,flow.board.revision,[{op:'addNode',node:{id:'home',kind:'frame',title:'Home',explanation:'',x:0,y:0,reference:ref}},{op:'addNode',node:{id:'end',kind:'end',title:'End',explanation:'',x:500,y:0}},{op:'addEdge',edge:{id:'plain',from:'home',to:'end',action:'none',event:'none',title:'',explanation:''}}]);
  assert.equal(s.getBoard(current.id).document.flow.edges[0].title,'');
  assert.throws(()=>s.mutateFlow(current.id,current.revision,[{op:'updateNode',id:'home',patch:{title:''}}]));
  const loop=s.mutateFlow(current.id,current.revision,[{op:'addEdge',edge:{id:'loop',from:'home',to:'home',action:'none',title:'',explanation:''}}]);
  assert.equal(loop.document.flow.edges[1].action,'none');
  const latest=s.getBoard(board.id);
  assert.doesNotThrow(()=>s.mutateFlowOverlay(board.id,latest.revision,[{op:'addEdge',edge:{id:'loop',fromFrameId:a.id,toFrameId:a.id,action:'none',title:'',explanation:''}}]));
 }finally{s.close();}
});

test('plain arrows omit all badges, empty semantic transitions retain their event, previews cancel cleanly',()=>{
 assert.deepEqual(transitionLabel({action:'none',event:'click',title:''}),{title:'',event:null,action:'',visible:false});
 assert.equal(transitionLabel({action:'none',event:'click',title:'Next'}).event,null);
 assert.equal(transitionLabel({action:'straight',event:'none',title:''}).visible,false);
 assert.equal(transitionLabel({action:'straight',event:'click',title:''}).event.label,'Click');
 assert.equal(transitionLabel({action:'if',event:'none',title:''}).action,'If');
 const saved=[{id:'a',action:'straight',title:'Original'}],draft={id:'a',action:'none',title:''};
 assert.equal(previewTransition(saved,draft)[0].title,'');assert.equal(saved[0].title,'Original');
 assert.equal(previewTransition(saved,null),saved);assert.equal(previewTransition(saved,{id:'new',title:'Not created'}),saved);
});

test('live input accepts valid changes immediately and holds incomplete or out-of-range numeric drafts',()=>{
 assert.deepEqual(inputValue(''),{valid:true,value:''});
 assert.deepEqual(inputValue('New title'),{valid:true,value:'New title'});
 for(const value of ['','-','NaN','Infinity','100001'])assert.equal(inputValue(value,{type:'number'}).valid,false);
 assert.deepEqual(inputValue('12.5',{type:'number'}),{valid:true,value:12.5});
 assert.equal(inputValue('-1',{type:'number',min:0}).valid,false);
 assert.equal(inputValue('1.1',{type:'number',max:1}).valid,false);
 assert.equal(inputValue('#',{validate:v=>/^#[0-9a-f]{6}$/i.test(v)}).valid,false);
});
