import test from 'node:test';
import assert from 'node:assert/strict';
import {FreegmaStore} from '../server/store.mjs';
import {resolveDocument,bindingPatch} from '../shared/colors.mjs';
import {clone,makeNode,copyNodes,descendants} from '../shared/design.mjs';
import {propertyEditable} from '../shared/instance-locks.mjs';
function fixture(){const s=new FreegmaStore(':memory:',{seed:false}),p=s.createProject('Locks','light-dark'),master=s.getBoard(s.boards(p.workspace.id).find(b=>b.name==='Shared components').id),instance=p.board.document.nodes.find(n=>n.componentId&&n.name==='Button');return {s,p,master,instance};}
const override=(id,property,enabled=true)=>({op:'override',id,property,enabled});

test('instances are browseable but native fields, CSS and document replacement require an explicit override',()=>{
 const {s,p,instance}=fixture();try{const b=s.getBoard(p.board.id),before=clone(b.document);
  assert.equal(propertyEditable(b.document.nodes,instance.id,'radius'),false);assert.ok(s.componentReference(b.id,instance.id).master);
  assert.throws(()=>s.mutate(b.id,b.revision,[{op:'update',id:instance.id,patch:{radius:32}}]),e=>e.status===423);
  const doc=clone(b.document);doc.nodes.find(n=>n.id===instance.id).radius=32;assert.throws(()=>s.replace(b.id,b.revision,doc),e=>e.status===423);
  const css=s.export(b.id,instance.id).css.replace('border-radius: 8px','border-radius: 32px');assert.throws(()=>s.applyCss(b.id,b.revision,css,instance.id,b.palette.revision,b.palette.themeId),e=>e.status===423);
  assert.deepEqual(s.getBoard(b.id).document,before);assert.equal(s.getBoard(b.id).revision,b.revision);
 }finally{s.close();}
});

test('each property unlocks independently, persists as an override, and resets to the latest main component',()=>{
 const {s,p,master,instance}=fixture();try{let b=s.mutate(p.board.id,p.board.revision,[override(instance.id,'radius'),{op:'update',id:instance.id,patch:{radius:30}}]);
  assert.equal(propertyEditable(b.document.nodes,instance.id,'radius'),true);assert.equal(propertyEditable(b.document.nodes,instance.id,'gap'),false);
  let m=s.mutate(master.id,master.revision,[{op:'update',id:'shared_button',patch:{radius:18,gap:24}}]);b=s.getBoard(b.id);let n=b.document.nodes.find(n=>n.id===instance.id);assert.equal(n.radius,30);assert.equal(n.gap,24);
  b=s.mutate(b.id,b.revision,[override(instance.id,'radius',false)]);n=b.document.nodes.find(n=>n.id===instance.id);assert.equal(n.radius,18);assert.ok(!n.overrides.includes('radius'));
  m=s.mutate(m.id,m.revision,[{op:'update',id:'shared_button',patch:{radius:9}}]);assert.equal(s.getBoard(b.id).document.nodes.find(n=>n.id===instance.id).radius,9);
  b=s.getBoard(b.id);b=s.travel(b.id,b.revision,'undo');assert.equal(b.document.nodes.find(n=>n.id===instance.id).radius,18); // Undo latest propagated change
 }finally{s.close();}
});

test('local fill and role bindings do not freeze unrelated colors; reset restores the current master binding',()=>{
 const {s,p,master,instance}=fixture();try{let b=s.mutate(p.board.id,p.board.revision,[override(instance.id,'fill'),{op:'update',id:instance.id,patch:{fill:'#123456'}}]);
  let m=s.mutate(master.id,master.revision,[{op:'update',id:'shared_button',patch:{fill:'#abcdef',color:'#654321'}}]);b=s.getBoard(b.id);let n=b.document.nodes.find(n=>n.id===instance.id);assert.equal(n.fill,'#123456');assert.equal(n.color,'#654321');
  m=s.mutate(m.id,m.revision,[{op:'update',id:'shared_button',patch:bindingPatch(m.document.nodes.find(n=>n.id==='shared_button'),'fill','accent')}]);b=s.getBoard(b.id);
  b=s.mutate(b.id,b.revision,[override(instance.id,'fill',false)]);n=b.document.nodes.find(n=>n.id===instance.id);assert.equal(n.colorBindings.find(b=>b.path==='fill').token,'accent');assert.equal(resolveDocument(b.document,b.palette).nodes.find(n=>n.id===instance.id).fill,'#ae9bff');
  assert.throws(()=>s.mutate(b.id,b.revision,[{op:'update',id:n.id,patch:bindingPatch(n,'fill','surface')}]),e=>e.status===423);
 }finally{s.close();}
});

