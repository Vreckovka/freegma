// Appended only to an isolated laboratory build; never bundled into the product.
if(location.hostname==='127.0.0.1'&&location.port==='4338'){
 const timings={started:performance.now(),readyMs:null,longTasks:[],frameGaps:[]};let last=null,frames=0;
 try{new PerformanceObserver(list=>{for(const entry of list.getEntries())timings.longTasks.push({start:entry.startTime,duration:entry.duration});}).observe({type:'longtask',buffered:true});}catch{}
 const output=document.createElement('output');output.id='freegma-performance';output.hidden=true;document.body.append(output);
 const ready=()=>{if(timings.readyMs===null&&(document.querySelector('.design-layer')||document.querySelector('.flow-step,.flow-reference-frame'))){requestAnimationFrame(()=>{timings.readyMs=performance.now();observer.disconnect();});}};
 const observer=new MutationObserver(ready);observer.observe(document.getElementById('root'),{childList:true,subtree:true});ready();
 function frame(now){if(last!==null&&document.visibilityState==='visible')timings.frameGaps.push(now-last);last=now;if(++frames<180)requestAnimationFrame(frame);}requestAnimationFrame(frame);
 function snapshot(){const resources=performance.getEntriesByType('resource').filter(r=>r.name.startsWith(location.origin+'/api/')).map(r=>({path:new URL(r.name).pathname+new URL(r.name).search,start:r.startTime,duration:r.duration,bytes:r.encodedBodySize,transferBytes:r.transferSize}));output.textContent=JSON.stringify({...timings,observedAt:performance.now(),visibility:document.visibilityState,viewport:{width:innerWidth,height:innerHeight},domNodes:document.getElementsByTagName('*').length,renderedLayers:document.querySelectorAll('.design-layer').length,resources});}
 const timer=setInterval(snapshot,1000);setTimeout(()=>{clearInterval(timer);snapshot();},120000);snapshot();
}
