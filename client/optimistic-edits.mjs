import {applyOperations} from '../shared/design.mjs';
import {applyFlowOperations} from '../shared/flows.mjs';
import {applyOverlayOperations} from '../shared/flow-overlay.mjs';
// Generated IDs and component reset-to-master resolution stay on the exclusive
// path. Stable native edits and all flow routing edits can be batched safely.
export function canSchedule(kind,operations){
 if(!Array.isArray(operations)||!operations.length)return false;
 if(kind==='design')return operations.every(op=>['update','remove','reorder','detach'].includes(op.op)||op.op==='add'&&op.node?.id);
 if(kind==='flow')return operations.every(op=>op.op!=='addNode'||op.node?.id)&&operations.every(op=>op.op!=='addEdge'||op.edge?.id);
 if(kind==='overlay')return operations.every(op=>op.op!=='addFrame'||op.frame?.id)&&operations.every(op=>op.op!=='addSymbol'||op.symbol?.id)&&operations.every(op=>op.op!=='addEdge'||op.edge?.id);
 return false;
}
export function applyOptimisticEdit(board,action){const document=action.kind==='design'?applyOperations(board.document,action.operations):action.kind==='flow'?applyFlowOperations(board.document,action.operations):applyOverlayOperations(board.document,action.operations);return {...board,document,designCanUndo:true,canUndo:true,designCanRedo:false,canRedo:false};}
