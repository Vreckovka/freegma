import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowRouteGesture} from '../client/flow-route-gesture.mjs';
import {overlayPath} from '../shared/flow-route.mjs';

function setup(route){
 const from={left:0,top:0,width:400,height:300},to={left:800,top:0,width:400,height:300},path={from,to,geometry:overlayPath(from,to,{route}),edge:{id:'next',route}};
 const previews=[],saves=[],errors=[],capture=new Set(),target={setPointerCapture:id=>capture.add(id),hasPointerCapture:id=>capture.has(id),releasePointerCapture:id=>capture.delete(id)};
 const event=(x=500,y=300,id=1)=>({pointerId:id,button:0,clientX:x,clientY:y,currentTarget:target,preventDefault(){},stopPropagation(){}});
 const c=createFlowRouteGesture({busy:()=>false,viewport:()=>({x:20,y:30,zoom:2}),rect:()=>({left:100,top:50}),onDragging(){},onPreview:r=>previews.push(r),onSave:async(id,r)=>saves.push({id,route:r}),onError:e=>errors.push(e)});
 return {c,path,previews,saves,errors,capture,event};
}
test('first line drag previews without saving, commits once and preserves endpoints',async()=>{
 const route={from:{side:'right',offset:.9},to:{side:'left',offset:.2}},s=setup(route);
 s.c.down(s.event(),s.path);s.c.move(s.event(520,340));s.c.move(s.event(540,380));
 assert.equal(s.previews.length,2);assert.equal(s.saves.length,0);
 await s.c.up(s.event(540,380));await s.c.up(s.event(540,380));
 assert.equal(s.saves.length,1);assert.equal(s.saves[0].id,'next');assert.deepEqual(s.saves[0].route.from,route.from);assert.deepEqual(s.saves[0].route.to,route.to);
 assert.equal(s.saves[0].route.controls[0].y,40);assert.equal(s.capture.size,0);
});
test('endpoint drag uses viewport coordinates and does not move curve controls or pivots',async()=>{
 const route={controls:[{x:120,y:-50},{x:-120,y:-30}],pivots:[{x:500,y:60}]},s=setup(route);
 s.c.down(s.event(),s.path,'to');s.c.move(s.event(1920,80));await s.c.up(s.event(1920,80));
 assert.deepEqual(s.saves[0].route.to,{side:'top',offset:.25});assert.deepEqual(s.saves[0].route.controls,route.controls);assert.deepEqual(s.saves[0].route.pivots,route.pivots);assert.deepEqual(route,s.path.edge.route);
});
test('click, tiny jitter, cancellation and unrelated pointer do not save',async()=>{
 const s=setup();s.c.down(s.event(),s.path);s.c.move(s.event(501,300));await s.c.up(s.event());assert.equal(s.saves.length,0);
 s.c.down(s.event(),s.path);s.c.move(s.event(540,380,2));await s.c.up(s.event(540,380,2));assert.ok(s.c.active());assert.equal(s.previews.filter(Boolean).length,0);
 s.c.move(s.event(540,380));s.c.cancel();await s.c.up(s.event(540,380));assert.equal(s.saves.length,0);assert.equal(s.capture.size,0);assert.equal(s.previews.at(-1),null);
});
test('captured edge identity survives selection changes and failed save clears preview',async()=>{
 const s=setup(),original=s.path.edge.id;s.c.down(s.event(),s.path);s.path.edge.id='other';s.c.move(s.event(540,380));await s.c.up(s.event(540,380));assert.equal(s.saves[0].id,original);
 const previews=[],errors=[],c=createFlowRouteGesture({busy:()=>false,viewport:()=>({x:0,y:0,zoom:1}),rect:()=>({left:0,top:0}),onDragging(){},onPreview:r=>previews.push(r),onSave:async()=>{throw Error('disk busy');},onError:e=>errors.push(e)});
 c.down(s.event(),s.path);c.move(s.event(600,400));await c.up(s.event(600,400));assert.deepEqual(errors,['disk busy']);assert.equal(previews.at(-1),null);assert.equal(c.active(),false);
});
test('a completed earlier save cannot clear a newer drag preview',async()=>{
 const s=setup(),previews=[];let finish;
 const c=createFlowRouteGesture({busy:()=>false,viewport:()=>({x:0,y:0,zoom:1}),rect:()=>({left:0,top:0}),onDragging(){},onPreview:r=>previews.push(r),onSave:()=>new Promise(resolve=>{finish=resolve;}),onError:assert.fail});
 c.down(s.event(),s.path);c.move(s.event(540,380));const first=c.up(s.event(540,380));
 c.down(s.event(),s.path);c.move(s.event(560,400));const newer=previews.at(-1);finish();await first;
 assert.equal(c.active(),true);assert.equal(previews.at(-1),newer);c.cancel();assert.equal(previews.at(-1),null);
});
