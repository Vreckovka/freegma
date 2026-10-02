import {parentPort,workerData} from 'node:worker_threads';
import ELK from 'elkjs/lib/elk.bundled.js';
import {arrangeGraph} from '../shared/flow-arrange.mjs';
try{parentPort.postMessage({plan:await arrangeGraph(workerData,new ELK())});}catch(e){parentPort.postMessage({error:e.message});}
