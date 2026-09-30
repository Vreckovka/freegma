import React from 'react';
import {ICON_PATHS as paths} from '../shared/icons.mjs';
export function Icon({name='sparkles',size=18,...props}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]||paths.sparkles}/></svg>;}
