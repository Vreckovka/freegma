import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlowRoutingCache} from '../client/flow-routing-cache.mjs';
import {flowStepPath} from '../shared/flow-route.mjs';
import {routeForPorts} from '../shared/flow-ports.mjs';
const nodes=[{id:'home',kind:'frame',display:'live',width:400,height:300,x:20,y:40},{id:'next',kind:'frame',display:'card',x:900,y:60,ports:{left:{side:'top',offset:.2}}},{id:'decision',kind:'decision',x:600,y:500}];
const edges=[{id:'go',from:'home',to:'next',title:'Go',action:'straight',toPort:'left'},{id:'back',from:'next',to:'home',title:'Back',action:'repeat',route:{via:{x:-80,y:700},pivots:[{x:1100,y:750},{x:-100,y:750}]}},{id:'branch',from:'decision',to:'next',title:'Yes',action:'if'},{id:'missing',from:'gone',to:'home',action:'straight'}];
test('indexed routes preserve exact live/card/symbol bounds, ports, repeats and pivots',()=>{
 const route=createFlowRoutingCache(),actual=route(nodes,edges),expected=edges.flatMap(e=>{const a=nodes.find(n=>n.id===e.from),b=nodes.find(n=>n.id===e.to);return a&&b?[flowStepPath(a,b,{...e,route:routeForPorts(e,a.ports,b.ports)})]:[];});
 assert.deepEqual(actual,expected);assert.equal(actual.length,3);assert.deepEqual(actual[0].geometry.points.at(-1),{x:948,y:60});
});
test('hover and selection reuse routes; preview and completed edits invalidate exact inputs',()=>{
 const route=createFlowRoutingCache(),initial=route(nodes,edges);
 assert.equal(route(nodes,edges,'go'),initial);assert.equal(route(nodes,edges,'back'),initial);
 const preview={to:{side:'left',offset:.9}},draft=route(nodes,edges,'go',preview);
 assert.notEqual(draft,initial);assert.equal(route(nodes,edges,'go',preview),draft);assert.notDeepEqual(draft[0].geometry,initial[0].geometry);assert.deepEqual(draft[1],initial[1]);
 const restored=route(nodes,edges);assert.deepEqual(restored,initial);
 const moved=nodes.map(n=>n.id==='home'?{...n,x:150,width:600}:n),afterMove=route(moved,edges);assert.equal(afterMove[0].geometry.points[0].x,750);
 const changed=edges.map(e=>e.id==='go'?{...e,title:'Changed title',route:preview}:e),afterEdit=route(moved,changed);assert.equal(afterEdit[0].edge.title,'Changed title');assert.deepEqual(afterEdit[0].edge.route.to,preview.to);
});
test('ports and resized live masters invalidate routing; caches are isolated per editor',()=>{
 const first=createFlowRoutingCache(),second=createFlowRoutingCache(),initial=first(nodes,edges),other=second(nodes,edges);
 assert.notEqual(initial,other);assert.deepEqual(initial,other);
 const changed=nodes.map(n=>n.id==='next'?{...n,display:'live',width:600,height:400,ports:{left:{side:'bottom',offset:.7}}}:n),paths=first(changed,edges);
 assert.deepEqual(paths[0].geometry.points.at(-1),{x:1320,y:460});assert.equal(second(nodes,edges),other);
});
