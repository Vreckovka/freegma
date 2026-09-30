import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FreegmaStore} from '../server/store.mjs';
const file=fileURLToPath(new URL('../examples/Freegma-Studio.free',import.meta.url));
const store=new FreegmaStore(undefined,{seed:false});
try{const existing=store.workspaces().find(w=>w.name==='Freegma Example Studio'&&!w.parentId);if(existing)console.log('Example studio already exists; preserving your edits. '+existing.id);else{const result=store.importFree(JSON.parse(fs.readFileSync(file,'utf8')));console.log('Imported editable example studio: '+result.workspace.id);}}finally{store.close();}
