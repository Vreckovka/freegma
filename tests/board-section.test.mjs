import test from 'node:test';import assert from 'node:assert/strict';
import {BOARD_SECTION_KEY,BOARD_SECTION_LIMITS,normalizeBoardHeight,boardSectionMaximum,clampBoardHeight,readBoardHeight,saveBoardHeight} from '../client/board-section.mjs';
test('board section height reserves usable lower-panel space and clamps extreme preferences',()=>{
 const max=boardSectionMaximum(700,48,42);assert.equal(max,442);assert.equal(700-48-42-max-BOARD_SECTION_LIMITS.handle,BOARD_SECTION_LIMITS.lowerMin);assert.equal(clampBoardHeight(900,max),442);assert.equal(clampBoardHeight(10,max),80);assert.equal(normalizeBoardHeight(Infinity),190);assert.equal(normalizeBoardHeight('400'),190);assert.equal(boardSectionMaximum(100,48,42),80);assert.equal(boardSectionMaximum(5000,48,42),1600);
});
test('stored height survives a small viewport and unavailable/corrupt storage safely',()=>{
 let stored;const storage={setItem(k,v){assert.equal(k,BOARD_SECTION_KEY);stored=v;},getItem(){return stored;}};saveBoardHeight(420,storage);assert.equal(readBoardHeight(storage),420);assert.equal(clampBoardHeight(readBoardHeight(storage),200),200);assert.equal(readBoardHeight(storage),420);stored='{"bad":1}';assert.equal(readBoardHeight(storage),190);stored='{';assert.equal(readBoardHeight(storage),190);assert.equal(readBoardHeight({getItem(){throw Error('Unavailable');}}),190);assert.doesNotThrow(()=>saveBoardHeight(420,{setItem(){throw Error('Unavailable');}}));
});
