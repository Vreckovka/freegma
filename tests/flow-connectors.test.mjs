import test from 'node:test';import assert from 'node:assert/strict';
import {FreegmaStore} from '../server/store.mjs';import {makeNode,validateDocument} from '../shared/design.mjs';
import {callTool} from '../server/tools.mjs';
import {portAnchor,portPoint,connectorDrop,validatePorts,routeForPorts} from '../shared/flow-ports.mjs';
import {flowStepBounds,flowStepPath} from '../shared/flow-route.mjs';
import {transitionEvent} from '../shared/flow-events.mjs';
const owners=[{id:'home',name:'Home',bounds:{left:0,top:0,width:300,height:200}},{id:'next',name:'Next',bounds:{left:600,top:0,width:300,height:200}}];
test('the same gesture distinguishes moving an edge dot, connecting to a target, and a pending blank-space line',()=>{
 assert.deepEqual(portPoint(owners[0],'right'),{x:300,y:100});assert.deepEqual(portAnchor(owners[0],'top'),{side:'top',offset:.5});
 assert.deepEqual(connectorDrop(owners,'home',{x:300,y:170}),{kind:'move',anchor:{side:'right',offset:.85}});
 const nested={id:'button',bounds:{left:24,top:140,width:252,height:40}};
 assert.deepEqual(connectorDrop([...owners,nested],'home',{x:300,y:170},29),{kind:'move',anchor:{side:'right',offset:.85}});
 assert.equal(connectorDrop([...owners,nested],'home',{x:150,y:160},29).target.id,'button');
 assert.equal(connectorDrop(owners,'home',{x:610,y:150}).kind,'connect');assert.equal(connectorDrop(owners,'home',{x:610,y:150}).target.id,'next');
 assert.equal(connectorDrop(owners,'home',{x:440,y:360}).kind,'pending');assert.equal(connectorDrop(owners,'missing',{x:1,y:1}).kind,'cancel');
 assert.equal(connectorDrop([owners[0],{...owners[1],canTarget:false}],'home',{x:610,y:150}).kind,'pending');
});
test('resetting bends keeps arrows attached to moved ports while a manually adjusted endpoint can retain its own anchor',()=>{
 const edge={fromPort:'right',toPort:'left',route:null},from={right:{side:'bottom',offset:.2}};
 assert.deepEqual(routeForPorts(edge,from,{}),{from:{side:'bottom',offset:.2},to:{side:'left',offset:.5}});
 assert.deepEqual(routeForPorts({...edge,route:{from:{side:'top',offset:.9}}},from,{}).from,{side:'top',offset:.9});assert.equal(edge.route,null);assert.equal(routeForPorts({route:null}),undefined);
});
function setup(mode){const s=new FreegmaStore(':memory:',{seed:false}),w=s.createWorkspace('Screens'),home=makeNode('frame',{id:'home',width:300,height:200}),next=makeNode('frame',{id:'next',x:600,width:300,height:200}),label=makeNode('text',{id:'label',parentId:'home',text:'Master text'}),source=s.createBoard(w.id,'Master screens',{version:1,nodes:[home,next,label]});let b=source;
 if(mode==='flow'){b=s.createFlowWorkspace('Overview').board;b=s.mutateFlow(b.id,b.revision,[{op:'addNode',node:{id:'home',kind:'frame',title:'Live home',explanation:'Context',x:0,y:0,display:'live',width:300,height:200,reference:{workspaceId:w.id,boardId:source.id,frameId:'home'}}},{op:'addNode',node:{id:'next',kind:'end',title:'Complete',explanation:'',x:600,y:0}}]);}
 const tool=mode==='flow'?'freegma_apply_flow':'freegma_apply_flow_overlay',key=mode==='flow'?'flow':'flowOverlay',edge={id:'e',...(mode==='flow'?{from:'home',to:'next'}:{fromFrameId:'home',toFrameId:'next'}),action:'straight',event:'hover',title:'Continue',explanation:'A real transition',fromPort:'right',toPort:'left',route:{from:{side:'right',offset:.5},to:{side:'left',offset:.5},pivots:[{x:450,y:-60}]}};
 b=callTool(s,tool,{boardId:b.id,expectedRevision:b.revision,operations:[{op:'addEdge',edge}]});return {s,b,source,tool,key};
}
test('moving shared dots updates attached arrow anchors together in one history entry in both flow modes',()=>{
 for(const mode of ['flow','overlay']){const {s,b,tool,key}=setup(mode);try{
 const updated=callTool(s,tool,{boardId:b.id,expectedRevision:b.revision,operations:[{op:'setPort',id:'home',port:'right',anchor:{side:'bottom',offset:.25}}]});
 assert.equal(updated.revision,b.revision+1);assert.deepEqual(updated.document[key].edges[0].route.from,{side:'bottom',offset:.25});assert.deepEqual(updated.document[key].edges[0].route.pivots,[{x:450,y:-60}]);
 assert.deepEqual(mode==='flow'?updated.document.flow.nodes[0].ports.right:updated.document.flowOverlay.ports.home.right,{side:'bottom',offset:.25});
 const undone=s.travel(b.id,updated.revision,'undo');assert.deepEqual(undone.document,b.document);const redone=s.travel(b.id,undone.revision,'redo');assert.deepEqual(redone.document,updated.document);
 const copy=s.importFree(s.exportFree(redone.workspaceId).package).boards.find(b=>b.document[key]);assert.deepEqual(copy.document,redone.document);
 assert.throws(()=>callTool(s,tool,{boardId:b.id,expectedRevision:b.revision,operations:[{op:'setPort',id:'home',port:'right',anchor:{side:'top',offset:.1}}]}),e=>e.status===409);
 }finally{s.close();}}
});
test('invalid or orphan connectors roll back the entire gesture; native frame removal prunes its dots and undo restores them',()=>{
 for(const mode of ['flow','overlay']){const {s,b,tool,key}=setup(mode);try{for(const op of [{op:'setPort',id:'missing',port:'right',anchor:{side:'top',offset:.2}},{op:'setPort',id:'home',port:'right',anchor:{side:'top',offset:1.01}},{op:'setPort',id:'home',port:'__proto__',anchor:{side:'top',offset:.2}}]){assert.throws(()=>callTool(s,tool,{boardId:b.id,expectedRevision:b.revision,operations:[{op:'updateEdge',id:'e',patch:{title:'Must roll back'}},op]}));assert.deepEqual(s.getBoard(b.id).document,b.document);}
 if(mode==='overlay'){const saved=callTool(s,tool,{boardId:b.id,expectedRevision:b.revision,operations:[{op:'setPort',id:'home',port:'top',anchor:{side:'top',offset:.8}}]});const removed=s.mutate(b.id,saved.revision,[{op:'remove',id:'home'}]);assert.equal(removed.document.flowOverlay.ports.home,undefined);assert.equal(removed.document.flowOverlay.edges.length,0);assert.deepEqual(s.travel(b.id,removed.revision,'undo').document,saved.document);}
 }finally{s.close();}}
 for(const p of [{right:{side:'bad',offset:.5}},{left:{side:'left',offset:NaN}},{top:{side:'top',offset:.5,extra:true}},[]])assert.throws(()=>validatePorts(p));
});
test('live reference remains a pointer to the master, reflects master text and size changes, and never includes editable artwork in the flow document',()=>{
 const {s,b,source}=setup('flow');try{const before=s.getBoard(source.id);let view=s.flowPreview(source.id,'home');assert.equal(view.document.nodes[1].text,'Master text');
 const updated=s.mutate(source.id,source.revision,[{op:'update',id:'home',patch:{width:450}},{op:'update',id:'label',patch:{text:'Changed in master'}}]);view=s.flowPreview(source.id,'home');assert.equal(view.document.nodes[0].width,450);assert.equal(view.document.nodes[1].text,'Changed in master');assert.equal(view.revision,updated.revision);
 assert.deepEqual(s.getBoard(b.id).document.nodes,[]);assert.equal(s.getBoard(b.id).document.flow.nodes[0].reference.boardId,source.id);assert.throws(()=>s.mutateFlow(b.id,b.revision,[{op:'updateNode',id:'home',patch:{text:'Attempted artwork edit'}}]),/Invalid flow step patch/);assert.notDeepEqual(s.getBoard(source.id),before);
 const card=s.mutateFlow(b.id,b.revision,[{op:'updateNode',id:'home',patch:{display:'card'}}]);assert.equal(flowStepBounds(card.document.flow.nodes[0]).width,240);assert.equal(flowStepBounds({...b.document.flow.nodes[0],width:view.document.nodes[0].width}).width,450);
 }finally{s.close();}
});
test('flow points and events share the overlay vocabulary; legacy cards remain valid and start/end restrictions are enforced',()=>{
 const {s,b,tool}=setup('flow');try{
 const updated=callTool(s,tool,{boardId:b.id,expectedRevision:b.revision,operations:[{op:'addNode',node:{id:'start',kind:'start',title:'Start',explanation:'Entry',x:-100,y:0}},{op:'addNode',node:{id:'decision',kind:'decision',title:'Allowed?',explanation:'Branch',x:450,y:20}},{op:'addEdge',edge:{id:'start_edge',from:'start',to:'home',action:'straight',title:'Begin',explanation:'',event:'page-load'}}]});
 assert.doesNotThrow(()=>validateDocument(updated.document));assert.equal(flowStepBounds(updated.document.flow.nodes.find(n=>n.id==='decision')).width,64);assert.equal(flowStepBounds(updated.document.flow.nodes.find(n=>n.id==='start')).height,32);assert.equal(transitionEvent(updated.document.flow.edges[0]).label,'Hover');
 assert.throws(()=>s.mutateFlow(b.id,updated.revision,[{op:'addEdge',edge:{id:'bad',from:'home',to:'start',action:'straight',title:'Back',explanation:''}}]));assert.throws(()=>s.mutateFlow(b.id,updated.revision,[{op:'updateEdge',id:'e',patch:{event:'unsafe'}}]));
 const p=flowStepPath(updated.document.flow.nodes[0],updated.document.flow.nodes.find(n=>n.id==='decision'),updated.document.flow.edges[0]);assert.equal(p.from.width,300);assert.equal(p.to.height,64);
 }finally{s.close();}
});
