// One in-flight read per resource, independent of the number of visible users.
// Only completed reads advance the idle backoff; activity brings checks forward.
export function createPollHub({read,visible=()=>true,now=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout,maxDelay=30000}){
  const entries=new Map(),reads=new Map();
  function readOnce(key){
    if(!reads.has(key)){const pending=Promise.resolve().then(()=>read(key));reads.set(key,pending);pending.then(()=>reads.delete(key),()=>reads.delete(key));}
    return reads.get(key);
  }
  const base=e=>Math.min(...[...e.listeners].map(l=>l.interval));
  const eligible=e=>[...e.listeners].filter(l=>{try{return !l.canPoll||l.canPoll();}catch{return false;}});
  const live=e=>entries.get(e.key)===e&&e.listeners.size>0;
  function schedule(e,delay){
    if(!live(e)||e.running||!visible())return;
    const due=now()+delay;if(e.timer!==null&&e.due<=due)return;
    if(e.timer!==null)clearTimer(e.timer);e.due=due;
    e.timer=setTimer(()=>{e.timer=null;tick(e);},delay);
  }
  async function tick(e){
    if(!live(e)||e.running||!visible())return;
    if(!eligible(e).length){schedule(e,base(e));return;}
    e.running=true;e.lastRead=now();e.woken=false;
    try{
      const data=await readOnce(e.key);if(!live(e))return;
      const stamp=JSON.stringify(data),initial=e.stamp===undefined,changed=!initial&&stamp!==e.stamp;
      e.stamp=stamp;e.delay=changed?base(e):Math.min(maxDelay,Math.max(base(e),e.delay)*2);
      // Recheck guards after the request: an edit or navigation can begin while
      // the response is in flight. Await callbacks to avoid overlapping refreshes.
      if(visible())await Promise.all(eligible(e).map(async l=>{if(!e.listeners.has(l))return;try{await l.onData(data,{initial,changed});}catch{}}));
    }catch(error){
      if(live(e)){e.delay=Math.min(maxDelay,Math.max(base(e),e.delay)*2);if(visible())await Promise.all(eligible(e).map(async l=>{try{await l.onError?.(error);}catch{}}));}
    }finally{
      e.running=false;
      if(live(e))schedule(e,e.woken?base(e):e.delay);
    }
  }
  function wake(){
    for(const e of entries.values()){
      if(e.timer!==null){clearTimer(e.timer);e.timer=null;}
      e.delay=base(e);e.woken=true;
      schedule(e,Math.max(0,base(e)-(now()-e.lastRead)));
    }
  }
  function subscribe(key,{interval=3000,onData,onError,canPoll}){
    if(!Number.isFinite(interval)||interval<=0||interval>maxDelay)throw Error('Invalid poll interval.');
    let e=entries.get(key);
    if(!e){e={key,listeners:new Set(),delay:interval,timer:null,running:false,lastRead:-Infinity,woken:false};entries.set(key,e);}
    const l={interval,onData,onError,canPoll};e.listeners.add(l);e.delay=Math.min(e.delay,base(e));
    const elapsed=Number.isFinite(e.lastRead)?now()-e.lastRead:0;
    schedule(e,Math.max(0,base(e)-elapsed));
    return()=>{e.listeners.delete(l);if(!e.listeners.size){if(e.timer!==null)clearTimer(e.timer);entries.delete(key);}};
  }
  return {subscribe,wake,get size(){return entries.size;}};
}

const hubs=new WeakMap();
export function subscribeResource(api,path,options){
  let record=hubs.get(api);
  if(!record){
    const hub=createPollHub({read:key=>api(key),visible:()=>!document.hidden});
    const events=[[document,'visibilitychange'],[window,'focus'],[document,'pointerdown'],[document,'keydown']];
    record={hub,events};hubs.set(api,record);
  }
  const {hub,events}=record;
  if(!hub.size)for(const [target,type] of events)target.addEventListener(type,hub.wake,{passive:true});
  const stop=hub.subscribe(path,options);
  return()=>{stop();if(!hub.size)for(const [target,type] of events)target.removeEventListener(type,hub.wake);};
}
export const subscribeBoardStatus=(api,id,options)=>subscribeResource(api,`/api/boards/${id}/status`,options);
