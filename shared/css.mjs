import {layerStyle,subtree,applyOperations} from './design.mjs';

const error=message=>{throw Object.assign(new Error(message),{status:400});};
const unitless=new Set(['opacity','fontWeight','lineHeight','flexGrow','flexShrink','order','zIndex','scale','aspectRatio']);
export const cssName=key=>key.startsWith('--')?key:key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
export const styleName=key=>key.startsWith('--')?key:key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());
const extra='box-shadow text-shadow background-image background-size background-position background-repeat background-blend-mode border-top border-right border-bottom border-left border-color border-style border-width border-top-left-radius border-top-right-radius border-bottom-left-radius border-bottom-right-radius outline outline-offset filter backdrop-filter transform-origin text-decoration text-transform text-overflow overflow-x overflow-y word-break overflow-wrap white-space object-fit object-position grid-template-columns grid-template-rows grid-auto-flow grid-auto-columns grid-auto-rows grid-column grid-row column-gap row-gap align-self justify-self place-items place-content flex-grow flex-shrink flex-basis order max-width max-height min-height aspect-ratio z-index visibility cursor user-select letter-spacing';
const allowed=new Set(('box-sizing position left top right bottom width height flex min-width transform background color border border-radius opacity font-size font-weight font-family line-height text-align padding margin display flex-direction gap align-items justify-content overflow '+extra).split(' '));
for(const base of ['padding','margin'])for(const side of ['top','right','bottom','left'])allowed.add(base+'-'+side);
export function validateCssOverrides(values){
  if(!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).length>200)error('Invalid layer CSS.');
  for(const [key,value] of Object.entries(values)){
    if(!allowed.has(key))error(`Unsupported CSS property: ${key}.`);
    if(typeof value!=='string'||!value.trim()||value.length>4000||/[{}<>\\\u0000-\u0008]/.test(value)||/url\s*\(|expression\s*\(|@import|!important/i.test(value))error(`Invalid ${key}: external URLs, escapes and !important are not supported.`);
  }
  return values;
}
export function mergeCss(style,overrides){for(const [key,value] of Object.entries(overrides||{}))style[styleName(key)]=value;return style;}
const fieldCss={x:['left'],y:['top'],width:['width'],height:['height'],rotation:['transform'],fill:['background','background-image'],stroke:['border','border-color'],strokeWidth:['border','border-width'],radius:['border-radius'],visible:['display'],clip:['overflow'],layout:['display','flex-direction'],align:['align-items'],justify:['justify-content'],sizing:['width','height','flex'],widthSizing:['width','flex'],heightSizing:['height','flex'],wrap:['flex-wrap']};
export const relatedCssProperties=key=>fieldCss[key]||[cssName(key)];
export function clearCssForPatch(node,patch){
  if(!node.cssOverrides||Object.hasOwn(patch,'cssOverrides'))return;
  const values={...node.cssOverrides};
  for(const key of Object.keys(patch))for(const property of fieldCss[key]||[cssName(key)]){
    delete values[property];
    if(property.startsWith('padding-'))delete values.padding;
    if(property.startsWith('margin-'))delete values.margin;
  }
  node.cssOverrides=values;
}
allowed.add('flex-wrap');
export const CSS_PROPERTIES=[...allowed].sort();
function declarations(style){return Object.fromEntries(Object.entries(style).filter(([,v])=>v!=null).map(([k,v])=>[cssName(k),typeof v==='number'&&!unitless.has(k)?`${v}px`:String(v)]));}
export function cssForDocument(document,nodeId=null){
  const nodes=nodeId?subtree(document,nodeId).nodes:document.nodes,byId=new Map(nodes.map(n=>[n.id,n])),roots=nodes.filter(n=>!byId.has(n.parentId)),rootSet=new Set(roots);
  const minX=Math.min(0,...roots.map(n=>nodeId?0:n.x)),minY=Math.min(0,...roots.map(n=>nodeId?0:n.y));
  const rules=new Map();
  for(const n of nodes){const parent=byId.get(n.parentId),root=rootSet.has(n),style=layerStyle(n,parent,root);if(root){if(!n.cssOverrides?.left)style.left=nodeId?0:n.x-minX;if(!n.cssOverrides?.top)style.top=nodeId?0:n.y-minY;}rules.set(n.id,declarations(style));}
  return {nodes,rules,css:nodes.map(n=>`/* ${n.name.replace(/\*\//g,'').replace(/[\r\n]/g,' ')} */\n.fg-${n.id} {\n${Object.entries(rules.get(n.id)).map(([k,v])=>`  ${k}: ${v};`).join('\n')}\n}`).join('\n\n')+'\n'};
}
// Small, bounded grammar: explicit layer rules and declarations, not executable JSX.
function scan(text,separator){let quote='',depth=0,parts=[],start=0;for(let i=0;i<text.length;i++){const c=text[i];if(quote){if(c===quote)quote='';continue;}if(c==='"'||c==="'")quote=c;else if(c==='('||c==='[')depth++;else if(c===')'||c===']'){if(--depth<0)error('Unbalanced CSS value.');}else if(c===separator&&depth===0){parts.push(text.slice(start,i));start=i+1;}}if(quote||depth)error('Unclosed CSS string or function.');parts.push(text.slice(start));return parts;}
export function parseLayerCss(text){
  if(typeof text!=='string'||text.length>2000000)error('CSS must be at most 2 MB.');
  const clean=text.replace(/\/\*[\s\S]*?\*\//g,'');
  if(/\\|<|>|!important/i.test(clean))error('CSS escapes, markup and !important are not supported.');
  const rules=new Map();let rest=clean.trim();
  while(rest){const match=rest.match(/^\.fg-([\w-]+)\s*\{([^{}]*)\}/);if(!match)error('Use generated .fg-layer selectors only. Nested rules and at-rules are not supported.');
    if(rules.has(match[1]))error('Duplicate layer selector: '+match[1]);const values={};
    for(const chunk of scan(match[2],';')){if(!chunk.trim())continue;const colon=chunk.indexOf(':');if(colon<1)error('Expected property: value;');const key=chunk.slice(0,colon).trim().toLowerCase(),value=chunk.slice(colon+1).trim();validateCssOverrides({[key]:value});values[key]=value;}
    rules.set(match[1],values);rest=rest.slice(match[0].length).trim();
  }
  return rules;
}
const simple={left:'x',top:'y',width:'width',height:'height','font-size':'fontSize','font-weight':'fontWeight','font-family':'fontFamily','line-height':'lineHeight','letter-spacing':'letterSpacing',opacity:'opacity',gap:'gap','border-radius':'radius',color:'color',background:'fill','text-align':'textAlign'};
const px=value=>/^-?(?:\d+\.?\d*|\.\d+)(?:px)?$/.test(value)?parseFloat(value):null;
function nativeValue(key,value){
  if(['background','color'].includes(key))return /^(#[\da-f]{3,8}|transparent|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\))$/i.test(value)?value:null;
  if(key==='font-family')return value;
  if(key==='text-align')return ['left','center','right'].includes(value)?value:null;
  if(['opacity','font-weight','line-height'].includes(key))return /^-?[\d.]+$/.test(value)?Number(value):null;
  return px(value);
}
export function cssOperations(document,text,nodeId=null){
  const base=cssForDocument(document,nodeId),edited=parseLayerCss(text),ops=[];
  for(const id of edited.keys())if(!base.rules.has(id))error('CSS selector is outside this export: '+id);
  for(const n of base.nodes){const before=base.rules.get(n.id),after=edited.get(n.id)||{},patch={},overrides={...(n.cssOverrides||{})};
    // An omitted selector leaves that layer alone; deleting a declaration resets it.
    if(!edited.has(n.id))continue;
    for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
      if(before[key]===after[key])continue;
      const value=after[key]??'initial';let mapped=false;
      const flow=n.parentId&&document.nodes.find(p=>p.id===n.parentId)?.layout!=='free'&&!n.absolute;
      if(simple[key]&&after[key]!=null&&!(['left','top'].includes(key)&&flow)&&!(key==='border-radius'&&n.type==='ellipse')){const val=nativeValue(key,value);if(val!=null){const field=simple[key];patch[field]=['left','top'].includes(key)?n[field]+val-(px(before[key])??0):val;if(['width','height'].includes(key))patch[key+'Sizing']='fixed';mapped=true;}}
      if(key==='display'&&['flex','block','none'].includes(value)){patch.visible=value!=='none';if(value!=='none')patch.layout=value==='flex'?(n.layout==='free'?'vertical':n.layout):'free';mapped=true;}
      if(key==='flex-direction'&&['row','column'].includes(value)){patch.layout=value==='row'?'horizontal':'vertical';mapped=true;}
      if(key==='flex-wrap'&&['wrap','nowrap'].includes(value)){patch.wrap=value==='wrap';mapped=true;}
      if(key==='align-items'&&['flex-start','flex-end','center','stretch'].includes(value)){patch.align=value.replace('flex-','');mapped=true;}
      if(key==='justify-content'&&['flex-start','flex-end','center','space-between'].includes(value)){patch.justify=value.replace('flex-','');mapped=true;}
      if(key==='overflow'&&['hidden','visible'].includes(value)){patch.clip=value==='hidden';mapped=true;}
      if(['padding','margin'].includes(key)&&after[key]!=null){const parts=value.trim().split(/\s+/).map(px);if(parts.length>=1&&parts.length<=4&&parts.every(v=>v!=null)){const [t,r=t,b=t,l=r]=parts;for(const [side,v] of Object.entries({Top:t,Right:r,Bottom:b,Left:l}))patch[key+side]=v;for(const side of ['top','right','bottom','left'])delete overrides[key+'-'+side];mapped=true;}}
      if(/^(padding|margin)-(top|right|bottom|left)$/.test(key)&&after[key]!=null&&px(value)!=null){const [prefix,side]=key.split('-');patch[prefix+side[0].toUpperCase()+side.slice(1)]=px(value);delete overrides[prefix];mapped=true;}
      if(mapped)delete overrides[key];else overrides[key]=value;
    }
    if(Object.keys(patch).length||JSON.stringify(overrides)!==JSON.stringify(n.cssOverrides||{}))ops.push({op:'update',id:n.id,patch:{...patch,cssOverrides:overrides}});
  }
  if(ops.length)applyOperations(document,ops);return ops;
}
