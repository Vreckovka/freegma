import test from 'node:test';import assert from 'node:assert/strict';
import {createFlowViewportFilter} from '../client/flow-viewport.mjs';
const view={x:0,y:0,zoom:1},size={width:500,height:400};
const path=(id,points,label={x:points[0].x,y:points[0].y},extra={})=>({edge:{id,title:id,...extra},geometry:{points,label}});
test('retains crossing curves, offscreen control hulls, rounded loops and pivots conservatively',()=>{
 const paths=[path('cross',[{x:-100,y:100},{x:100,y:100},{x:400,y:100},{x:800,y:100}]),path('curve',[{x:-200,y:-200},{x:300,y:300},{x:300,y:300},{x:-100,y:-100}]),path('loop',[{x:-100,y:-100},{x:-100,y:250},{x:250,y:250},{x:250,y:-100}]),path('outside',[{x:1000,y:1000},{x:1300,y:1300}])];
 paths[2].geometry.polyline=true;const before=structuredClone(paths),result=createFlowViewportFilter()(paths,view,size);
 assert.deepEqual(result.routes.map(p=>p.edge.id),['cross','curve','loop']);assert.deepEqual(paths,before);assert.equal(result.routes[0],paths[0]);
});
test('viewport pan, zoom, resize and active routes determine visible drawing without truncating data',()=>{
 const near=path('near',[{x:10,y:10},{x:100,y:100}]),far=path('far',[{x:1500,y:1500},{x:1800,y:1800}]),paths=[near,far],filter=createFlowViewportFilter();
 assert.deepEqual(filter(paths,view,size).routes,[near]);
 assert.deepEqual(filter(paths,{x:-1500,y:-1500,zoom:1},size).routes,[far]);
 assert.deepEqual(filter(paths,{x:0,y:0,zoom:.1},size).routes,paths);
 assert.deepEqual(filter(paths,view,{width:2000,height:2000}).routes,paths);
 assert.deepEqual(filter(paths,view,size,['far']).routes,paths);
 assert.deepEqual(filter(paths,view,size,['far']).labels,paths);assert.equal(paths.length,2);
});
test('labels are culled independently, allowing long labels and displaced screen labels',()=>{
 const filter=createFlowViewportFilter(),cross=path('cross',[{x:-100,y:50},{x:900,y:50}],{x:5000,y:5000}),outside=path('long',[{x:5000,y:5000},{x:6000,y:6000}],{x:700,y:100},{title:'A'.repeat(200)});
 const result=filter([cross,outside],view,size);assert.deepEqual(result.routes,[cross]);assert.deepEqual(result.labels,[outside]);
 const screen={...outside,label:{x:100,y:100}};assert.deepEqual(filter([screen],{x:-10000,y:-10000,zoom:.25},size,[],true).labels,[screen]);
});
test('edited geometry invalidates cached bounds and stroke overscan preserves near-edge arrows',()=>{
 const filter=createFlowViewportFilter(),p=path('route',[{x:2000,y:2000},{x:2300,y:2300}]);assert.equal(filter([p],view,size).routes.length,0);
 const moved={...p,geometry:{...p.geometry,points:[{x:520,y:50},{x:530,y:50}]}};assert.deepEqual(filter([moved],view,size).routes,[moved]);
 assert.equal(filter([{...p,geometry:{...p.geometry,points:[{x:550,y:50},{x:580,y:50}]}}],view,size).routes.length,0);
});
