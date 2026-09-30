import test from 'node:test';import assert from 'node:assert/strict';import {colorForPicker} from '../client/editor.mjs';
test('color pickers show imported CSS colors while preserving their text and alpha values',()=>{
 assert.equal(colorForPicker('rgb(132, 204, 22)'),'#84cc16');assert.equal(colorForPicker('rgba(20, 34, 48, 0.6)'),'#142230');assert.equal(colorForPicker('rgb(100%, 0%, 0%)'),'#ff0000');assert.equal(colorForPicker('#abc'),'#aabbcc');assert.equal(colorForPicker('#abcd'),'#aabbcc');assert.equal(colorForPicker('#123456aa'),'#123456');assert.equal(colorForPicker('hsl(120, 100%, 50%)'),'#00ff00');assert.equal(colorForPicker('transparent'),'#000000');
});