test('individual CSS declarations are independently overrideable and portable',()=>{
 const {s,p,master,instance}=fixture();try{let b=s.mutate(p.board.id,p.board.revision,[override(instance.id,'cssOverrides.box-shadow'),{op:'update',id:instance.id,patch:{cssOverrides:{'box-shadow':'0 1px 8px #000000'}}}]);
  assert.throws(()=>s.mutate(b.id,b.revision,[{op:'update',id:instance.id,patch:{cssOverrides:{'box-shadow':'0 1px 8px #000000','text-shadow':'0 2px 4px #000000'}}}]),e=>e.status===423);
  s.mutate(master.id,master.revision,[{op:'update',id:'shared_button',patch:{cssOverrides:{'box-shadow':'0 1px 2px #111111','text-shadow':'0 1px 2px #222222'}}}]);b=s.getBoard(b.id);let n=b.document.nodes.find(n=>n.id===instance.id);assert.equal(n.cssOverrides['box-shadow'],'0 1px 8px #000000');assert.equal(n.cssOverrides['text-shadow'],'0 1px 2px #222222');
  const other=new FreegmaStore(':memory:',{seed:false});try{const imported=other.importFree(s.exportFree(b.id,'board').package);const n=imported.boards[0].document.nodes.find(n=>n.id===instance.id);assert.ok(n.overrides.includes('cssOverrides.box-shadow'));}finally{other.close();}
  b=s.mutate(b.id,b.revision,[override(instance.id,'cssOverrides.box-shadow',false)]);n=b.document.nodes.find(n=>n.id===instance.id);assert.equal(n.cssOverrides['box-shadow'],'0 1px 2px #111111');
 }finally{s.close();}
});

test('override actions and edits are atomic, undoable, and protect internal structure',()=>{
 const {s,p,instance}=fixture();try{let b=s.getBoard(p.board.id);const child=b.document.nodes.find(n=>n.parentId===instance.id);
  assert.throws(()=>s.mutate(b.id,b.revision,[override(instance.id,'radius'),{op:'update',id:instance.id,patch:{gap:32}}]),e=>e.status===423);assert.deepEqual(s.getBoard(b.id).document,b.document);
  for(const op of [{op:'remove',id:child.id},{op:'add',node:makeNode('text',{parentId:instance.id})},{op:'detach',id:child.id}])assert.throws(()=>s.mutate(b.id,b.revision,[op]),e=>e.status===423);
  b=s.mutate(b.id,b.revision,[override(instance.id,'radius'),{op:'update',id:instance.id,patch:{radius:22}}]);b=s.travel(b.id,b.revision,'undo');assert.equal(b.document.nodes.find(n=>n.id===instance.id).radius,8);assert.deepEqual(b.document.nodes.find(n=>n.id===instance.id).overrides,[]);
  b=s.travel(b.id,b.revision,'redo');assert.equal(b.document.nodes.find(n=>n.id===instance.id).radius,22);
  b=s.mutate(b.id,b.revision,[{op:'detach',id:instance.id},{op:'update',id:child.id,patch:{text:'Now independent'}}]);assert.equal(b.document.nodes.find(n=>n.id===child.id).text,'Now independent');
 }finally{s.close();}
});

test('instance placement overrides reset to their own board placement, never the master canvas coordinates',()=>{
 const {s,p,instance}=fixture();try{let b=s.mutate(p.board.id,p.board.revision,[override(instance.id,'x'),{op:'update',id:instance.id,patch:{x:500}}]);b=s.mutate(b.id,b.revision,[override(instance.id,'x',false)]);assert.equal(b.document.nodes.find(n=>n.id===instance.id).x,32);
 }finally{s.close();}
});

test('duplicating an instance resets placement against its own starting location',()=>{
 const {s,p,instance}=fixture();try{let b=s.mutate(p.board.id,p.board.revision,[{op:'duplicate',id:instance.id,x:420,y:600}]);const copy=b.document.nodes.find(n=>n.componentId===instance.componentId&&n.id!==instance.id&&n.x===420);
  b=s.mutate(b.id,b.revision,[override(copy.id,'x'),{op:'update',id:copy.id,patch:{x:900}}]);b=s.mutate(b.id,b.revision,[override(copy.id,'x',false)]);assert.equal(b.document.nodes.find(n=>n.id===copy.id).x,420);
 }finally{s.close();}
});

test('pasting a complete linked instance is permitted, while inserting into an existing instance is locked',()=>{
 const {s,p,instance}=fixture();try{let b=s.getBoard(p.board.id);const copied=copyNodes(descendants(b.document.nodes,instance.id),{x:600,y:700});b=s.mutate(b.id,b.revision,copied.map(node=>({op:'add',node})));
  assert.ok(s.componentReference(b.id,copied[0].id));assert.equal(b.document.nodes.filter(n=>n.componentId===instance.componentId).length,3);
  assert.throws(()=>s.mutate(b.id,b.revision,[{op:'update',id:copied[0].id,patch:{radius:20}}]),e=>e.status===423);
  assert.throws(()=>s.insertComponent(b.id,b.revision,instance.componentId,{parentId:instance.id}),e=>e.status===423);
 }finally{s.close();}
});

