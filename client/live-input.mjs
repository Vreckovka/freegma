export function inputValue(draft,{type='text',min,max,validate}={}){
 if(type==='number'){
  if(String(draft).trim()==='')return {valid:false};
  const value=Number(draft);
  if(!Number.isFinite(value)||Math.abs(value)>100000||min!==undefined&&value<min||max!==undefined&&value>max)return {valid:false};
  return {valid:!validate||validate(value),value};
 }
 const value=String(draft??'');return {valid:!validate||validate(value),value};
}
