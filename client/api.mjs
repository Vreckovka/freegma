// Bound reads through both headers and body consumption. Writes retain their
// existing caller-owned timeout and acknowledgement/retry policy.
export function createApi(fetcher=fetch,{readTimeoutMs=20000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 return async function api(url,method='GET',body,options={}){
  const read=method==='GET'||method==='HEAD',controller=read?new AbortController():null;
  let timer,abort,rejectDeadline;
  const deadline=read?new Promise((_,reject)=>{rejectDeadline=reject;timer=setTimer(()=>{const error=Object.assign(new Error('Loading timed out. Retry loading this board.'),{readTimeout:true});reject(error);controller.abort(error);},readTimeoutMs);}):null;
  if(read&&options.signal){abort=()=>{rejectDeadline(options.signal.reason||Object.assign(new Error('Read cancelled.'),{name:'AbortError'}));controller.abort(options.signal.reason);};if(options.signal.aborted)abort();else options.signal.addEventListener('abort',abort,{once:true});}
  const request=(async()=>{const response=await fetcher(url,{...options,...(read?{signal:controller.signal}:{}),method,headers:body?{'Content-Type':'application/json'}:options.headers,body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Request failed'),{status:response.status});return data;})();
  try{return await (deadline?Promise.race([request,deadline]):request);}finally{if(read){clearTimer(timer);options.signal?.removeEventListener('abort',abort);}}
 };
}
export const retryableRead=error=>error?.readTimeout||error instanceof TypeError||[502,503,504].includes(error?.status);
// One bounded read stream per board. A failed stream is evicted so the same
// board can be opened again without leaving it or reloading the whole editor.
export function createBoardLoader(read){
 const pending=new Map();
 return {load(id){if(pending.has(id))return pending.get(id);const promise=(async()=>{try{return await read(id);}catch(error){if(!retryableRead(error))throw error;return read(id);}})();pending.set(id,promise);const clear=()=>{if(pending.get(id)===promise)pending.delete(id);};promise.then(clear,clear);return promise;},get size(){return pending.size;}};
}
