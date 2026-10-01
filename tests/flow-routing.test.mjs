import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {FreegmaStore} from '../server/store.mjs';
import {callTool} from '../server/tools.mjs';
import {createServer} from '../server/http.mjs';
import {makeNode} from '../shared/design.mjs';
import {overlayPath,overlaySvgPath,draggedFlowRoute,flowAnchor,validateRoute} from '../shared/flow-overlay.mjs';
const from={left:0,top:0,width:400,height:300},to={left:800,top:0,width:400,height:300};
const edge={id:'next',fromFrameId:'home',toFrameId:'details',action:'straight',title:'Next',explanation:''};
function setup(s=new FreegmaStore(':memory:',{seed:false})){const w=s.createWorkspace('Routing');let b=s.createBoard(w.id,'Pages',{version:1,nodes:[makeNode('frame',{id:'home',x:0,y:0,width:400,height:300}),makeNode('frame',{id:'details',x:800,y:0,width:400,height:300})]});b=s.mutateFlowOverlay(b.id,b.revision,[{op:'addEdge',edge}]);return {s,w,b};}
test('dragged endpoints snap independently around the frame perimeter and follow resizing',()=>{
 const automatic=overlayPath(from,to);const route=draggedFlowRoute(automatic,null,'from',{x:405,y:270},from,to);
 assert.deepEqual(route,{from:{side:'right',offset:.9}});assert.deepEqual(overlayPath(from,to,{route}).points[0],{x:400,y:270});assert.deepEqual(overlayPath(from,to,{route}).points.at(-1),automatic.points.at(-1));
 assert.deepEqual(flowAnchor({left:30,top:50,width:600,height:600},route.from),{x:630,y:590});
 const top=draggedFlowRoute(automatic,null,'to',{x:1090,y:-30},from,to);assert.deepEqual(top.to,{side:'top',offset:.725});assert.deepEqual(overlayPath(from,to,{route:top}).points.at(-1),{x:1090,y:0});
});
test('curve handles move the path and label, keep endpoint anchors and follow native frame movement',()=>{
 const automatic=overlayPath(from,to),route=draggedFlowRoute(automatic,null,'control1',{x:520,y:-180},from,to),custom=overlayPath(from,to,{route});
 assert.deepEqual(custom.points[1],{x:520,y:-180});assert.deepEqual(custom.points[0],automatic.points[0]);assert.deepEqual(custom.points.at(-1),automatic.points.at(-1));assert.notDeepEqual(custom.label,automatic.label);
 const moved=overlayPath({...from,left:200,top:100},to,{route});assert.deepEqual(moved.points[1],{x:720,y:-80});assert.deepEqual(moved.points[2],custom.points[2]);assert.match(overlaySvgPath(custom),/C 520 -180/);
 const second=draggedFlowRoute(custom,route,'control2',{x:690,y:-200},from,to);assert.deepEqual(overlayPath(from,to,{route:second}).points[2],{x:690,y:-200});assert.deepEqual(second.controls[0],route.controls[0]);
});
test('repeat corner drags route outside freely; start and end anchors remain independently adjustable',()=>{
 const auto=overlayPath(to,from,{repeat:true}),route=draggedFlowRoute(auto,null,'via',{x:-180,y:600},to,from),geo=overlayPath(to,from,{repeat:true,route});
 assert.deepEqual(geo.points[2],{x:-180,y:600});assert.deepEqual(geo.points[0],auto.points[0]);assert.deepEqual(geo.points.at(-1),auto.points.at(-1));assert.ok(overlaySvgPath(geo).includes(' Q '));
 const moved=draggedFlowRoute(geo,route,'from',{x:1100,y:310},to,from),final=overlayPath(to,from,{repeat:true,route:moved});assert.deepEqual(final.points[0],{x:1100,y:300});assert.deepEqual(final.points[2],geo.points[2]);
});
test('malformed and excessive route payloads roll back an entire operation batch',()=>{const {s,b}=setup();try{
 for(const route of [{from:{side:'center',offset:.5}},{to:{side:'right',offset:1.1}},{from:{side:'top',offset:NaN}},{controls:[{x:0,y:0}]},{controls:[{x:0,y:0},{x:100001,y:0}]},{via:{x:1,y:2,extra:true}},{unexpected:true},[],false]){
 assert.throws(()=>validateRoute(route));assert.throws(()=>s.mutateFlowOverlay(b.id,b.revision,[{op:'updateEdge',id:edge.id,patch:{title:'Should roll back'}},{op:'updateEdge',id:edge.id,patch:{route}}]));assert.deepEqual(s.getBoard(b.id),b);}
}finally{s.close();}});
test('a completed route drag and reset are single undo steps, portable, persistent and excluded from React',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-route-')),db=path.join(dir,'index.sqlite');let s=new FreegmaStore(db,{seed:false});try{const {w,b}=setup(s),code=s.export(b.id).jsxCode;
 let route=null;for(let x=450;x<600;x+=5)route=draggedFlowRoute(overlayPath(from,to),null,'control1',{x,y:-200},from,to);assert.equal(s.getBoard(b.id).revision,b.revision);
 const changed=s.mutateFlowOverlay(b.id,b.revision,[{op:'updateEdge',id:edge.id,patch:{route}}]);assert.equal(changed.revision,b.revision+1);assert.equal(s.export(b.id).jsxCode,code);
 const imported=s.importFree(s.exportFree(w.id).package);assert.deepEqual(imported.boards[0].document.flowOverlay.edges[0].route,route);
 const reset=s.mutateFlowOverlay(b.id,changed.revision,[{op:'updateEdge',id:edge.id,patch:{route:null}}]);assert.deepEqual(overlayPath(from,to,{route:reset.document.flowOverlay.edges[0].route}),overlayPath(from,to));
 const restored=s.travel(b.id,reset.revision,'undo');assert.deepEqual(restored.document.flowOverlay.edges[0].route,route);s.close();s=new FreegmaStore(db,{seed:false});assert.deepEqual(s.getBoard(b.id).document.flowOverlay.edges[0].route,route);
}finally{s.close();fs.rmSync(dir,{recursive:true,force:true});}});
test('MCP and HTTP preserve manual routes and revision conflicts',async()=>{const {s,b}=setup(),server=createServer({store:s});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{
 const route={from:{side:'bottom',offset:.25},to:{side:'top',offset:.7},controls:[{x:80,y:120},{x:-100,y:-180}]};
 const changed=callTool(s,'freegma_apply_flow_overlay',{boardId:b.id,expectedRevision:b.revision,operations:[{op:'updateEdge',id:edge.id,patch:{route}}]});assert.deepEqual(changed.document.flowOverlay.edges[0].route,route);
 const save=revision=>fetch(`http://127.0.0.1:${server.address().port}/api/boards/${b.id}/flow-overlay`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:revision,operations:[{op:'updateEdge',id:edge.id,patch:{route:null}}]})});assert.equal((await save(b.revision)).status,409);assert.equal((await save(changed.revision)).status,200);assert.equal(s.getBoard(b.id).document.flowOverlay.edges[0].route,null);
}finally{await new Promise(r=>server.close(r));s.close();}});
