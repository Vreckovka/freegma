import test from 'node:test';
import assert from 'node:assert/strict';
import {ancestors,visibleLayers,treeNavigation,viewportForBounds,spacingGuides,workspaceRows,workspaceTrail,workspaceParentOptions} from '../client/editor.mjs';
import {makeNode,generateReact,layerStyle} from '../shared/design.mjs';
import {FreegmaStore} from '../server/store.mjs';

function scene(){const frame=makeNode('frame',{id:'frame',name:'Dashboard'}),card=makeNode('frame',{id:'card',parentId:'frame',name:'Metric card'}),label=makeNode('text',{id:'label',parentId:'card',name:'Metric label'}),other=makeNode('frame',{id:'other',name:'Mobile'});return [label,other,frame,card];}
test('tree navigation follows hierarchy rather than storage order; search reveals collapsed ancestors',()=>{
  const nodes=scene(),collapsed=new Set(['frame','card']);
  assert.deepEqual(visibleLayers(nodes,collapsed).map(r=>r.node.id),['other','frame']);
  assert.deepEqual(visibleLayers(nodes,collapsed,'LABEL').map(r=>[r.node.id,r.depth]),[['frame',0],['card',1],['label',2]]);
  assert.deepEqual(ancestors(nodes,'label').map(n=>n.id),['card','frame']);
  assert.deepEqual(visibleLayers(nodes,new Set()).map(r=>r.node.id),['other','frame','card','label']);
});
test('tree arrows expand/collapse and traverse visible rows without moving scene coordinates',()=>{
  const nodes=scene(),before=structuredClone(nodes),closed=new Set(['card']),rows=visibleLayers(nodes,closed);
  assert.deepEqual(treeNavigation(rows,'card','ArrowRight',closed),{expand:'card'});
  assert.deepEqual(treeNavigation(rows,'card','ArrowLeft',closed),{id:'frame'});
  assert.deepEqual(treeNavigation(rows,'frame','ArrowLeft',closed),{collapse:'frame'});
  assert.deepEqual(treeNavigation(rows,'frame','ArrowDown',closed),{id:'card'});
  assert.deepEqual(treeNavigation(rows,'card','End',closed),{id:'card'});
  assert.deepEqual(treeNavigation(rows,'card','Home',closed),{id:'other'});
  const open=visibleLayers(nodes);assert.deepEqual(treeNavigation(open,'card','ArrowRight',new Set()),{id:'label'});
  assert.deepEqual(treeNavigation(open,'label','ArrowLeft',new Set()),{id:'card'});
  assert.deepEqual(nodes,before);
});
test('revealing distant selections preserves zoom; fitting bounds centers the actual rendered size',()=>{
  const bounds={left:-1000,top:3000,width:240,height:160},size={width:800,height:600};
  const v=viewportForBounds(bounds,size,{zoom:.5},{fit:false});assert.equal(v.zoom,.5);
  assert.equal(v.x+(bounds.left+bounds.width/2)*v.zoom,400);assert.equal(v.y+(bounds.top+bounds.height/2)*v.zoom,300);
  const fit=viewportForBounds(bounds,size,{zoom:.5},{fit:true});assert.equal(fit.zoom,2);
  assert.equal(fit.x+(bounds.left+bounds.width/2)*fit.zoom,400);
});
test('padding guides use measured dimensions and borders; vertical gap reports actual distributed spacing',()=>{
  const node=makeNode('frame',{layout:'vertical',strokeWidth:2,paddingTop:10,paddingLeft:20,paddingRight:8,paddingBottom:6,gap:12});
  const bounds={left:100,top:200,width:300,height:240},children=[{left:122,top:212,width:180,height:30},{left:122,top:266,width:180,height:40}];
  const guides=spacingGuides(node,bounds,children),top=guides.find(g=>g.field==='Padding top'),gap=guides.find(g=>g.kind==='gap');
  assert.deepEqual([top.left,top.top,top.width,top.height],[102,202,296,10]);
  assert.deepEqual([gap.top,gap.height,gap.label],[242,24,'24']); // Margins or distributed justification can exceed configured gap.
  assert.equal(guides.filter(g=>g.kind==='padding').length,4);
  assert.equal(spacingGuides({...node,layout:'free'},bounds,children).some(g=>g.kind==='gap'),false);
});
test('horizontal guides omit overlapping children and clamp oversized padding to the rendered box',()=>{
  const node=makeNode('frame',{layout:'horizontal',paddingTop:999,paddingLeft:0}),bounds={left:0,top:0,width:100,height:80};
  const guides=spacingGuides(node,bounds,[{left:0,top:0,width:60,height:30},{left:50,top:0,width:40,height:30}]);
  assert.equal(guides.find(g=>g.field==='Padding top').height,80);assert.equal(guides.some(g=>g.kind==='gap'),false);
  const row=spacingGuides({...node,paddingTop:0},bounds,[{left:0,top:0,width:20,height:30},{left:32,top:0,width:20,height:30}]);
  assert.deepEqual([row[0].left,row[0].width,row[0].label],[20,12,'12']);
});
test('linked padding edits persist atomically, export to React and undo as one change; invalid gap is rejected',()=>{
  const store=new FreegmaStore(':memory:',{seed:false});try{
    const w=store.createWorkspace('Spacing'),b=store.createBoard(w.id,'Card'),n=makeNode('frame',{layout:'vertical'});
    const saved=store.mutate(b.id,b.revision,[{op:'add',node:n}]),patch={paddingTop:24,paddingRight:24,paddingBottom:24,paddingLeft:24,gap:16};
    const edited=store.mutate(b.id,saved.revision,[{op:'update',id:n.id,patch}]),frame=edited.document.nodes[0];
    assert.equal(layerStyle(frame).padding,'24px 24px 24px 24px');assert.match(generateReact(edited.document).code,/24px 24px 24px 24px/);
    assert.throws(()=>store.mutate(b.id,edited.revision,[{op:'update',id:n.id,patch:{gap:-1}}]),/nonnegative/);
    assert.equal(store.getBoard(b.id).revision,edited.revision);
    const undone=store.travel(b.id,edited.revision,'undo');assert.equal(undone.document.nodes[0].paddingTop,0);assert.equal(undone.document.nodes[0].paddingRight,0);
    assert.equal(store.travel(b.id,undone.revision,'redo').document.nodes[0].paddingLeft,24);
  }finally{store.close();}
});

test('workspace tree groups children, collapses folders and excludes descendants from parent choices',()=>{
 const workspaces=[{id:'light',name:'Light Mode',parentId:'freegma'},{id:'other',name:'Other',parentId:null},{id:'freegma',name:'Freegma',parentId:null},{id:'dark',name:'Dark Mode',parentId:'freegma'}];
 assert.deepEqual(workspaceRows(workspaces).map(r=>[r.node.id,r.depth]),[['other',0],['freegma',0],['light',1],['dark',1]]);
 assert.deepEqual(workspaceRows(workspaces,new Set(['freegma'])).map(r=>r.node.id),['other','freegma']);
 assert.deepEqual(workspaceTrail(workspaces,'light').map(w=>w.name),['Freegma','Light Mode']);
 assert.deepEqual(workspaceParentOptions(workspaces,'freegma').map(w=>w.id),['other']);
});
