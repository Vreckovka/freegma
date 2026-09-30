import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const runtimeRoot=path.resolve(process.env.FREEGMA_DATA_DIR||path.join(sourceRoot,'data'));
export const buildRoot=path.join(sourceRoot,'dist');
