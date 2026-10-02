import test from 'node:test';
import assert from 'node:assert/strict';
import {contextualConnectorOwners,connectorSelectionIds} from '../client/flow-connector-visibility.mjs';
const owners=Array.from({length:240},(_,i)=>({id:'frame'+i}));
test('idle large canvases expose no connector buttons; interaction exposes only relevant frames',()=>{
 assert.equal(contextualConnectorOwners(owners).length,0);
 assert.deepEqual(contextualConnectorOwners(owners,{hoveredId:'frame12'}).map(o=>o.id),['frame12']);
 assert.deepEqual(contextualConnectorOwners(owners,{activeIds:['frame12','frame28','removed'],focusedId:'frame12'}).map(o=>o.id),['frame12','frame28']);
});
test('a draft suppresses unrelated selections and keeps its source and current target available',()=>{
 const context={drafting:true,sourceId:'frame4',targetId:'frame11',activeIds:['frame2'],hoveredId:'frame3',focusedId:'frame8'};
 assert.deepEqual(contextualConnectorOwners(owners,context).map(o=>o.id),['frame4','frame11']);
 assert.deepEqual(contextualConnectorOwners(owners,{...context,targetId:null}).map(o=>o.id),['frame4']);
 assert.equal(contextualConnectorOwners(owners,{...context,sourceId:'removed',targetId:null}).length,0);
});
test('selected child controls reveal their closest owning frame; parent cycles and deleted layers are safe',()=>{
 const nodes=new Map([['button',{parentId:'nested'}],['nested',{parentId:'frame0'}],['loop',{parentId:'loop'}]]);
 assert.deepEqual(connectorSelectionIds(['button','nested','frame12','removed','loop'],nodes,[...owners,{id:'nested'}]),['nested','frame12']);
 assert.deepEqual(connectorSelectionIds(['button'],nodes,owners),['frame0']);
});
