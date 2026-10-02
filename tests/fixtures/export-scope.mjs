import {makeNode} from '../../shared/design.mjs';
export function exportScopeDocument(selected='/assets/scoped.png',outside='/assets/outside.png'){
 return {version:1,nodes:[
  makeNode('frame',{id:'scope_outer',name:'Outer board',x:-120,y:340,width:900,height:600,layout:'horizontal',gap:19,paddingLeft:30}),
  makeNode('frame',{id:'scope_card',parentId:'scope_outer',name:'Nested card',x:60,y:75,width:400,height:300,layout:'vertical',gap:9,paddingTop:12,paddingLeft:18,cssOverrides:{left:'27px',top:'41px',width:'75%'},colorBindings:[{path:'fill',token:'background',source:'#ffffff'}]}),
  makeNode('text',{id:'scope_heading',parentId:'scope_card',name:'Card heading',text:'Reusable “card” 🚀',height:45,widthSizing:'fill',color:'#e8eaf3',colorBindings:[{path:'color',token:'text',source:'#e8eaf3'}]}),
  makeNode('image',{id:'scope_image',parentId:'scope_card',name:'Selected image',src:selected,width:80,height:40,cssOverrides:{'object-fit':'contain','border-radius':'13px'}}),
  makeNode('frame',{id:'scope_scheme',parentId:'scope_card',name:'Project colors',colorSchematic:true,width:350,height:430}),
  makeNode('vector',{id:'scope_vector',parentId:'scope_card',name:'Selected vector',viewBox:[0,0,20,20],paths:[{d:'M0 0 L20 20',fill:'none',stroke:'#ae9bff',strokeWidth:2,opacity:1}],colorBindings:[{path:'paths.0.stroke',token:'accent',source:'#ae9bff'}]}),
  makeNode('image',{id:'scope_outside',parentId:'scope_outer',name:'Unrelated image',src:outside}),
  makeNode('frame',{id:'scope_other',name:'Unrelated artboard',x:2000,y:-100,width:700,height:800})
 ]};
}
export function createExportScope(store,parentId=null){
 const workspace=store.createWorkspace('Scope',parentId),png=Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64');
 const selected=store.addAsset(workspace.id,{mime:'image/png',filename:'selected.png',base64:png}),outside=store.addAsset(workspace.id,{mime:'image/png',filename:'outside.png',base64:png});
 return {workspace,selected,outside,board:store.createBoard(workspace.id,'Scoped export laboratory',exportScopeDocument(selected.src,outside.src))};
}
export function normalizeScopeAssets(text,fixture){return text.replaceAll(fixture.selected.src,'/assets/scoped.png').replaceAll(fixture.outside.src,'/assets/outside.png');}
