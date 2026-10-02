import {prepareText,sendPreparedText} from './text-response.mjs';

// Keep immutable wire representations, not design/history objects. Every read still
// validates the current file signature and computes the exact effective palette.
export function boardRepresentations(store,{maxEntries=16,maxBytes=16*1024*1024}={}){
 const cache=new Map();let retainedBytes=0;
 const remove=id=>{const entry=cache.get(id);if(entry){retainedBytes-=entry.size;cache.delete(id);}};
 return id=>store.transaction(()=>{
  const source=store.readBoard(id,false),paletteKey=JSON.stringify(store.colors(source.workspaceId));
  let entry=cache.get(id);
  if(entry?.source.deref()===source&&entry.paletteKey===paletteKey){cache.delete(id);cache.set(id,entry);return entry.response;}
  remove(id);
  const response=prepareText(JSON.stringify(store.getBoard(id))),size=response.bytes.length+Buffer.byteLength(paletteKey);
  if(maxEntries>0&&size<=maxBytes){
   while(cache.size&&(cache.size>=maxEntries||retainedBytes+size>maxBytes))remove(cache.keys().next().value);
   entry={source:new WeakRef(source),paletteKey,response,size};cache.set(id,entry);retainedBytes+=size;
  }
  return response;
 });
}
export function boardResponses(store){
 const read=boardRepresentations(store);
 return (req,res,id)=>sendPreparedText(req,res,200,read(id),{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
}
