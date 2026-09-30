// Property controls edit the design; text/code editors keep their native Undo.
export function historyShortcut(event){
 if(event.defaultPrevented||event.isComposing||event.altKey||!(event.ctrlKey||event.metaKey))return null;
 const logical=String(event.key||'').toLowerCase();
 const key=['z','y'].includes(logical)?logical:event.code==='KeyZ'?'z':event.code==='KeyY'?'y':logical;
 if(key!=='z'&&key!=='y')return null;
 const target=event.target;
 if(target?.tagName==='TEXTAREA'||target?.isContentEditable)return null;
 const textInput=/^(INPUT|SELECT)$/.test(target?.tagName);
 if(textInput&&!target.closest?.('[data-design-history]'))return null;
 return key==='y'||event.shiftKey?'redo':'undo';
}
