export const THEME_KEY='freegma:theme';
export function readTheme(storage){try{return (storage??window.localStorage).getItem(THEME_KEY)==='light'?'light':'dark';}catch{return 'dark';}}
export function saveTheme(theme,storage){try{(storage??window.localStorage).setItem(THEME_KEY,theme==='light'?'light':'dark');return true;}catch{return false;}}
