// Create inside a geometry pass; never carry DOM measurements into another pass.
export function createFlowBoundsLookup(read){
 const bounds=new Map();
 return id=>{if(!bounds.has(id))bounds.set(id,read(id));return bounds.get(id);};
}
