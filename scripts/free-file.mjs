import fs from 'node:fs';import path from 'node:path';import {decodeFree,encodeFree} from '../server/free-format.mjs';
const [mode,input,output]=process.argv.slice(2);
if(!['pack','unpack'].includes(mode)||!input||!output||path.resolve(input)===path.resolve(output))throw Error('Usage: node scripts/free-file.mjs pack|unpack input.free NEW-output.free');
const value=decodeFree(fs.readFileSync(input)).value;
fs.writeFileSync(output,mode==='pack'?encodeFree(value):JSON.stringify(value,null,2)+'\n',{flag:'wx'});
console.log('Wrote '+path.resolve(output));
