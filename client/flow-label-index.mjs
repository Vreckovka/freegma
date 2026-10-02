// One placement pass only. Preserve candidate order and the exact collision rule.
export function createFlowLabelIndex(){
 const labels=[],cells=new Map();let indexed=false,maxWidth=0,cluster;
 const cell=(x,y)=>`${x}:${y}`,insert=r=>{const key=cell(Math.floor(r.x/320),Math.floor(r.y/32));let bucket=cells.get(key);if(!bucket)cells.set(key,bucket=[]);bucket.push(r);};
 function collides(p,width){
  const overlaps=r=>Math.abs(r.x-p.x)<(r.width+width)/2+6&&Math.abs(r.y-p.y)<26;
  if(!indexed){for(const r of labels)insert(r);indexed=true;}
  const radius=(maxWidth+width)/2+6;
  for(let y=Math.floor((p.y-26)/32),endY=Math.floor((p.y+26)/32);y<=endY;y++)
   for(let x=Math.floor((p.x-radius)/320),endX=Math.floor((p.x+radius)/320);x<=endX;x++){
    const bucket=cells.get(cell(x,y));if(bucket?.some(overlaps))return true;
   }
  return false;
 }
 return {place(candidates,width){
  if(labels.length===64){const xs=labels.map(r=>r.x),ys=labels.map(r=>r.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);if(right-left<=320&&bottom-top<=128)cluster={left:left-320,right:right+320,top:top-128,bottom:bottom+128};}
  // Keep the original fast early-exit scan for small or tightly clustered labels.
  if(cluster&&!candidates.every(p=>p.x>=cluster.left&&p.x<=cluster.right&&p.y>=cluster.top&&p.y<=cluster.bottom))cluster=null;
  const label=(labels.length<64||cluster?candidates.find(p=>!labels.some(r=>Math.abs(r.x-p.x)<(r.width+width)/2+6&&Math.abs(r.y-p.y)<26)):candidates.find(p=>!collides(p,width)))||candidates[0],record={...label,width};
  labels.push(record);maxWidth=Math.max(maxWidth,width);if(indexed)insert(record);return label;
 }};
}
