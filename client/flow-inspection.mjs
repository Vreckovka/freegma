export function transitionInspection(state,event){
 switch(event.type){
  case 'hover':return state.hover===event.id?state:{...state,hover:event.id};
  case 'leave':return state.hover===null?state:{...state,hover:null};
  case 'open':return state.hover===event.id&&state.details===event.id?state:{hover:event.id,details:event.id};
  case 'close':return state.hover===null&&state.details===null?state:{hover:null,details:null};
  case 'validate':{const hover=event.ids.has(state.hover)?state.hover:null,details=event.ids.has(state.details)?state.details:null;return hover===state.hover&&details===state.details?state:{hover,details};}
  default:return state;
 }
}
