import test from 'node:test';
import assert from 'node:assert/strict';
import {historyShortcut} from '../client/shortcuts.mjs';

const target=(tagName='DIV',design=false)=>({tagName,closest:()=>design?{}:null});
const key=(patch={})=>({key:'z',code:'KeyZ',ctrlKey:true,target:target(),...patch});
test('design history supports Ctrl/Cmd Z, Shift Z and Ctrl Y on localized keyboards',()=>{
 assert.equal(historyShortcut(key()),'undo');
 assert.equal(historyShortcut(key({ctrlKey:false,metaKey:true})),'undo');
 assert.equal(historyShortcut(key({shiftKey:true})),'redo');
 assert.equal(historyShortcut(key({key:'y',code:'KeyY'})),'redo');
 assert.equal(historyShortcut(key({key:'я'})),'undo');
 assert.equal(historyShortcut(key({key:'z',code:'KeyY'})),'undo'); // QWERTZ layout
 assert.equal(historyShortcut(key({key:'y',code:'KeyZ'})),'redo');
 for(const patch of [{ctrlKey:false},{altKey:true},{isComposing:true},{defaultPrevented:true}])assert.equal(historyShortcut(key(patch)),null);
});
test('property controls route history while text, CSS and comment drafts keep native Undo',()=>{
 for(const tag of ['INPUT','SELECT']){
  assert.equal(historyShortcut(key({target:target(tag)})),null);
  assert.equal(historyShortcut(key({target:target(tag,true)})),'undo');
 }
 assert.equal(historyShortcut(key({target:target('TEXTAREA',true)})),null);
 assert.equal(historyShortcut(key({target:{...target(),isContentEditable:true}})),null);
 assert.equal(historyShortcut(key({target:target('BUTTON')})),'undo');
});
