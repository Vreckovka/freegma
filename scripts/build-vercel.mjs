import fs from 'node:fs/promises';
import path from 'node:path';
import {proxyBuildConfig} from '../server/public-access.mjs';
const output=path.resolve('.vercel/output');
const config=proxyBuildConfig(process.env.FREEGMA_UPSTREAM);
await fs.mkdir(path.join(output,'static'),{recursive:true});
await fs.writeFile(path.join(output,'config.json'),JSON.stringify(config,null,2)+'\n');
console.log('Freegma Vercel proxy built. Designs and editor remain on the local service.');
