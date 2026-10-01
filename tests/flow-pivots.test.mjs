import test from 'node:test';import assert from 'node:assert/strict';
import {FreegmaStore} from '../server/store.mjs';import {callTool} from '../server/tools.mjs';
import {makeNode} from '../shared/design.mjs';
import {overlayPath,overlaySvgPath,addFlowPivot,removeFlowPivot,draggedFlowRoute,translatedFlowRoute,validateRoute,flowStepPath} from '../shared/flow-route.mjs';
const from={left:0,top:0,width:240,height:170},to={left:600,top:0,width:240,height:170};
test('pivot points add, move and remove individually without detaching endpoints or losing the base curve',()=>{
 const base=overlayPath(from,to),route=addFlowPivot(base,null);assert.equal(route.pivots.length,1);const geometry=overlayPath(from,to,{route});assert.equal(geometry.pivots,true);assert.deepEqual(geometry.points[0],base.points[0]);assert.deepEqual(geometry.points.at(-1),base.points.at(-1));
 const moved=draggedFlowRoute(geometry,route,'pivot_0',{x:350,y:-180},from,to);assert.deepEqual(moved.pivots,[{x:350,y:-180}]);assert.deepEqual(route.pivots,[base.label]);assert.match(overlaySvgPath(overlayPath(from,to,{route:moved})),/Q 350 -180/);
 const multiple=addFlowPivot(overlayPath(from,to,{route:moved}),moved);assert.equal(multiple.pivots.length,2);assert.deepEqual(removeFlowPivot(multiple,0).pivots,[multiple.pivots[1]]);
 const restored=removeFlowPivot(route,0);assert.equal(restored.pivots,undefined);assert.deepEqual(overlayPath(from,to,{route:restored}),base);
});
test('adding a repeat pivot preserves its bottom-to-side corners and adds an editable point',()=>{
 const base=overlayPath(to,from,{repeat:true}),route=addFlowPivot(base,null);assert.equal(route.pivots.length,4);const result=overlayPath(to,from,{repeat:true,route});assert.deepEqual(result.points[0],base.points[0]);assert.deepEqual(result.points.at(-1),base.points.at(-1));for(const p of base.points.slice(1,-1))assert.ok(result.points.some(q=>q.x===p.x&&q.y===p.y));assert.doesNotThrow(()=>validateRoute(route));
});
test('dragging the arrow line moves only its routing; anchors stay attached for curves, repeat and pivots',()=>{
 for(const options of [{},{repeat:true}]){const base=overlayPath(from,to,options),route=translatedFlowRoute(base,null,40,-90),moved=overlayPath(from,to,{...options,route});assert.deepEqual(moved.points[0],base.points[0]);assert.deepEqual(moved.points.at(-1),base.points.at(-1));if(base.polyline)assert.deepEqual(moved.points[2],{x:base.points[2].x+40,y:base.points[2].y-90});else assert.deepEqual(moved.points[1],{x:base.points[1].x+40,y:base.points[1].y-90});}
 const base=overlayPath(from,to),route=addFlowPivot(base,null),geometry=overlayPath(from,to,{route}),shifted=translatedFlowRoute(geometry,route,25,50);assert.deepEqual(shifted.pivots,route.pivots.map(p=>({x:p.x+25,y:p.y+50})));assert.deepEqual(route.pivots,[base.label]);
});
test('pivots and route shifts enforce count, finite coordinates and missing-point errors',()=>{
 for(const route of [{pivots:null},{pivots:'bad'},{pivots:[{x:NaN,y:2}]},{pivots:[{x:0,y:Infinity}]},{pivots:[{x:100001,y:0}]},{pivots:Array.from({length:33},()=>({x:0,y:0}))}])assert.throws(()=>validateRoute(route));
 const geometry=overlayPath(from,to),route={pivots:Array.from({length:32},()=>({x:20,y:30}))};assert.throws(()=>addFlowPivot(geometry,route),/32/);assert.throws(()=>removeFlowPivot(route,32),/not found/);assert.throws(()=>draggedFlowRoute(geometry,{},'pivot_0',{x:1,y:1},from,to),/not found/);assert.throws(()=>translatedFlowRoute(geometry,route,Infinity,0));
});
test('standalone step routes use actual card bounds and shared manual handles',()=>{
 const a={id:'a',x:0,y:0,kind:'frame'},b={id:'b',x:500,y:0,kind:'if'},edge={id:'edge',from:'a',to:'b',title:'Buy',action:'straight'};const path=flowStepPath(a,b,edge);assert.equal(path.from.height,260);assert.equal(path.to.height,170);assert.deepEqual(path.geometry.points[0],{x:240,y:130});assert.deepEqual(path.geometry.points.at(-1),{x:500,y:85});
 const route=draggedFlowRoute(path.geometry,null,'from',{x:239,y:210},path.from,path.to);assert.deepEqual(flowStepPath(a,b,{...edge,route}).geometry.points[0],{x:240,y:210});assert.equal(flowStepPath(b,a,{...edge,action:'repeat'}).geometry.polyline,true);
});
function setup(type){const s=new FreegmaStore(':memory:',{seed:false}),w=s.createWorkspace('Designs'),home=makeNode('frame',{id:'home',width:240,height:170}),next=makeNode('frame',{id:'next',x:600,width:240,height:170}),design=s.createBoard(w.id,'Actual designs',{version:1,nodes:[home,next]});let b=design,op;
 if(type==='flow'){b=s.createFlowWorkspace('Flow').board;b=s.mutateFlow(b.id,b.revision,[{op:'addNode',node:{id:'a',kind:'frame',title:'Home',explanation:'',x:0,y:0,reference:{workspaceId:w.id,boardId:design.id,frameId:home.id}}},{op:'addNode',node:{id:'b',kind:'end',title:'Done',explanation:'',x:600,y:0}},{op:'addEdge',edge:{id:'e',from:'a',to:'b',action:'straight',title:'Next',explanation:''}}]);op='freegma_apply_flow';}
 else {b=s.mutateFlowOverlay(b.id,b.revision,[{op:'addEdge',edge:{id:'e',fromFrameId:'home',toFrameId:'next',action:'straight',title:'Next',explanation:''}}]);op='freegma_apply_flow_overlay';}
 return {s,b,op};
}
test('both flow types save one route edit, undo/redo and preserve pivots in portable MCP exports',()=>{
 for(const type of ['flow','overlay']){const {s,b,op}=setup(type);try{const route={from:{side:'bottom',offset:.25},to:{side:'left',offset:.6},pivots:[{x:350,y:350},{x:550,y:300}]};const saved=callTool(s,op,{boardId:b.id,expectedRevision:b.revision,operations:[{op:'updateEdge',id:'e',patch:{route}}]});assert.equal(saved.revision,b.revision+1);const key=type==='flow'?'flow':'flowOverlay';assert.deepEqual(saved.document[key].edges[0].route,route);
 const undo=s.travel(b.id,saved.revision,'undo');assert.deepEqual(undo.document,b.document);const redo=s.travel(b.id,undo.revision,'redo');assert.deepEqual(redo.document[key].edges[0].route,route);const imported=s.importFree(s.exportFree(redo.workspaceId).package);assert.deepEqual(imported.boards.find(b=>b.document[key]).document[key].edges[0].route,route);
 assert.throws(()=>callTool(s,op,{boardId:b.id,expectedRevision:saved.revision,operations:[{op:'updateEdge',id:'e',patch:{route:null}}]}),e=>e.status===409);
}finally{s.close();}}
});
test('invalid pivots roll back other edits in both Flows and native overlays',()=>{for(const type of ['flow','overlay']){const {s,b,op}=setup(type);try{
 assert.throws(()=>callTool(s,op,{boardId:b.id,expectedRevision:b.revision,operations:[{op:'updateEdge',id:'e',patch:{title:'Must roll back'}},{op:'updateEdge',id:'e',patch:{route:{pivots:[{x:0,y:0,extra:true}]}}}]}));assert.deepEqual(s.getBoard(b.id),b);
}finally{s.close();}}});
