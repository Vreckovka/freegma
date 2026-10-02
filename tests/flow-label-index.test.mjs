import test from 'node:test';import assert from 'node:assert/strict';
import {createFlowLabelIndex} from '../client/flow-label-index.mjs';
function compare(entries){const index=createFlowLabelIndex(),labels=[];for(const {candidates,width} of entries){const expected=candidates.find(p=>!labels.some(r=>Math.abs(r.x-p.x)<(r.width+width)/2+6&&Math.abs(r.y-p.y)<26))||candidates[0];assert.equal(index.place(candidates,width),expected);labels.push({...expected,width});}}
test('label buckets retain exact placement across negative coordinates, widths and boundaries',()=>{
 let seed=174;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 const entries=Array.from({length:4000},()=>({width:Math.floor(random()*600),candidates:Array.from({length:5},()=>({x:Math.floor(random()*10000)-5000,y:Math.floor(random()*2000)-1000}))}));compare(entries);
});
test('strict collision thresholds and fallback order remain unchanged after indexing',()=>{
 const entries=Array.from({length:64},(_,i)=>({width:100,candidates:[{x:i*1000,y:-320}]}));
 for(const delta of [0,1e-7,-1e-7]){entries.push({width:100,candidates:[{x:100+6+delta,y:-320},{x:0,y:-320+26+delta}]});}
 entries.push(...Array.from({length:200},()=>({width:280,candidates:[{x:0,y:-320},{x:1,y:-319}]})));compare(entries);
});
test('a clustered prefix can expand into a spatial index without losing placed labels',()=>{
 const entries=Array.from({length:500},(_,i)=>({width:80,candidates:[{x:i%10*10,y:Math.floor(i/10)%5*10}]}));
 entries.push(...Array.from({length:500},(_,i)=>({width:280,candidates:[{x:2000+i*80,y:i%10*100},{x:0,y:0}]})));compare(entries);
});
