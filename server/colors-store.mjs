import {clone,newId,makeNode} from '../shared/design.mjs';
import {newColorSystem,validateColorSystem,validateColor,resolveNode,colorSlots,writePath} from '../shared/colors.mjs';
import {STUDIO_PALETTES} from '../shared/studio-designs.mjs';
import {boardPath} from './files.mjs';
const error=(message,status=400)=>Object.assign(new Error(message),{status});
const name=v=>{if(typeof v!=='string'||!v.trim()||v.length>100)throw error('Use a name with 1–100 characters.');return v.trim();};
const keyFor=value=>{let h=2166136261;for(const c of value.toLowerCase())h=Math.imul(h^c.charCodeAt(0),16777619);return 'color_'+(h>>>0).toString(16);};
const semantic={canvas:'background',panel:'surface',field:'field',text:'text',muted:'muted',border:'border',accent:'accent',active:'active',onAccent:'on_accent',code:'code',codeText:'code_text'};
export const colorStoreMethods={
  colorOwner(workspaceId){let w=this.manifest(workspaceId),theme=w.colorTheme;while(!w.colorSystem&&w.parentId){w=this.manifest(w.parentId);theme??=w.colorTheme;}return {w,theme};},
  colors(workspaceId){return this.transaction(()=>{let {w,theme}=this.colorOwner(workspaceId);if(!w.colorSystem){w.colorSystem=newColorSystem();this.stageManifest(w);}const p=w.colorSystem;return {...clone(p),ownerId:w.id,workspaceId,themeId:p.themes.some(t=>t.id===theme)?theme:p.defaultTheme};});},
  updateColors(workspaceId,expectedRevision,operation){return this.transaction(()=>{
    const context=this.colors(workspaceId),w=this.manifest(context.ownerId),p=w.colorSystem,op=operation;
    if(!Number.isSafeInteger(expectedRevision)||p.revision!==expectedRevision)throw error('Project colors changed elsewhere. Reload before editing.',409);
    if(!op||typeof op.op!=='string')throw error('Supply a color operation.');
    const role=()=>{const r=p.schematic.find(r=>r.key===op.key);if(!r)throw error('Color role not found.');return r;};
    const theme=id=>{const t=p.themes.find(t=>t.id===(id||context.themeId));if(!t)throw error('Color theme not found.');return t;};
    if(op.op==='setColor'){
      role();const t=theme(op.themeId),value=validateColor(op.value),before=t.colors[op.key];if(before===value)return context;
      const history=p.colorHistory||{entries:[],cursor:0},createdAt=new Date().toISOString();history.entries=history.entries.slice(0,history.cursor);
      history.entries.push({id:newId('color_edit'),key:op.key,themeId:t.id,before,after:value,createdAt});if(history.entries.length>2000)history.entries.shift();history.cursor=history.entries.length;history.lastEditAt=createdAt;p.colorHistory=history;t.colors[op.key]=value;
    }
    else if(op.op==='undo'||op.op==='redo')return this.travelColors(workspaceId,expectedRevision,op.op);
    else if(op.op==='addColor'){const key=op.key||newId('color');if(!/^[a-z][a-z0-9_-]{0,79}$/.test(key)||p.schematic.some(r=>r.key===key))throw error('Use a unique color key.');const value=validateColor(op.value);p.schematic.push({key,name:name(op.name),value});for(const t of p.themes)t.colors[key]=value;}
    else if(op.op==='renameColor')role().name=name(op.name);
    else if(op.op==='removeColor'){
      role();this.detachColor(context.ownerId,op.key);p.schematic=p.schematic.filter(r=>r.key!==op.key);for(const t of p.themes)delete t.colors[op.key];delete p.colorHistory;
    }
    else if(op.op==='createTheme'){const source=theme(op.sourceThemeId),id=newId('theme');p.themes.push({id,name:name(op.name),colors:clone(source.colors)});}
    else if(op.op==='renameTheme')theme(op.themeId).name=name(op.name);
    else if(op.op==='removeTheme'){const t=theme(op.themeId);if(p.themes.length===1)throw error('Keep at least one color theme.');p.themes=p.themes.filter(x=>x.id!==t.id);if(p.defaultTheme===t.id)p.defaultTheme=p.themes[0].id;delete p.colorHistory;for(const info of this.workspaces()){const child=this.manifest(info.id);if(this.colorOwner(child.id).w.id===w.id&&child.colorTheme===t.id){child.colorTheme=p.defaultTheme;this.stageManifest(child);}}}
    else if(op.op==='setDefaultTheme')p.defaultTheme=theme(op.themeId).id;
    else if(op.op==='setTheme'){const target=this.manifest(workspaceId);target.colorTheme=theme(op.themeId).id;this.stageManifest(target);}
    else throw error('Unknown color operation.');
    p.revision++;validateColorSystem(p);
    // Palette mutations can also stage manifests (detach or workspace theme changes).
    const latest=this.manifest(w.id);latest.colorSystem=p;this.stageManifest(latest);return this.colors(workspaceId);
  });},
  clearColorRedo(workspaceId){const {w}=this.colorOwner(workspaceId),h=w.colorSystem?.colorHistory;if(h&&h.cursor<h.entries.length){h.entries=h.entries.slice(0,h.cursor);w.colorSystem.revision++;this.stageManifest(w);}},
  travelColors(workspaceId,expectedRevision,direction){return this.transaction(()=>{
    const context=this.colors(workspaceId),w=this.manifest(context.ownerId),p=w.colorSystem,h=p.colorHistory;
    if(!Number.isSafeInteger(expectedRevision)||p.revision!==expectedRevision)throw error('Project colors changed elsewhere. Supply the current expectedPaletteRevision before undoing colors.',409);
    const entry=h?.entries[direction==='undo'?h.cursor-1:h.cursor];if(!entry||!['undo','redo'].includes(direction))throw error(`Nothing to ${direction} in project colors.`,409);
    const theme=p.themes.find(t=>t.id===entry.themeId);if(!theme||!p.schematic.some(r=>r.key===entry.key))throw error('This color history no longer applies.',409);
    theme.colors[entry.key]=direction==='undo'?entry.before:entry.after;if(direction==='undo')entry.undoneAt=new Date().toISOString();h.cursor+=direction==='undo'?-1:1;p.revision++;validateColorSystem(p);this.stageManifest(w);return this.colors(workspaceId);
  });},
  detachColor(ownerId,key){
    for(const info of this.workspaces()){if(this.colorOwner(info.id).w.id!==ownerId)continue;const palette=this.colors(info.id),w=this.manifest(info.id);
      const detach=doc=>{let changed=false;for(const n of doc.nodes){const bindings=n.colorBindings||[],selected=bindings.filter(b=>b.token===key);if(!selected.length)continue;const resolved=resolveNode({...n,colorBindings:selected},palette);for(const b of selected)writePath(n,b.path,b.path.split('.').reduce((v,k)=>v?.[k],resolved));n.colorBindings=bindings.filter(b=>b.token!==key);changed=true;}return changed;};
      for(const ref of w.boards){const b=this.readBoard(ref.id),changed=detach(b.document);for(const h of b.history){detach(h.before);detach(h.after);}if(changed)b.revision++;this.files.stage(boardPath(w.id,b.id),b);}
      for(const c of w.components)detach(c.definition);this.stageManifest(w);
    }
  },
  insertColorSchematic(boardId,revision,{x=100,y=100}={}){const b=this.getBoard(boardId);this.expect(b,revision);const n=makeNode('frame',{name:'Project color schematic',colorSchematic:true,x,y,width:380,height:Math.max(180,92+Math.min(12,b.palette.schematic.length)*42),fill:'#1b1e27',color:'#e8eaf3',radius:12,clip:true});return this.transaction(()=>({board:this.writeBoard(b,{...b.document,nodes:[...b.document.nodes,n]},'Insert color schematic'),nodeId:n.id}));},
  migrateColors(){return this.transaction(()=>{
    const groups=new Map();for(const w of this.workspaces()){let root=this.manifest(w.id);while(root.parentId)root=this.manifest(root.parentId);if(!groups.has(root.id))groups.set(root.id,[]);groups.get(root.id).push(w);}
    const report=[];
    for(const [rootId,infos] of groups){let root=this.manifest(rootId);if(root.colorsMigrated)continue;
      const studio=root.name==='Freegma'&&infos.some(w=>['Light Mode','Dark Mode'].includes(w.name));
      const p=studio?{revision:1,defaultTheme:'theme_dark',schematic:Object.entries(semantic).map(([from,key])=>({key,name:key.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase()),value:STUDIO_PALETTES.dark[from]})),themes:['light','dark'].map(mode=>({id:'theme_'+mode,name:mode==='light'?'Light Mode':'Dark Mode',colors:Object.fromEntries(Object.entries(semantic).map(([from,key])=>[key,STUDIO_PALETTES[mode][from]]))}))}:{revision:1,defaultTheme:'theme_default',schematic:[],themes:[{id:'theme_default',name:'Current theme',colors:{}}]};
      const docs=[];for(const w of infos){const manifest=this.manifest(w.id);for(const ref of manifest.boards){const b=this.readBoard(ref.id);docs.push({w:manifest,b,documents:[b.document,...b.history.flatMap(h=>[h.before,h.after])]});}for(const c of manifest.components)docs.push({w:manifest,component:c,documents:[c.definition]});}
      const legacyNames=new Map();if(!studio){
        const current=docs.filter(d=>d.b).flatMap(d=>d.b.document.nodes),used=new Set();
        const choose=(label,field,filter,weight=()=>1)=>{const counts=new Map();for(const n of current.filter(filter)){const v=n[field];if(v&&v!=='transparent'&&!used.has(v.toLowerCase()))counts.set(v,(counts.get(v)||0)+weight(n));}const value=[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0];if(value){used.add(value.toLowerCase());legacyNames.set(keyFor(value),label);}};
        choose('Background','fill',n=>!n.parentId&&['frame','rectangle'].includes(n.type),n=>n.width*n.height);
        choose('Surface / overlay','fill',n=>n.type==='frame'&&n.parentId);
        choose('Text','color',n=>n.type==='text');choose('Muted text','color',n=>n.type==='text');
        choose('Border','stroke',n=>n.strokeWidth>0);choose('Accent','color',n=>n.type==='icon');
      }
      let bound=0;
      for(const item of docs){const mode=item.w.name==='Light Mode'?'light':'dark';for(const doc of item.documents)for(const n of doc.nodes){if(n.colorBindings?.length)continue;const bindings=[];
        for(const slot of colorSlots(n)){let key;if(studio){const matches=Object.entries(STUDIO_PALETTES[mode]).filter(([,v])=>v.toLowerCase()===slot.value.toLowerCase());const preferred=matches.find(([k])=>slot.path==='color'?k==='onAccent'||k==='text':k!=='onAccent');if(preferred||matches.length)key=semantic[(preferred||matches[0])[0]];}
          key??=keyFor(slot.value);if(!p.schematic.some(r=>r.key===key)){p.schematic.push({key,name:legacyNames.get(key)||(slot.value==='transparent'?'Transparent':`Color ${slot.value.toUpperCase()}`),value:slot.value});for(const t of p.themes)t.colors[key]=slot.value;}
          bindings.push({path:slot.path,token:key,source:slot.value});bound++;
        }if(bindings.length)n.colorBindings=bindings;
      }}
      validateColorSystem(p);root.colorSystem=p;root.colorsMigrated=1;this.stageManifest(root);
      for(const w of infos){const manifest=this.manifest(w.id);if(studio&&['Light Mode','Dark Mode'].includes(w.name))manifest.colorTheme=w.name==='Light Mode'?'theme_light':'theme_dark';for(const item of docs.filter(d=>d.w.id===w.id)){if(item.b){item.b.revision++;this.files.stage(boardPath(w.id,item.b.id),item.b);}else{manifest.components=manifest.components.map(c=>c.id===item.component.id?item.component:c);}}this.stageManifest(manifest);}
      report.push({ownerId:rootId,workspaces:infos.length,boards:docs.filter(d=>d.b).length,roles:p.schematic.length,themes:p.themes.length,bindings:bound});
    }
    return {migrated:report};
  });}
};