test('parent overrides stay within their instance, survive updates, and reset to the master hierarchy',()=>{
 const {s,p,master,instance}=fixture();try{let m=s.mutate(master.id,master.revision,[{op:'add',node:makeNode('frame',{id:'label_group',parentId:'shared_button',width:100,height:40})}]);let b=s.getBoard(p.board.id),label=b.document.nodes.find(n=>n.parentId===instance.id&&n.type==='text'),group=b.document.nodes.find(n=>n.parentId===instance.id&&n.sourceId==='label_group');
  assert.throws(()=>s.mutate(b.id,b.revision,[override(label.id,'parentId'),{op:'update',id:label.id,patch:{parentId:null}}]),e=>e.status===423);
  b=s.mutate(b.id,b.revision,[override(label.id,'parentId'),{op:'update',id:label.id,patch:{parentId:group.id}}]);m=s.mutate(m.id,m.revision,[{op:'update',id:'shared_button',patch:{radius:17}}]);b=s.getBoard(b.id);assert.equal(b.document.nodes.find(n=>n.id===label.id).parentId,group.id);
  b=s.mutate(b.id,b.revision,[override(label.id,'parentId',false)]);assert.equal(b.document.nodes.find(n=>n.id===label.id).parentId,instance.id);
  const plain=makeNode('text');b=s.mutate(b.id,b.revision,[{op:'add',node:plain}]);assert.throws(()=>s.mutate(b.id,b.revision,[{op:'update',id:plain.id,patch:{parentId:instance.id}}]),e=>e.status===423);
 }finally{s.close();}
});

test('resetting one declaration splits a legacy whole-CSS override while preserving other local declarations',()=>{
 const {s,p,master,instance}=fixture();try{let b=s.mutate(p.board.id,p.board.revision,[override(instance.id,'cssOverrides'),{op:'update',id:instance.id,patch:{cssOverrides:{'box-shadow':'0 2px 5px #123456','text-shadow':'0 1px 2px #654321'}}}]);
  s.mutate(master.id,master.revision,[{op:'update',id:'shared_button',patch:{cssOverrides:{'box-shadow':'0 1px 1px #000000','text-shadow':'0 1px 1px #111111'}}}]);b=s.getBoard(b.id);b=s.mutate(b.id,b.revision,[override(instance.id,'cssOverrides.box-shadow',false)]);const n=b.document.nodes.find(n=>n.id===instance.id);assert.equal(n.cssOverrides['box-shadow'],'0 1px 1px #000000');assert.equal(n.cssOverrides['text-shadow'],'0 1px 2px #654321');assert.deepEqual(n.overrides,['cssOverrides.text-shadow']);
 }finally{s.close();}
});

test('vector path color overrides preserve only that path property and reset independently',()=>{
 const s=new FreegmaStore(':memory:',{seed:false});try{const w=s.createWorkspace('Vectors'),v=makeNode('vector',{id:'vector',viewBox:[0,0,20,20],paths:[{d:'M0 0 L20 20',fill:'#112233',stroke:'#445566',strokeWidth:2,opacity:1}],colorBindings:[{path:'paths.0.fill',token:'accent',source:'#112233'}]});let m=s.createBoard(w.id,'Master',{nodes:[v]});const saved=s.saveComponent(m.id,m.revision,v.id,'Arrow'),target=s.createBoard(w.id,'Instances'),i=s.insertComponent(target.id,target.revision,saved.component.id);m=saved.board;
  let b=s.mutate(target.id,i.board.revision,[override(i.nodeId,'paths.0.fill'),{op:'update',id:i.nodeId,patch:{paths:[{...v.paths[0],fill:'#abcdef'}]}}]);
  m=s.mutate(m.id,m.revision,[{op:'update',id:v.id,patch:{paths:[{...v.paths[0],fill:'#fedcba',stroke:'#123456',strokeWidth:4}]}}]);b=s.getBoard(b.id);let n=b.document.nodes[0];assert.equal(n.paths[0].fill,'#abcdef');assert.equal(n.paths[0].stroke,'#123456');assert.equal(n.paths[0].strokeWidth,4);
  assert.throws(()=>s.mutate(b.id,b.revision,[{op:'update',id:n.id,patch:{paths:[{...n.paths[0],stroke:'#ffffff'}]}}]),e=>e.status===423);
  b=s.mutate(b.id,b.revision,[override(n.id,'paths.0.fill',false)]);assert.equal(b.document.nodes[0].paths[0].fill,'#fedcba');assert.ok(!b.document.nodes[0].overrides.length);
 }finally{s.close();}
});
