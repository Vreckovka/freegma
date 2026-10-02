import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {FreegmaMcpClient} from '../mcp-client.mjs';
const args=process.argv.slice(2),option=k=>args[args.indexOf(k)+1],label=args.includes('--label')?option('--label'):'baseline',root=path.resolve(args.includes('--root')?option('--root'):'logs/mcp-tokens-20261002'),compact=args.includes('--compact');
if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid measurement label.');fs.mkdirSync(root,{recursive:true});
const file=path.join(root,label+'-payloads.json');if(fs.existsSync(file))throw Error('Preserve existing measurement; use a new label.');
const fixtureRoot=path.resolve('logs/performance-20261001/fixture'),fixture=JSON.parse(fs.readFileSync(path.join(fixtureRoot,'fixture.json'),'utf8')),data=path.join(root,label+'-data');
if(fs.existsSync(data))throw Error('Run directory exists; inspect before retrying.');fs.cpSync(fixtureRoot,data,{recursive:true});
const client=new FreegmaMcpClient({env:{FREEGMA_DATA_DIR:data,FREEGMA_DB:path.join(data,'freegma.sqlite'),FREEGMA_WORKSPACES:path.join(data,'workspaces')},timeout:60000}),samples=[];
const capture=async(key,method,params)=>{const result=await client.request(method,params);if(result.isError)throw Error(result.content[0].text);samples.push({key,request:JSON.stringify({method,params}),result});return result.structuredContent;};
const call=(key,name,a)=>capture(key,'tools/call',{name,arguments:a});
try{
 await capture('initialize','initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'local token benchmark',version:'1'}});
 await capture('toolDefinitions','tools/list',{});
 const read=await call('designRead','freegma_get_board',{boardId:fixture.designBoard,...(compact?{view:'nodes',nodeId:'screen_0',limit:100}: {})});
 await call('designMutation','freegma_apply_operations',{boardId:fixture.designBoard,expectedRevision:read.revision,operations:[{op:'update',id:'screen_0_title',patch:{text:'Token benchmark edit'}}],label:'Local token benchmark',...(compact?{responseMode:'compact'}:{})});
 const flow=await call('flowRead','freegma_get_board',{boardId:fixture.flowBoard,...(compact?{view:'nodes',nodeId:'step_0',limit:100}: {})});
 await call('flowMutation','freegma_apply_flow',{boardId:fixture.flowBoard,expectedRevision:flow.revision,operations:[{op:'updateNode',id:'step_0',patch:{title:'Token benchmark step'}}],label:'Local token benchmark',...(compact?{responseMode:'compact'}:{})});
 const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 fs.writeFileSync(file,JSON.stringify({format:1,label,compact,sourceCommit,fixture,samples},null,2));console.log('Captured actual local stdio MCP payloads: '+file);
}finally{await client.close();}
