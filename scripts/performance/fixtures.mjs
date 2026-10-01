import fs from 'node:fs';import path from 'node:path';import {FreegmaStore} from '../../server/store.mjs';import {makeNode} from '../../shared/design.mjs';
export function createFixtures(root){
 if(fs.existsSync(path.join(root,'fixture.json')))return JSON.parse(fs.readFileSync(path.join(root,'fixture.json'),'utf8'));
 fs.mkdirSync(root,{recursive:true});const store=new FreegmaStore(path.join(root,'freegma.sqlite'),{seed:false});
 try{
 const project=store.createWorkspace('Performance laboratory · synthetic designs');
 function document(screens){const nodes=[];for(let s=0;s<screens;s++){const frame='screen_'+s;nodes.push(makeNode('frame',{id:frame,name:'Dashboard '+(s+1),x:s%5*900,y:Math.floor(s/5)*700,width:800,height:600,fill:'#121b2c',radius:12}));
 nodes.push(makeNode('text',{id:frame+'_title',parentId:frame,name:'Page heading',text:'Performance dashboard '+(s+1),x:24,y:24,width:730,height:40,color:'#edf3ff',fontSize:26,fontWeight:700}));
 for(let c=0;c<30;c++){const card=frame+'_card_'+c;nodes.push(makeNode('frame',{id:card,parentId:frame,name:'Metric '+c,x:24+c%5*150,y:90+Math.floor(c/5)*78,width:140,height:65,fill:'#1d2a41',radius:6}));nodes.push(makeNode('text',{id:card+'_label',parentId:card,name:'Metric label',text:'Metric '+c+' · '+(c*173),x:8,y:16,width:124,height:40,fontSize:12,color:'#b5c7e2'}));}}
 return {version:1,nodes};}
 const large=store.createBoard(project.id,'Large dashboard · 2,480 layers',document(40));
 const catalog=[];for(let w=0;w<6;w++){const child=store.createWorkspace('Catalog workspace '+(w+1),project.id);for(let b=0;b<3;b++)catalog.push(store.createBoard(child.id,'Catalog board '+b,document(4)).id);}
 let board=large;for(let h=0;h<12;h++)board=store.mutate(board.id,board.revision,[{op:'update',id:'screen_0_title',patch:{text:'Performance dashboard · history '+h}}],'Fixture history '+h);
 const overview=store.createFlowWorkspace('Performance laboratory · 240 steps',project.id),nodes=[],edges=[];
 for(let i=0;i<240;i++){nodes.push({id:'step_'+i,kind:'frame',title:'Screen '+i,explanation:'Synthetic local performance fixture. Master content is shared.',x:i%12*1000,y:Math.floor(i/12)*800,display:i%3===0?'card':'live',width:800,height:600,reference:{workspaceId:project.id,boardId:large.id,frameId:'screen_'+(i%40)}});if(i){edges.push({id:'edge_'+i,from:'step_'+(i-1),to:'step_'+i,title:'Continue '+i,explanation:'Local benchmark transition',event:'click',action:'straight'});edges.push({id:'return_'+i,from:'step_'+i,to:'step_'+(i-1),title:'Return '+i,explanation:'Local benchmark return',event:'click',action:'repeat'});}}
 const flow=store.replace(overview.board.id,overview.board.revision,{version:1,nodes:[],flow:{version:1,nodes,edges}},'Build synthetic large flow');
 const fixture={format:1,designWorkspace:project.id,designBoard:large.id,flowWorkspace:overview.workspace.id,flowBoard:flow.id,designLayers:large.document.nodes.length,flowSteps:nodes.length,flowEdges:edges.length,catalogBoards:catalog.length,historyEntries:12,createdAt:new Date().toISOString()};fs.writeFileSync(path.join(root,'fixture.json'),JSON.stringify(fixture,null,2));return fixture;
 }finally{store.close();}
}
