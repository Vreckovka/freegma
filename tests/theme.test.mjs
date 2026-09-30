import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readTheme,saveTheme,THEME_KEY} from '../client/theme.mjs';
import {STUDIO_PALETTES} from '../shared/studio-designs.mjs';

test('first visit, invalid preferences and denied storage default to dark; valid light persists',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  assert.equal(readTheme(storage),'dark');
  assert.equal(saveTheme('light',storage),true);
  assert.equal(readTheme(storage),'light');
  values.set(THEME_KEY,'unexpected');assert.equal(readTheme(storage),'dark');
  assert.equal(saveTheme('dark',storage),true);assert.equal(readTheme(storage),'dark');
  const denied={getItem(){throw Error('Denied');},setItem(){throw Error('Denied');}};
  assert.equal(readTheme(denied),'dark');assert.equal(saveTheme('light',denied),false);
  // Accessing localStorage itself can throw in an embedded or restricted browser.
  const previous=globalThis.window;
  try{globalThis.window={get localStorage(){throw Error('Denied');}};assert.equal(readTheme(),'dark');assert.equal(saveTheme('light'),false);}
  finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous;}
});

test('editor theme tokens match native design palettes without changing layer rendering',()=>{
  const css=fs.readFileSync(new URL('../client/app.css',import.meta.url),'utf8');
  for(const [theme,selector] of [['dark',':root'],['light',':root[data-theme=light]']]){
    const body=css.slice(css.indexOf(selector+'{')+selector.length+1).split('}')[0];
    const tokens=Object.fromEntries([...body.matchAll(/(--[\w-]+):([^;]+)/g)].map(m=>[m[1],m[2]]));
    for(const [name,value] of Object.entries(STUDIO_PALETTES[theme])){
      const variable={accent:'--accent',border:'--border',muted:'--muted',onAccent:'--ui-on-accent',codeText:'--ui-code-text'}[name]||'--ui-'+name;
      assert.equal(tokens[variable],value,theme+' '+name);
    }
  }
  assert.doesNotMatch(css,/\.design-layer[^{}]*\{[^{}]*(?:filter:|background:var\(--ui-|color:var\(--ui-)/);
  const html=fs.readFileSync(new URL('../client/index.html',import.meta.url),'utf8');
  assert.ok(html.indexOf('/theme.js')<html.indexOf('/app.css'),'saved appearance loads before CSS without inline-script CSP exceptions');
});
