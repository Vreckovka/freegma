import readline from 'node:readline';
import {FreegmaStore} from './store.mjs';
import {rpc} from './tools.mjs';
const store=new FreegmaStore(),lines=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of lines){if(!line.trim())continue;let result;try{if(line.length>12*1024*1024)throw new Error('Request too large');result=rpc(store,JSON.parse(line));}catch(e){result={jsonrpc:'2.0',id:null,error:{code:-32700,message:e.message}};}if(result)process.stdout.write(JSON.stringify(result)+'\n');}
store.close();
