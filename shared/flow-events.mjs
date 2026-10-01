export const TRANSITION_EVENTS=Object.freeze([
 {id:'click',label:'Click',icon:'click'},{id:'hover',label:'Hover',icon:'cursor'},
 {id:'double-click',label:'Double click',icon:'click'},{id:'key-press',label:'Key press',icon:'keyboard'},
 {id:'submit',label:'Submit',icon:'send'},{id:'change',label:'Value change',icon:'edit'},
 {id:'focus',label:'Focus',icon:'eye'},{id:'page-load',label:'Page load',icon:'frame'},
 {id:'state-change',label:'State change',icon:'state'},{id:'timer',label:'Timer',icon:'clock'}
].map(Object.freeze));
export function transitionEvent(edge){return TRANSITION_EVENTS.find(e=>e.id===edge.event)||TRANSITION_EVENTS.find(e=>e.id===(edge.triggerId||edge.trigger?'click':'state-change'));}
