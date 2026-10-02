export const BRAND_ASSETS=Object.freeze({
 'logo.svg':'image/svg+xml',
 'favicon.svg':'image/svg+xml',
 'favicon.ico':'image/x-icon',
 'favicon-32.png':'image/png',
 'apple-touch-icon.png':'image/png',
 'icon-192.png':'image/png',
 'icon-512.png':'image/png',
 'site.webmanifest':'application/manifest+json; charset=utf-8'
});
export const BRAND_ROUTE='/('+Object.keys(BRAND_ASSETS).map(name=>name.replaceAll('.','\\.')).join('|')+')';
