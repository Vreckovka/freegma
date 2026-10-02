import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {FreegmaStore} from '../server/store.mjs';import {makeNode} from '../shared/design.mjs';
function freeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;}
function fixture(){const s=new FreegmaStore(':memory:',{seed:false}),owner=s.createWorkspace('Library'),child=s.createWorkspace('Theme',owner.id);let master=s.createBoard(owner.id,'Master',{version:1,nodes:[makeNode('frame',{id:'master',radius:8}),makeNode('text',{id:'label',parentId:'master',text:'Shared'})]});const saved=s.saveComponent(master.id,master.revision,'master','Card');master=saved.board;const inserted=s.insertComponent(s.createBoard(child.id,'Usage').id,1,saved.component.id);let unrelated=s.createBoard(child.id,'Unrelated',{nodes:[makeNode('text',{id:'other',text:'No instance'})]});unrelated=s.mutate(unrelated.id,unrelated.revision,[{op:'update',id:'other',patch:{text:'Unrelated history'}}]);return {s,owner,child,master,usage:inserted.board,instanceId:inserted.nodeId,unrelated,componentId:saved.component.id};}
test('component-reference scans borrow frozen boards and return independently editable reference metadata',()=>{
 const {s,owner,master,usage,instanceId,unrelated,componentId}=fixture();try{
  const snapshots=[master,usage,unrelated].map(b=>s.readBoard(b.id,false)),before=structuredClone(snapshots);for(const raw of snapshots)freeze(raw);freeze(s.manifest(owner.id,false));
  const read=s.readBoard.bind(s),reads=[];s.readBoard=(id,copy=true)=>{reads.push({id,copy});return read(id,copy);};
  const reference=s.componentReference(usage.id,instanceId);assert.equal(reference.id,componentId);assert.equal(reference.master.boardId,master.id);assert.equal(reference.usageCount,1);assert.equal(reads.filter(r=>r.copy).length,0);
  reference.master.nodeName='User edited response';reference.usages[0].nodeName='Changed response';reference.overrides.push('radius');
  const fresh=s.componentReference(usage.id,instanceId);assert.equal(fresh.master.nodeName,before[0].document.nodes[0].name);assert.notEqual(fresh.usages[0].nodeName,'Changed response');assert.equal(fresh.overrides.includes('radius'),false);assert.deepEqual(snapshots,before);
 }finally{s.close();}
});
test('master propagation avoids copying non-instance histories; borrowed state remains exact on success and rollback',()=>{
 const {s,master,usage,instanceId,unrelated}=fixture();try{
  const original=s.readBoard(unrelated.id,false),instance=s.readBoard(usage.id,false),masterRaw=s.readBoard(master.id,false),snapshots=[original,instance,masterRaw],before=structuredClone(snapshots),unrelatedBytes=fs.readFileSync(unrelated.filePath);for(const raw of snapshots)freeze(raw);
  const read=s.readBoard.bind(s),copies=[];s.readBoard=(id,copy=true)=>{if(copy)copies.push(id);return read(id,copy);};
  let current=s.mutate(master.id,master.revision,[{op:'update',id:'master',patch:{radius:27}}]);assert.equal(s.getBoard(usage.id).document.nodes.find(n=>n.id===instanceId).radius,27);assert.equal(copies.includes(unrelated.id),false);assert.deepEqual(snapshots,before);assert.deepEqual(fs.readFileSync(unrelated.filePath),unrelatedBytes);
  current=s.travel(current.id,current.revision,'undo');assert.equal(s.getBoard(usage.id).document.nodes.find(n=>n.id===instanceId).radius,8);current=s.travel(current.id,current.revision,'redo');assert.equal(s.getBoard(usage.id).document.nodes.find(n=>n.id===instanceId).radius,27);
  const savedMaster=s.readBoard(current.id,false),savedUsage=s.readBoard(usage.id,false),saved=structuredClone([savedMaster,savedUsage]);freeze(savedMaster);freeze(savedUsage);const masterBytes=fs.readFileSync(current.filePath),usageBytes=fs.readFileSync(usage.filePath),write=s.writeBoard.bind(s);s.writeBoard=(b,...args)=>{if(b.id===usage.id)throw Error('Injected propagation failure');return write(b,...args);};
  assert.throws(()=>s.mutate(current.id,current.revision,[{op:'update',id:'master',patch:{radius:55}}]),/Injected propagation failure/);assert.deepEqual([savedMaster,savedUsage],saved);assert.deepEqual(fs.readFileSync(current.filePath),masterBytes);assert.deepEqual(fs.readFileSync(usage.filePath),usageBytes);assert.equal(s.getBoard(usage.id).document.nodes.find(n=>n.id===instanceId).radius,27);
 }finally{s.close();}
});
