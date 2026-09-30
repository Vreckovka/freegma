export const PANEL_KEY='freegma:panels:v1';
export const PANEL_LIMITS={left:{min:200,max:480,default:230},right:{min:248,max:640,default:274}};
export const PANEL_RAIL=40,CANVAS_MIN=180;
export function normalizePanels(value={}){
  return Object.fromEntries(Object.entries(PANEL_LIMITS).map(([side,limit])=>[side,{width:Math.round(Math.max(limit.min,Math.min(limit.max,Number.isFinite(value?.[side]?.width)?value[side].width:limit.default))),collapsed:value?.[side]?.collapsed===true}]));
}
export function readPanels(storage){try{return normalizePanels(JSON.parse((storage??window.localStorage).getItem(PANEL_KEY)||'{}'));}catch{return normalizePanels();}}
export function savePanels(value,storage){try{(storage??window.localStorage).setItem(PANEL_KEY,JSON.stringify(normalizePanels(value)));}catch{}}
export function panelLayout(value,width){
  const panels=normalizePanels(value),available=Math.max(0,width-CANVAS_MIN);
  let left=panels.left.collapsed?PANEL_RAIL:panels.left.width,right=panels.right.collapsed?PANEL_RAIL:panels.right.width;
  if(left+right>available){const leftMin=panels.left.collapsed?PANEL_RAIL:PANEL_LIMITS.left.min,rightMin=panels.right.collapsed?PANEL_RAIL:PANEL_LIMITS.right.min;
    left=Math.max(leftMin,Math.min(left,available-rightMin));right=Math.max(rightMin,Math.min(right,available-left));
    if(left+right>available)left=PANEL_RAIL;
    if(left+right>available)right=PANEL_RAIL;
  }
  return {left,right};
}
export function resizeLimit(side,layout,width){return Math.max(PANEL_LIMITS[side].min,Math.min(PANEL_LIMITS[side].max,width-CANVAS_MIN-layout[side==='left'?'right':'left']));}
