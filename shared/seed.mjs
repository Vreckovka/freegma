import {makeNode} from './design.mjs';
export function starterDocument(){
  const nodes=[];
  const add=(type,patch)=>{const n=makeNode(type,patch);nodes.push(n);return n.id;};
  const screen=add('frame',{name:'Dashboard / Desktop',x:100,y:120,width:1050,height:710,fill:'#0e1625',radius:16,clip:true});
  const side=add('frame',{parentId:screen,name:'Navigation',width:190,height:710,fill:'#121d30',layout:'vertical',paddingTop:28,paddingLeft:22,gap:24});
  add('text',{parentId:side,name:'Brand',width:150,height:40,text:'✦  Freegma',fontSize:23,fontWeight:700,color:'#f4f6ff'});
  for(const [i,label]of ['Overview','Projects','Workers','Analytics','Settings'].entries())add('text',{parentId:side,name:label,width:145,height:36,text:label,fontSize:14,color:i?'#9daec8':'#b3a8ff',fill:i?'transparent':'#302b50',radius:7,paddingLeft:12,paddingTop:7});
  add('text',{parentId:screen,name:'Welcome title',x:222,y:34,width:650,height:48,text:'Welcome back, Roman',fontSize:30,fontWeight:700,color:'#f5f7ff'});
  add('text',{parentId:screen,name:'Welcome description',x:224,y:88,width:630,height:25,text:'A little clarity for everything your agents are building.',fontSize:14,color:'#94a5c2'});
  const button=add('frame',{parentId:screen,name:'Primary button',x:835,y:43,width:176,height:42,fill:'#7864ff',radius:8,layout:'horizontal',align:'center',justify:'center',gap:8});
  add('text',{parentId:button,name:'Button label',width:128,height:23,text:'+  New task',color:'#ffffff',fontSize:14,fontWeight:600,textAlign:'center'});
  for(const [i,[label,value,note]]of [['Active agents','11','8 online right now'],['Tasks this week','448','28% more than last week'],['Tokens used','2.2M','58% of weekly allowance']].entries()){
    const card=add('frame',{parentId:screen,name:label+' card',x:224+i*263,y:145,width:245,height:148,fill:'#19243a',stroke:'#2a3852',strokeWidth:1,radius:12,layout:'vertical',paddingTop:19,paddingLeft:19,gap:8});
    add('text',{parentId:card,name:'Metric label',width:202,height:22,text:label,fontSize:13,color:'#a0b0cb'});
    add('text',{parentId:card,name:'Metric value',width:202,height:45,text:value,fontSize:32,fontWeight:700,color:'#ffffff'});
    add('text',{parentId:card,name:'Metric note',width:202,height:20,text:note,fontSize:11,color:'#66d9b2'});
  }
  const tasks=add('frame',{parentId:screen,name:'Task management',x:224,y:318,width:772,height:276,fill:'#19243a',stroke:'#2a3852',strokeWidth:1,radius:12,layout:'vertical',paddingTop:20,paddingLeft:20,paddingRight:20,gap:17});
  add('text',{parentId:tasks,name:'Section title',width:700,height:30,text:'Task management',fontSize:20,fontWeight:600,color:'#f2f5ff'});
  for(const [i,label]of ['Build the next great thing','Review dashboard updates','Finish the component library'].entries()){
    const row=add('frame',{parentId:tasks,name:'Task row '+(i+1),width:730,height:45,fill:'#222f47',radius:7,layout:'horizontal',align:'center',paddingLeft:14,gap:16});
    add('text',{parentId:row,name:'Task ID',width:84,height:22,text:'DASH-'+(642-i),fontSize:12,color:'#a5b6d4'});
    add('text',{parentId:row,name:'Task title',width:420,height:22,text:label,fontSize:13,color:'#eef2ff'});
    add('text',{parentId:row,name:'Task status',width:145,height:22,text:['●  In progress','●  Review','●  Done'][i],fontSize:12,color:['#65a8ff','#ffce6b','#69dfae'][i]});
  }
  add('text',{parentId:screen,name:'Footer',x:225,y:636,width:750,height:32,text:'Make it yours. Every layer, color and spacing value is editable.',fontSize:13,color:'#7e90af'});
  const phone=add('frame',{name:'Dashboard / Mobile',x:1240,y:120,width:360,height:710,fill:'#0e1625',radius:22,layout:'vertical',paddingTop:30,paddingLeft:24,paddingRight:24,gap:18});
  add('text',{parentId:phone,name:'Mobile brand',width:312,height:34,text:'✦  Freegma',fontSize:23,fontWeight:700,color:'#b3a8ff'});
  add('text',{parentId:phone,name:'Mobile title',width:312,height:74,text:'Your next idea,\nready to build.',fontSize:28,fontWeight:700,color:'#ffffff'});
  add('text',{parentId:phone,name:'Mobile description',width:312,height:54,text:'Turn a reference into components.\nKeep the design and code connected.',fontSize:14,color:'#9caeca'});
  for(const [title,value]of [['Tasks completed','410'],['Workers online','8'],['Projects active','2']]){
    const card=add('frame',{parentId:phone,name:title,width:312,height:110,fill:'#19243a',radius:12,layout:'vertical',paddingTop:16,paddingLeft:16,gap:5});
    add('text',{parentId:card,name:'Label',width:275,height:22,text:title,fontSize:13,color:'#a0b0cb'});
    add('text',{parentId:card,name:'Value',width:275,height:42,text:value,fontSize:30,fontWeight:700,color:'#f4f6ff'});
  }
  return {version:1,nodes};
}
