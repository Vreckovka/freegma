// Share only pending reads. Completed/failed previews are evicted so later
// source updates fetch fresh data; different API clients never share results.
const clients=new WeakMap();
export function readReferencePreview(api,boardId,frameId){
 let pending=clients.get(api);if(!pending){pending=new Map();clients.set(api,pending);}
 const url=`/api/boards/${boardId}/flow-preview?frameId=${frameId}`;
 if(pending.has(url))return pending.get(url);
 const request=Promise.resolve().then(()=>api(url));pending.set(url,request);
 const clear=()=>{if(pending.get(url)===request)pending.delete(url);};
 request.then(clear,clear);return request;
}
