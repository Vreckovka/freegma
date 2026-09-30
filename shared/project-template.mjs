import {makeNode} from './design.mjs';
import {STUDIO_PALETTES} from './studio-designs.mjs';

const roles={canvas:'background',panel:'surface',field:'field',text:'text',muted:'muted',border:'border',accent:'accent',active:'active',onAccent:'on_accent',code:'code',codeText:'code_text'};
export function projectColors(){
  return {revision:1,defaultTheme:'theme_dark',schematic:Object.entries(roles).map(([from,key])=>({key,name:key.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase()),value:STUDIO_PALETTES.dark[from]})),themes:['light','dark'].map(mode=>({id:'theme_'+mode,name:mode==='light'?'Light Mode':'Dark Mode',colors:Object.fromEntries(Object.entries(roles).map(([from,key])=>[key,STUDIO_PALETTES[mode][from]]))}))};
}
export function themedNode(type,patch,bindings={}){
  const n=makeNode(type,patch),colors=projectColors().themes[1].colors;
  n.colorBindings=Object.entries(bindings).map(([path,token])=>({path,token,source:colors[token]}));
  for(const [path,token] of Object.entries(bindings))n[path]=colors[token];
  return n;
}
export function sharedComponentDocument(){
  return {nodes:[
    themedNode('frame',{id:'shared_button',name:'Button',x:40,y:80,width:180,height:44,radius:8},{fill:'accent'}),
    themedNode('text',{id:'button_label',parentId:'shared_button',name:'Button label',text:'Create something',x:16,y:10,width:148,height:24,fontSize:14,fontWeight:600,textAlign:'center'},{color:'on_accent'}),
    themedNode('frame',{id:'shared_card',name:'Card',x:280,y:80,width:350,height:180,radius:12,strokeWidth:1},{fill:'surface',stroke:'border'}),
    themedNode('text',{id:'card_title',parentId:'shared_card',name:'Card title',text:'One component, any theme',x:24,y:24,width:302,height:30,fontSize:19,fontWeight:600},{color:'text'}),
    themedNode('text',{id:'card_body',parentId:'shared_card',name:'Card body',text:'Edit the shared master once.\nColor roles keep Light and Dark in sync.',x:24,y:68,width:302,height:65,fontSize:14},{color:'muted'})
  ]};
}
export function exampleDocument(){return {nodes:[
  themedNode('frame',{id:'example',name:'Example dashboard',x:40,y:40,width:760,height:430,radius:16},{fill:'background'}),
  themedNode('text',{id:'example_title',parentId:'example',name:'Heading',text:'Make it yours',x:32,y:32,width:650,height:44,fontSize:30,fontWeight:700},{color:'text'}),
  themedNode('text',{id:'example_hint',parentId:'example',name:'Theme instructions',text:'Colors → Design theme switches this same layout between Light and Dark.',x:32,y:88,width:690,height:52,fontSize:14},{color:'muted'}),
  makeNode('ellipse',{id:'local_color',parentId:'example',name:'Local color example (stays pink)',x:650,y:250,width:40,height:40,fill:'#ec719f'}),
  themedNode('text',{id:'local_hint',parentId:'example',name:'Local color hint',text:'Local colors stay yours.',x:470,y:310,width:240,height:30,fontSize:13},{color:'muted'})
]};}

export function guideDocument(){
  const nodes=[themedNode('frame',{id:'guide',name:'Folders & themes guide',width:980,height:870,x:40,y:40,radius:16},{fill:'background'})];
  const texts=[['heading','One library. Multiple themes.',32,32,32,70],['intro','Components belong to the project. Themes share color roles, with different values.',32,108,17,65],['structure','My project\n  Shared library: Button, Card, Navigation\n  Shared boards: Dashboard, Settings\n  Light Mode — optional theme-only extras\n  Dark Mode — optional theme-only extras',32,200,18,185],['roles','One schematic: Background, Surface, Text, Accent…\nLight: #F3F3F7 / #FFFFFF / #30313B / #7864FF\nDark:  #101219 / #1B1E27 / #E8EAF3 / #AE9BFF',32,410,17,135],['steps','1. Open Shared components. Edit a master, then Update component.\n2. Open Example dashboard. Choose Colors → Design theme.\n3. For new layers, choose a Color role instead of Local color.\n4. Save theme-only extras in their child folder; shared assets appear there too.\n5. Export the parent project .free to include its children.',32,585,17,185]];
  for(const [id,text,x,y,fontSize,height] of texts)nodes.push(themedNode('text',{id,parentId:'guide',name:text.split('\n')[0],text,x,y,width:916,height,fontSize,fontWeight:id==='heading'?700:400},{color:id==='heading'?'text':'muted'}));
  return {nodes};
}
