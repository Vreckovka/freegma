import {rpc} from './tools.mjs';

const versions=new Set(['2025-11-25','2025-06-18','2025-03-26']);
const maxBytes=12*1024*1024;
const accepts=(header,type)=>String(header||'').split(',').some(part=>{
  const [mime,...parameters]=part.trim().split(';');
  return mime===type&&!parameters.some(p=>/^\s*q\s*=\s*0(?:\.0*)?\s*$/.test(p));
});
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const messageValid=m=>{
  if(!object(m)||m.jsonrpc!=='2.0'||Object.hasOwn(m,'id')&&typeof m.id!=='string'&&!(typeof m.id==='number'&&Number.isSafeInteger(m.id)))return false;
  if(Object.hasOwn(m,'method'))return typeof m.method==='string'&&!Object.hasOwn(m,'result')&&!Object.hasOwn(m,'error')&&(!Object.hasOwn(m,'params')||object(m.params));
  if(!Object.hasOwn(m,'id')||Object.hasOwn(m,'result')===Object.hasOwn(m,'error'))return false;
  return Object.hasOwn(m,'result')||object(m.error)&&Number.isSafeInteger(m.error.code)&&typeof m.error.message==='string';
};

// Stateless Streamable HTTP: each request has one JSON response; no persistent SSE/session allocation.
// The store and handlers are the same objects used by the editor and stdio MCP.
export async function handleMcp(req,res,store,origin){
  res.setHeader('Cache-Control','no-store');
  if(req.headers.origin){res.setHeader('Access-Control-Allow-Origin',req.headers.origin);res.setHeader('Vary','Origin');}
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
  const error=(status,code,message,id=null)=>send(status,{jsonrpc:'2.0',id,error:{code,message}});
  if(req.method==='OPTIONS'){
    res.writeHead(204,{'Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id','Access-Control-Max-Age':'600'});
    res.end();return;
  }
  if(req.headers['mcp-protocol-version']&&!versions.has(req.headers['mcp-protocol-version']))return error(400,-32600,'Unsupported MCP protocol version.');
  if(req.method!=='POST'){
    res.setHeader('Allow','POST, OPTIONS');return error(405,-32600,'Use POST for stateless MCP; standalone SSE and session deletion are not supported.');
  }
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return error(415,-32600,'JSON content type required.');
  if(!accepts(req.headers.accept,'application/json')||!accepts(req.headers.accept,'text/event-stream'))return error(406,-32600,'Accept must include application/json and text/event-stream.');
  if(Number(req.headers['content-length'])>maxBytes)return error(413,-32600,'MCP request exceeds 12 MiB.');
  let bytes=0,chunks=[];
  for await(const chunk of req){bytes+=chunk.length;if(bytes>maxBytes)return error(413,-32600,'MCP request exceeds 12 MiB.');chunks.push(chunk);}
  let message;
  try{message=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return error(400,-32700,'Invalid JSON.');}
  if(!messageValid(message))return error(400,-32600,'Supply one valid JSON-RPC 2.0 message.');
  if(!Object.hasOwn(message,'method')||!Object.hasOwn(message,'id')){res.writeHead(202);res.end();return;}
  try{
    const result=await rpc(store,message,{origin});
    if(message.method==='initialize'&&result?.result&&!versions.has(result.result.protocolVersion))result.result.protocolVersion='2025-11-25';
    send(200,result);
  }catch{return error(500,-32603,'MCP request failed.',message.id);}
}
