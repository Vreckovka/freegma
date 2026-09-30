import {readTheme} from './theme.mjs';
// Run before the stylesheet so a saved light preference never flashes dark.
document.documentElement.dataset.theme=readTheme();
