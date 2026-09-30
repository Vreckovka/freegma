import {clone,newId} from './design.mjs';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const id=value=>typeof value==='string'&&/^\w[\w-]{0,99}$/.test(value);
const coordinate=value=>Number.isFinite(value)&&Math.abs(value)<=1e7;
const date=value=>typeof value==='string'&&value.length<=40&&Number.isFinite(Date.parse(value));
const author=value=>{if(!value||!id(value.id)||typeof value.name!=='string'||!value.name.trim()||value.name.length>100)fail('Supply a local commenter id and name (1–100 characters).');return {id:value.id,name:value.name.trim()};};
const text=value=>{if(typeof value!=='string'||!value.trim()||value.length>10000)fail('Comment text must contain 1–10,000 characters.');return value.trim();};
const emoji=value=>{if(typeof value!=='string'||!value.trim()||value.length>32||/[\x00-\x1f]/.test(value)||['__proto__','constructor','prototype'].includes(value))fail('Invalid reaction.');return value;};
function location(value,document){
 if(!coordinate(value.x)||!coordinate(value.y))fail('Supply finite canvas comment coordinates.');
 const anchor=value.anchor??null,region=value.region??null;
 if(anchor&&(!id(anchor.nodeId)||!coordinate(anchor.offsetX)||!coordinate(anchor.offsetY)||document&&!document.nodes.some(n=>n.id===anchor.nodeId)))fail('Invalid comment anchor.');
 if(region&&(!coordinate(region.width)||!coordinate(region.height)||region.width<=0||region.height<=0))fail('Invalid comment region.');
 return {x:value.x,y:value.y,anchor:anchor?{nodeId:anchor.nodeId,offsetX:anchor.offsetX,offsetY:anchor.offsetY}:null,region:region?{width:region.width,height:region.height}:null};
}
export function validateComments(comments=[],revision=0){
 if(!Number.isSafeInteger(revision)||revision<0||!Array.isArray(comments)||comments.length>5000)fail('Invalid comments metadata.');
 const ids=new Set(),numbers=new Set();
 for(const thread of comments){
  if(!id(thread.id)||ids.has(thread.id)||!Number.isSafeInteger(thread.number)||thread.number<1||numbers.has(thread.number)||typeof thread.resolved!=='boolean'||thread.deleted!=null&&typeof thread.deleted!=='boolean'||!date(thread.createdAt)||!date(thread.updatedAt)||!Array.isArray(thread.messages)||!thread.messages.length||thread.messages.length>2000)fail('Invalid comment thread.');
  ids.add(thread.id);numbers.add(thread.number);location(thread);if(thread.resolvedBy!=null)author(thread.resolvedBy);
  const messages=new Set();for(const message of thread.messages){
   if(!id(message.id)||messages.has(message.id)||!date(message.createdAt)||!date(message.updatedAt)||message.deleted!=null&&typeof message.deleted!=='boolean')fail('Invalid comment message.');
   messages.add(message.id);author(message.author);text(message.text);
   if(!message.reactions||Array.isArray(message.reactions)||typeof message.reactions!=='object'||Object.keys(message.reactions).length>64)fail('Invalid comment reactions.');
   for(const [key,actors] of Object.entries(message.reactions)){emoji(key);if(!Array.isArray(actors)||actors.length>1000)fail('Invalid reaction authors.');const seen=new Set();for(const actor of actors){author(actor);if(seen.has(actor.id))fail('Duplicate reaction author.');seen.add(actor.id);}}
  }
 }
 return comments;
}
// Measured canvas bounds account for auto-layout; model coordinates are the fallback for MCP.
export function commentPosition(thread,document,boundsMap){
 if(!thread.anchor)return {x:thread.x,y:thread.y};
 const {nodeId,offsetX,offsetY}=thread.anchor;
 const bounds=typeof boundsMap==='function'?boundsMap(nodeId):boundsMap?.get?.(nodeId)||boundsMap?.[nodeId];
 if(bounds)return {x:(bounds.x??bounds.left)+offsetX,y:(bounds.y??bounds.top)+offsetY};
 const nodes=new Map(document.nodes.map(n=>[n.id,n]));let node=nodes.get(nodeId);if(!node)return {x:thread.x,y:thread.y};
 let x=offsetX,y=offsetY;const seen=new Set();while(node&&!seen.has(node.id)){seen.add(node.id);x+=node.x||0;y+=node.y||0;node=nodes.get(node.parentId);}return {x,y};
}
export function detachMissingCommentAnchors(board,nextDocument){
 const ids=new Set(nextDocument.nodes.map(n=>n.id));let changed=false;
 for(const thread of board.comments||[])if(thread.anchor&&!ids.has(thread.anchor.nodeId)){Object.assign(thread,commentPosition(thread,board.document),{anchor:null});changed=true;}
 if(changed)board.commentsRevision=(board.commentsRevision||0)+1;
}
export function applyCommentOperation(board,actorValue,operation){
 const actor=author(actorValue),op=operation;if(!op||typeof op!=='object'||Array.isArray(op)||typeof op.op!=='string')fail('Supply a comment operation.');
 const comments=clone(board.comments||[]),stamp=new Date().toISOString();
 const message=value=>({id:newId('message'),author:actor,text:text(value),createdAt:stamp,updatedAt:stamp,reactions:{}});
 if(op.op==='create'){
  comments.push({id:newId('comment'),number:comments.reduce((n,t)=>Math.max(n,t.number),0)+1,...location(op,board.document),resolved:false,resolvedBy:null,createdAt:stamp,updatedAt:stamp,messages:[message(op.text)]});
 }else{
  const thread=comments.find(t=>t.id===op.threadId);if(!thread)fail('Comment thread not found.',404);
  if(thread.deleted&&op.op!=='restoreThread')fail('Comment thread was deleted.',409);
  const own=value=>{if(value.id!==actor.id)fail('Only the original author can edit or delete this comment.',403);};
  const findMessage=()=>{const m=thread.messages.find(m=>m.id===op.messageId);if(!m)fail('Comment message not found.',404);if(m.deleted&&op.op!=='restoreMessage')fail('Comment message was deleted.',409);return m;};
  switch(op.op){
   case 'reply':thread.messages.push(message(op.text));break;
   case 'edit':{const m=findMessage();own(m.author);m.text=text(op.text);m.updatedAt=stamp;break;}
   case 'deleteMessage':{const m=findMessage();own(m.author);if(m===thread.messages[0])thread.deleted=true;else m.deleted=true;break;}
   case 'restoreMessage':{const m=findMessage();own(m.author);m.deleted=false;break;}
   case 'deleteThread':own(thread.messages[0].author);thread.deleted=true;break;
   case 'restoreThread':own(thread.messages[0].author);thread.deleted=false;break;
   case 'resolve':if(typeof op.resolved!=='boolean')fail('Supply resolved true or false.');thread.resolved=op.resolved;thread.resolvedBy=op.resolved?actor:null;break;
   case 'move':Object.assign(thread,location(op,board.document));break;
   case 'react':{const m=findMessage(),key=emoji(op.emoji);if(['__proto__','constructor','prototype'].includes(key))fail('Invalid reaction.');const actors=Object.hasOwn(m.reactions,key)?m.reactions[key]:[],found=actors.some(a=>a.id===actor.id);if(found){const next=actors.filter(a=>a.id!==actor.id);if(next.length)m.reactions[key]=next;else delete m.reactions[key];}else m.reactions[key]=[...actors,actor];break;}
   default:fail('Unknown comment operation: '+op.op);
  }
  thread.updatedAt=stamp;
 }
 validateComments(comments,(board.commentsRevision||0)+1);return comments;
}
