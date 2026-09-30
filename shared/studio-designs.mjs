import {makeNode,validateDocument} from './design.mjs';

// Native design source for Freegma itself. No screenshots or flattened controls.
export const STUDIO_PALETTES={
 light:{panel:'#ffffff',canvas:'#f3f3f7',field:'#f6f6f9',text:'#30313b',muted:'#727584',border:'#e9e9ee',accent:'#7864ff',active:'#f0ecff',onAccent:'#ffffff',code:'#252338',codeText:'#e1dafa'},
 dark:{panel:'#1b1e27',canvas:'#101219',field:'#252a36',text:'#e8eaf3',muted:'#afb4c5',border:'#303544',accent:'#ae9bff',active:'#302747',onAccent:'#181322',code:'#12121b',codeText:'#e1dafa'}
};
export const STUDIO_VIEWS=['Editor overview','Layer inspector & spacing','React & CSS export','Components & templates','Workspace folders','Dialogs & history','Foundations & components','React component export','History & Undo','Empty board & import','Task link & portable files'];
export function studioDocument(mode='light',view=STUDIO_VIEWS[0]){
 const p=STUDIO_PALETTES[mode];if(!p||!STUDIO_VIEWS.includes(view))throw Error('Unknown studio design.');
 const nodes=[];let seq=0;
 const add=(type,name,parentId,x,y,width,height,patch={})=>{const n=makeNode(type,{id:`studio_${++seq}`,name,parentId,x,y,width,height,fill:type==='text'||type==='icon'?'transparent':p.panel,color:p.text,stroke:p.border,fontSize:12,fontFamily:'Inter, system-ui, sans-serif',...patch});nodes.push(n);return n.id;};
 const frame=(name,parent,x,y,w,h,patch={})=>add('frame',name,parent,x,y,w,h,patch);
 const text=(value,parent,x,y,w=200,size=12,color=p.text,patch={})=>add('text',value,parent,x,y,w,Math.max(20,size*1.6),{text:value,fontSize:size,color,...patch});
 const icon=(name,parent,x,y,size=16,color=p.muted)=>add('icon',name+' icon',parent,x,y,size,size,{icon:name,color});
 const line=(parent,x,y,w)=>add('rectangle','Divider',parent,x,y,w,1,{fill:p.border});
 const button=(label,parent,x,y,w=140,primary=false,iconName)=>{const b=frame(label,parent,x,y,w,34,{fill:primary?p.accent:p.field,radius:6,layout:'horizontal',align:'center',justify:'center',gap:7,paddingLeft:10,paddingRight:10});if(iconName)icon(iconName,b,0,0,15,primary?p.onAccent:p.muted);text(label,b,0,0,w-(iconName?40:20),11,primary?p.onAccent:p.text,{textAlign:'center',fontWeight:600});return b;};
 const field=(label,value,parent,x,y,w=110)=>{const b=frame(label+' field',parent,x,y,w,32,{fill:p.field,radius:5,layout:'horizontal',align:'center',gap:8,paddingLeft:8,paddingRight:8});text(label,b,0,0,30,10,p.muted);text(value,b,0,0,w-54,11);return b;};
 const screen=frame(`Freegma / ${mode==='light'?'Light':'Dark'} / ${view}`,null,80,90,1440,900,{fill:p.canvas,clip:true});
 if(view==='Foundations & components'){
   text('Freegma',screen,46,32,500,28,p.text,{fontWeight:700});text(`${mode==='light'?'Light':'Dark'} Mode · Foundations & reusable controls`,screen,46,82,900,14,p.muted);
   Object.entries(p).forEach(([name,color],i)=>{const x=46+(i%6)*218,y=145+Math.floor(i/6)*160;frame(name+' swatch',screen,x,y,190,90,{fill:color,strokeWidth:1,radius:8});text(name,screen,x,y+99,190,12);text(color,screen,x,y+122,190,11,p.muted);});
   const controls=frame('Reusable controls',screen,46,520,1348,310,{fill:p.panel,radius:10,paddingTop:24,paddingLeft:24});
   text('Components',controls,24,18,500,18,p.text,{fontWeight:600});
   button('Generate React',controls,24,66,160,true,'code');button('Copy JSX',controls,208,66,140,false,'copy');button('Download JSX',controls,372,66,160,false,'download');field('W','320',controls,556,66);field('Gap','16',controls,690,66);button('Light Mode',controls,824,66,160,false,'folder');
   const row=frame('Layer row',controls,24,130,330,36,{fill:p.active,radius:5,layout:'horizontal',align:'center',gap:9,paddingLeft:12});icon('frame',row,0,0,16,p.accent);text('Task card',row,0,0,260,12,p.accent);
   const tab=frame('Tab / active',controls,392,130,110,36,{fill:p.panel});text('Design',tab,12,5,85,12,p.text,{fontWeight:600});add('rectangle','Active underline',tab,12,34,50,2,{fill:p.accent});
   const badge=frame('Saved badge',controls,550,130,138,36,{fill:p.panel,layout:'horizontal',align:'center',gap:8,paddingLeft:12});add('ellipse','Saved status',badge,0,0,6,6,{fill:'#76b99b'});text('Saved locally',badge,0,0,100,11,p.muted);
   text('8 / 16 / 24 spacing · 5–8px corners · violet selection · neutral surfaces',controls,24,220,1200,13,p.muted);
   return validateDocument({version:1,nodes});
 }
 const header=frame('Studio header',screen,0,0,1440,62,{fill:p.panel});
 const logo=frame('Freegma mark',header,18,14,32,34,{fill:p.accent,radius:9});text('f',logo,9,-4,24,29,p.onAccent,{fontWeight:800,fontFamily:'Georgia, serif'});
 text('Freegma',header,64,20,86,16,p.text,{fontWeight:700});text(`${mode==='light'?'Light':'Dark'} Mode`,header,162,23,150,11,p.muted);icon('down',header,304,24,14);
 text(view,header,350,22,310,12,p.muted);text('Saved locally',header,668,23,110,10,p.muted);button(mode==='dark'?'Light':'Dark',header,991,14,72,false,'settings');button('Copy link',header,1075,14,108,false,'link');button('Generate React',header,1195,14,169,true,'code');
 const avatar=add('ellipse','User avatar',header,1380,18,28,28,{fill:mode==='light'?'#f3e8d9':'#403429'});text('R',header,1388,22,18,11,mode==='light'?'#947043':'#edc697');line(header,0,61,1440);
 const left=frame('Layers & boards',screen,0,62,230,838,{fill:p.panel});line(left,229,0,1);
 text('Layers',left,18,16,54,11,p.text,{fontWeight:600});text('Assets',left,96,16,54,11,p.muted);icon('clock',left,198,16);line(left,0,47,230);
 text('Freegma / '+(mode==='light'?'Light Mode':'Dark Mode'),left,18,64,208,10,p.accent);text('BOARDS',left,18,99,175,9,p.muted,{letterSpacing:1,fontWeight:600});icon('plus',left,200,99,14);
 const search=frame('Board search',left,16,124,198,30,{fill:p.field,radius:5});text('Find a board…',search,10,5,170,10,p.muted);
 ['Editor overview','Layer inspector & spacing','React & CSS export'].forEach((label,i)=>{const row=frame(label+' board row',left,10,164+i*34,210,30,{fill:label===view?p.active:p.panel,radius:5});icon('frame',row,10,8,14,label===view?p.accent:p.muted);text(label,row,33,5,167,10,label===view?p.accent:p.muted);});
 line(left,0,274,230);const find=frame('Layer search',left,16,289,198,30,{strokeWidth:1,radius:6});icon('search',find,9,8,14);text('Search layers or assets…',find,31,5,160,10,p.muted);
 const isAssets=view==='Components & templates';text(isAssets?'YOUR LIBRARY':'LAYERS',left,18,339,178,9,p.muted,{letterSpacing:1});
 if(view==='History & Undo'){['Apply CSS to design','Change layer properties','Insert Primary button','Create editable frame'].forEach((label,i)=>{icon('clock',left,18,375+i*62,16);text(label,left,46,371+i*62,170,11);text('Shared edit · just now',left,46,394+i*62,170,9,p.muted);});text('Undo / Redo preserve every shared edit.',left,18,674,192,11,p.muted,{height:45});}
 else if(isAssets){['Primary button','Property field','Layer row'].forEach((label,i)=>{const card=frame(label+' library card',left,16,365+i*130,198,118,{strokeWidth:1,radius:8});const preview=frame('Component preview',card,0,0,198,74,{fill:p.active});icon('component',preview,80,21,32,p.accent);text(label,card,12,80,174,11);text('Linked component',card,12,99,174,9,p.muted);});}
 else ['Editor frame','Studio header','Layers panel','Canvas','Task card','Title','Description','Status','Inspector'].forEach((label,i)=>{const active=label==='Task card',row=frame(label+' layer row',left,0,368+i*32,230,31,{fill:active?p.active:p.panel});icon(i===0?'down':i===4?'component':i>4&&i<8?'text':'frame',row,i>4&&i<8?45:25,8,14,active?p.accent:p.muted);text(label,row,i>4&&i<8?69:49,6,170,11,active?p.accent:p.muted);if(active)icon('eye',row,208,9,13,p.accent);});
 line(left,0,796,230);text('Local · .free files',left,16,808,140,9,p.muted);text('Freegma',left,169,808,55,9,p.muted);
 const jsxView=view==='React component export',codeView=view==='React & CSS export'||jsxView,rightWidth=codeView?380:274,canvasWidth=1440-230-rightWidth;
 const canvas=frame('Drawing canvas',screen,230,62,canvasWidth,838,{fill:p.canvas});const bar=frame('Canvas toolbar',canvas,0,0,canvasWidth,48,{fill:p.panel});text(view,bar,20,16,340,11,p.muted);
 ['undo','redo','grid','fit'].forEach((name,i)=>icon(name,bar,canvasWidth-182+i*30,16,16));text('75%',bar,canvasWidth-49,16,42,11,p.muted);
 const preview=frame('Editable canvas frame',canvas,54,116,canvasWidth-108,580,{fill:p.panel,strokeWidth:1,radius:7});text('Dashboard / Desktop',canvas,54,88,400,11,p.muted);
 text('Your next idea, ready to build.',preview,36,34,canvasWidth-180,27,p.text,{fontWeight:650});text('Image → Editable design → React',preview,36,84,canvasWidth-180,13,p.muted);
 const sample=frame('Task card',preview,36,145,canvasWidth-180,204,{fill:p.field,stroke:p.accent,strokeWidth:1,radius:9,layout:'vertical',paddingTop:24,paddingLeft:24,paddingRight:24,gap:14});
 text('Freegma components',sample,0,0,canvasWidth-232,19,p.text,{fontWeight:600});text('Keep every layer editable.\nChange colors, spacing and text in the inspector.',sample,0,0,canvasWidth-232,14,p.muted,{height:52});button('Open design',sample,0,0,154,true,'chevron');
 text('Frames · Text · Shapes · Icons · Images · Components',preview,36,390,canvasWidth-180,13,p.muted);text('Export portable .free files with assets.\nEvery workspace and board has a stable link.',preview,36,438,canvasWidth-180,13,p.muted,{height:58});
 if(view==='Layer inspector & spacing'){add('rectangle','Top padding guide',sample,0,0,canvasWidth-180,24,{fill:mode==='light'?'#e7ddff':'#453366',opacity:.6,absolute:true});text('24',sample,8,0,28,10,p.accent,{absolute:true});}
 const toolbar=frame('Drawing tools',canvas,Math.max(24,canvasWidth/2-180),746,360,48,{fill:p.panel,strokeWidth:1,radius:12,layout:'horizontal',align:'center',justify:'center',gap:20});['cursor','hand','frame','rectangle','ellipse','text','image','sparkles'].forEach((name,i)=>icon(name,toolbar,0,0,20,i===0?p.accent:p.muted));
 text('Shift to multi-select · Space to pan',canvas,18,810,400,9,p.muted);
 const right=frame(codeView?'React & CSS panel':'Design inspector',screen,1440-rightWidth,62,rightWidth,838,{fill:p.panel});text('Design',right,18,16,65,11,codeView?p.muted:p.text,{fontWeight:600});text('Code',right,102,16,65,11,codeView?p.text:p.muted);text('r12',right,rightWidth-39,16,30,9,p.muted);line(right,0,47,rightWidth);
 if(codeView){text('React & CSS',right,18,66,280,13,p.text,{fontWeight:600});text('Edit CSS and apply it to native layers.',right,18,98,rightWidth-36,11,p.muted);button('Generate selection CSS',right,18,137,rightWidth-36,true);
   text('CSS',right,22,199,80,12,jsxView?p.muted:p.accent);text('React',right,115,199,80,12,jsxView?p.accent:p.muted);line(right,18,232,rightWidth-36);text(jsxView?'TaskCard.jsx':'TaskCard.css',right,18,248,rightWidth-36,12,p.muted);button(jsxView?'Copy JSX':'Copy CSS',right,18,282,(rightWidth-44)/2,false,'copy');button(jsxView?'Download JSX':'Download CSS',right,rightWidth/2+4,282,(rightWidth-44)/2,false,'download');
   const code=frame(jsxView?'React source viewer':'CSS source editor',right,12,332,rightWidth-24,355,{fill:p.code,radius:6,paddingTop:14,paddingLeft:14});text(jsxView?'import React from "react";\nimport "./TaskCard.css";\n\nexport default function TaskCard() {\n  return (\n    <div className="fg-task-card">\n      <h2>Freegma components</h2>\n      <p>Keep every layer editable.</p>\n    </div>\n  );\n}':'/* Task card */\n.fg-task-card {\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n  padding: 24px;\n  border-radius: 9px;\n  background: '+p.field+';\n  color: '+p.text+';\n}',code,14,14,rightWidth-52,12,p.codeText,{height:306,fontFamily:'Consolas, monospace',lineHeight:1.7});button('Apply CSS to design',right,18,712,rightWidth-36,true);text('Ctrl+Enter applies · Undo restores',right,18,765,rightWidth-36,10,p.muted);
 }else{
   text('Task card',right,18,66,200,13,p.text,{fontWeight:600});icon('trash',right,241,67,15);line(right,0,106,rightWidth);text('Position & size',right,18,124,230,12,p.text,{fontWeight:600});
   [['X','36'],['Y','145'],['W','320'],['H','204']].forEach(([a,b],i)=>field(a,b,right,18+i%2*123,155+Math.floor(i/2)*43));line(right,0,250,rightWidth);text('Auto layout',right,18,270,190,12,p.text,{fontWeight:600});
   ['Free','Row','Column'].forEach((label,i)=>button(label,right,18+i*79,302,73,i===2));field('Gap','14',right,18,349);field('Size','Fixed',right,141,349);text('Padding',right,18,400,220,11,p.muted);
   field('Top','24',right,82,435);field('Left','24',right,18,482);field('Right','24',right,141,482);field('Bottom','24',right,82,529);text('☑ Link all padding values',right,18,582,238,11,p.muted);line(right,0,622,rightWidth);
   text('Appearance',right,18,640,230,12,p.text,{fontWeight:600});field('Fill',p.field,right,18,675,238);field('Stroke',p.border,right,18,719,238);field('Corner','9',right,18,763,110);field('Opacity','100%',right,141,763,110);
 }
 if(view==='Empty board & import'){
   nodes.find(n=>n.id===preview).visible=false;nodes.filter(n=>n.parentId===canvas&&n.name==='Dashboard / Desktop').forEach(n=>n.visible=false);
   icon('frame',canvas,canvasWidth/2-22,280,44,p.accent);text('Space for your next idea.',canvas,30,351,canvasWidth-60,24,p.text,{textAlign:'center',fontWeight:600});text('Create a frame or import your generated reference.',canvas,30,407,canvasWidth-60,13,p.muted,{textAlign:'center'});button('Import reference',canvas,canvasWidth/2-100,462,200,true,'image');
 }
 const storage=frame('Saved file & task controls',right,0,788,rightWidth,50,{fill:p.panel});line(storage,0,0,rightWidth);text('Saved design file · .free + Assets',storage,12,5,rightWidth-24,9,p.muted);icon('link',storage,12,29,14);text('Link a task',storage,34,26,rightWidth-100,10,p.accent);icon('download',storage,rightWidth-47,29,14);icon('folder',storage,rightWidth-24,29,14);
 if(view==='Workspace folders'){
   const menu=frame('Workspace menu',screen,55,56,316,457,{fill:p.panel,strokeWidth:1,radius:9});text('WORKSPACES',menu,18,16,260,9,p.muted,{letterSpacing:1});
   [['Freegma',0],['Light Mode',1],['Dark Mode',1],['Design studio',0],['Product concepts',0]].forEach(([label,depth],i)=>{const row=frame(label+' workspace',menu,10,46+i*36,296,32,{fill:label===(mode==='light'?'Light Mode':'Dark Mode')?p.active:p.panel,radius:5});icon('folder',row,12+depth*18,8,15);text(label,row,37+depth*18,5,230-depth*18,12);});line(menu,12,236,292);['Export workspace .free','Import .free file','New workspace','New parent folder','Move workspace to folder'].forEach((label,i)=>{icon(i<2?'download':'folder',menu,18,257+i*35);text(label,menu,44,253+i*35,252,11,p.muted);});
 }
 if(view==='Dialogs & history'||view==='Task link & portable files'){
   add('rectangle','Modal backdrop',screen,0,0,1440,900,{fill:mode==='light'?'#292438':'#080911',opacity:.35});
   const modal=frame('New workspace dialog',screen,505,277,430,343,{fill:p.panel,radius:13,paddingTop:24,paddingLeft:24});text(view==='Task link & portable files'?'Link a task':'New workspace',modal,24,20,330,19,p.text,{fontWeight:600});icon('close',modal,388,23,18);text(view==='Task link & portable files'?'Task ID or URL':'Name',modal,24,80,350,11,p.muted);field('',view==='Task link & portable files'?'DESIGN-001':mode==='light'?'Light Mode':'Dark Mode',modal,24,107,382);if(view==='Task link & portable files')text('Stored on this design for task navigation.\nPortable .free exports keep this link, layout\nand component assets.',modal,24,163,382,12,p.muted,{height:74});else{ text('Parent folder',modal,24,163,350,11,p.muted);field('','Freegma',modal,24,190,382);icon('down',modal,381,199,14);}button('Cancel',modal,187,273,95);button(view==='Task link & portable files'?'Save':'Create',modal,296,273,110,true);
 }
 return validateDocument({version:1,nodes});
}
