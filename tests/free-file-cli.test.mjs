import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import {decodeFree} from '../server/free-format.mjs';
test('pack/unpack CLI makes inspectable exact JSON and refuses to overwrite either file',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'freegma-format-cli-'));try{
  const source=path.join(dir,'native.free'),packed=path.join(dir,'packed.free'),readable=path.join(dir,'readable.free'),value={format:'freegma-workspace',formatVersion:1,notes:'Custom layout 🦊 '.repeat(2000)};fs.writeFileSync(source,JSON.stringify(value,null,2));
  const run=(...args)=>spawnSync(process.execPath,[path.resolve('scripts/free-file.mjs'),...args],{encoding:'utf8',timeout:10000});
  assert.equal(run('pack',source,packed).status,0);assert.equal(JSON.parse(fs.readFileSync(packed)).format,'freegma-packed');assert.deepEqual(decodeFree(fs.readFileSync(packed)).value,value);assert.equal(run('unpack',packed,readable).status,0);assert.deepEqual(JSON.parse(fs.readFileSync(readable)),value);
  const original=fs.readFileSync(source);assert.notEqual(run('unpack',packed,source).status,0);assert.notEqual(run('pack',source,source).status,0);assert.deepEqual(fs.readFileSync(source),original);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
