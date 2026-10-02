export const BOARD_SECTION_KEY='freegma:board-section-height:v1';
export const BOARD_SECTION_LIMITS={min:80,max:1600,default:190,lowerMin:160,handle:8};
export function normalizeBoardHeight(value){return Math.round(Math.max(BOARD_SECTION_LIMITS.min,Math.min(BOARD_SECTION_LIMITS.max,Number.isFinite(value)?value:BOARD_SECTION_LIMITS.default)));}
export function boardSectionMaximum(panelHeight,tabsHeight,footerHeight){const l=BOARD_SECTION_LIMITS;return Math.max(l.min,Math.min(l.max,Math.floor(panelHeight-tabsHeight-footerHeight-l.lowerMin-l.handle)));}
export const clampBoardHeight=(value,max)=>Math.min(normalizeBoardHeight(value),Math.max(BOARD_SECTION_LIMITS.min,max));
export function readBoardHeight(storage){try{return normalizeBoardHeight(JSON.parse((storage??window.localStorage).getItem(BOARD_SECTION_KEY)||'null'));}catch{return BOARD_SECTION_LIMITS.default;}}
export function saveBoardHeight(value,storage){try{(storage??window.localStorage).setItem(BOARD_SECTION_KEY,JSON.stringify(normalizeBoardHeight(value)));}catch{}}
