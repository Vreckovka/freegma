import {spawn} from 'node:child_process';
import readline from 'node:readline';
import {fileURLToPath} from 'node:url';
// A small bounded stdio client used by project imports and agent workflow checks.
export class FreegmaMcpClient {
 constructor({node=process.execPath,server=fileURLToPath(new URL('../server/mcp.mjs',import.meta.url)),env={},timeout=30000}={}) {
  this.next=0;this.pending=new Map();this.timeout=timeout;this.stderr='';
  this.child=spawn(node,[server],{env:{...process.env,...env},stdio:['pipe','pipe','pipe'],windowsHide:true});
  this.child.stderr.on('data',data=>{this.stderr=(this.stderr+data).slice(-8192);});
  this.lines=readline.createInterface({input:this.child.stdout});
  this.lines.on('line',line=>{let response;try{response=JSON.parse(line);}catch{return;}const item=this.pending.get(response.id);if(!item)return;this.pending.delete(response.id);clearTimeout(item.timer);response.error?item.reject(new Error(response.error.message)):item.resolve(response.result);});
  const fail=error=>{for(const item of this.pending.values()){clearTimeout(item.timer);item.reject(error);}this.pending.clear();};
  this.child.on('error',fail);this.child.on('exit',(code,signal)=>{this.closed=true;fail(new Error(`Freegma MCP exited (${code??signal}). ${this.stderr}`));});
 }
 request(method,params={}) {
  if(this.closed)return Promise.reject(new Error('Freegma MCP is closed.'));
  const id=++this.next;
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Freegma MCP request timed out: '+method));this.child.kill();},this.timeout);this.pending.set(id,{resolve,reject,timer});this.child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n',error=>{if(error){clearTimeout(timer);this.pending.delete(id);reject(error);}});});
 }
 async initialize(){return this.request('initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'Freegma project importer',version:'1'}});}
 async call(name,args={}){const result=await this.request('tools/call',{name,arguments:args});if(result.isError)throw new Error(result.content?.[0]?.text||'MCP tool failed.');return result.structuredContent;}
 async close(){if(this.closed)return;await new Promise(resolve=>{const timer=setTimeout(()=>{this.child.kill();resolve();},3000);this.child.once('exit',()=>{clearTimeout(timer);resolve();});this.child.stdin.end();});this.lines.close();}
}
