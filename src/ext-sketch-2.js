/* ---------- sketch extensions, round two ----------
   zoom and pan, tap to place and marker mode, grouped toolbar and a symbols sheet, measuring by
   tapping the points, distance and bearing, moving a whole layer, a bar when saving fails,
   a render guard with repair on load, case packages, rough or finished sketch. */

/* ---- zoom and pan: the viewBox is a window onto the page ---- */
var PVN=0;   // preview pattern ids
const ZOOM={k:1,x:0,y:0,sk:null};
function zoomBox(sk){
  if(ZOOM.sk!==sk.id){ZOOM.k=1;ZOOM.x=0;ZOOM.y=0;ZOOM.sk=sk.id}
  zoomClamp(sk); return `${ZOOM.x} ${ZOOM.y} ${pageW(sk)/ZOOM.k} ${pageH(sk)/ZOOM.k}`;
}
function zoomClamp(sk){
  ZOOM.k=Math.min(8,Math.max(1,ZOOM.k||1));
  const vw=pageW(sk)/ZOOM.k, vh=pageH(sk)/ZOOM.k;
  ZOOM.x=Math.min(pageW(sk)-vw,Math.max(0,ZOOM.x||0));
  ZOOM.y=Math.min(pageH(sk)-vh,Math.max(0,ZOOM.y||0));
}
function zoomApply(){
  const sk=curSk(), svg=document.getElementById("skcanvas"); if(!sk||!svg)return;
  zoomClamp(sk); svg.setAttribute("viewBox",zoomBox(sk));
  const z=document.querySelector(".zoomlvl"); if(z)z.textContent=Math.round(ZOOM.k*100)+"%";
}
function zoomTo(k,cx,cy){
  const sk=curSk(); if(!sk)return;
  const k0=ZOOM.k; k=Math.min(8,Math.max(1,k));
  if(cx==null){cx=ZOOM.x+pageW(sk)/k0/2; cy=ZOOM.y+pageH(sk)/k0/2}
  ZOOM.x=cx-(cx-ZOOM.x)*k0/k; ZOOM.y=cy-(cy-ZOOM.y)*k0/k; ZOOM.k=k;
  zoomClamp(sk); redrawCanvas();
}
let UPP=1;      // page units per screen pixel, read off the canvas each time it draws
function unitsPerPx(){
  const svg=document.getElementById("skcanvas"), sk=curSk();
  if(svg&&sk){const r=svg.getBoundingClientRect(); if(r.width>0)UPP=(pageW(sk)/ZOOM.k)/r.width}
  return UPP;
}
const handleU=()=>Math.max(12,Math.min(64,36*unitsPerPx()));   // about 36 screen pixels
function zoomBar(){
  return `<div class="zoombar"><button data-zoom="out" aria-label="Zoom out">&minus;</button>
    <span class="zoomlvl">${Math.round(ZOOM.k*100)}%</span>
    <button data-zoom="in" aria-label="Zoom in">+</button>
    <button data-zoom="fit" aria-label="Fit the page">Fit</button></div>`;
}
/* two fingers: pinch to zoom, wherever they land */
const PTRS=new Map(); let pinch=null;
document.addEventListener("pointerdown",e=>{
  const svg=document.getElementById("skcanvas"); if(!svg||!svg.contains(e.target))return;
  if(drag&&drag.mode==="ink"&&e.pointerType!=="pen"){e.stopPropagation();e.preventDefault();return}   // a palm on the glass while the Pencil draws
  if(e.isPrimary){PTRS.clear();pinch=null}      // a new primary pointer means any earlier gesture is over
  PTRS.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(PTRS.size===2){
    if(drag&&drag.mode==="move"){drag.o.x=drag.x;drag.o.y=drag.y}    // the first finger was a grab, not a move
    if(drag&&drag.mode==="laymove")drag.objs.forEach((o,i)=>{o.x=drag.start[i][0];o.y=drag.start[i][1]});
    drag=null;
    const sk=curSk(), r=svg.getBoundingClientRect(), [a,b]=[...PTRS.values()];
    const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
    pinch={d:Math.hypot(a.x-b.x,a.y-b.y),k:ZOOM.k,
      px:ZOOM.x+(mx-r.left)/r.width*pageW(sk)/ZOOM.k, py:ZOOM.y+(my-r.top)/r.height*pageH(sk)/ZOOM.k};
    e.stopPropagation(); e.preventDefault();
  }
},true);
document.addEventListener("pointermove",e=>{
  if(!PTRS.has(e.pointerId))return;
  PTRS.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(!pinch||PTRS.size<2)return;
  const svg=document.getElementById("skcanvas"), sk=curSk(); if(!svg||!sk)return;
  const r=svg.getBoundingClientRect(), [a,b]=[...PTRS.values()];
  const d=Math.hypot(a.x-b.x,a.y-b.y), mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
  ZOOM.k=Math.min(8,Math.max(1,pinch.k*d/Math.max(1,pinch.d)));
  ZOOM.x=pinch.px-(mx-r.left)/r.width*pageW(sk)/ZOOM.k;
  ZOOM.y=pinch.py-(my-r.top)/r.height*pageH(sk)/ZOOM.k;
  zoomApply(); e.stopPropagation(); e.preventDefault();
},{capture:true,passive:false});
["pointerup","pointercancel"].forEach(ev=>document.addEventListener(ev,e=>{
  if(!PTRS.has(e.pointerId))return;
  PTRS.delete(e.pointerId);
  if(pinch&&PTRS.size<2){pinch=null; redrawCanvas()}
},true));
document.addEventListener("wheel",e=>{
  const svg=document.getElementById("skcanvas");
  if(!svg||!svg.contains(e.target)||!(e.ctrlKey||e.metaKey))return;
  e.preventDefault(); const p=canvasPt(e); if(p)zoomTo(ZOOM.k*(e.deltaY<0?1.15:1/1.15),p.x,p.y);
},{passive:false});

/* ---- tap to place, and marker mode ---- */
let PLACE=null;
function placeStart(t){ PLACE={t,sticky:t==="marker"}; inkDraw=null; selObj=null; showSet=false; closeSheet(); keepScroll(()=>renderSketch()) }
function placeBar(){
  if(!PLACE)return "";
  const sk=curSk(), nm=SHAPENAME(PLACE.t);
  return `<div class="polybar"><span>${PLACE.sticky
      ? "Marker mode: each tap places the next number, "+nextMarkerNo(sk)+" is next"
      : "Tap the page where the "+esc(nm.toLowerCase())+" goes"}</span>
    <button data-placectr="1">${PLACE.sticky?"One in the centre":"Put it in the centre"}</button>
    <button data-placex="1">${PLACE.sticky?"Done":"Cancel"}</button></div>`;
}
function placeAt(x,y){
  const sk=curSk(); if(!sk||!PLACE)return;
  const t=PLACE.t; addObj(t); const o=objAt(selObj); if(!o)return;
  if(t==="marker"){o.x=snapVal(x-o.w/2); o.y=snapVal(y-o.h*.96)}       // the pointer's tip sits on the spot
  else {o.x=snapVal(x-o.w/2); o.y=snapVal(y-o.h/2)}
  if(!PLACE.sticky)PLACE=null;
  saveLocal(); keepScroll(()=>renderSketch());
}

/* ---- the toolbar, grouped ---- */
function groupSheet(sk,g){
  const b=(attr,label,on)=>`<button class="btn sec${on?" on":""}" ${attr} style="max-width:none">${label}</button>`;
  const bg=sk.bg&&(sk.bg.data||sk.bg.imgId);
  const body=g==="draw"?[
      b('data-skmark="1"',"Marker mode — a numbered marker on every tap"),
      b('data-skmeas="1"',"Place by measurement"),
      b('data-skwalls="1"',"Walls by dimension"),
      b('data-add="poly"',"Outline an area"),
      b('data-sktpl="1"',"Templates"),
      b('data-skink="1"',"Freehand with the Pencil"),
      b('data-skmulti="1"',"Select several"),
      b('data-skguide="1"',"How to sketch a scene")]
    :g==="view"?[
      b('data-sksnap="'+(snapOn?0:1)+'"',snapOn?"Snap is on":"Snap is off",snapOn),
      b('data-skgrid="'+(skGrid?0:1)+'"',skGrid?"Grid is on":"Grid is off",skGrid),
      measRows(sk).length?b('data-skmeasl="1"',sk.showMeas?"Measurement lines are shown":"Measurement lines are hidden",sk.showMeas):"",
      b('data-skrot="1"',sk.portrait?"Switch to a landscape page":"Switch to a portrait page"),
      b('data-zoom="fit"',"Fit the page (pinch or ctrl-scroll to zoom)"),
      b('data-skrotsnap="'+(rotSnap?0:1)+'"',rotSnap?"Rotation snaps to right angles":"Rotation is free",rotSnap),
      b('data-skfull="1"',"Full screen")]
    :[
      b('data-skedit="1"',"Scene details"+(hasHeader(sk)?"":" — fill in the title block")),
      b('data-skscale="1"',scaleOf(sk)?"Scale: "+measure(sk,100)+" per 100 units":"Set the scale",!!scaleOf(sk)),
      b('data-skbg="1"',bg?"Backdrop":"Add a backdrop",!!bg),
      b('data-skcase="1"',"Save a case package"),
      b('data-skdel="1"',"Delete this sketch")];
  openSheet(`<h3>${{draw:"Draw",view:"View",scene:"Setup"}[g]}</h3>
    <div class="stackb">${body.join("")}
    <button class="btn sec" id="gx" style="max-width:none">Close</button></div>`);
  $("#gx").onclick=closeSheet;
}
const SHEET_PASS="[data-skmark],[data-skmeas],[data-skwalls],[data-add],[data-sktpl],[data-sksnap],[data-skgrid],[data-skmeasl],[data-skrot],[data-zoom],[data-skfull],[data-skedit],[data-skscale],[data-skbg],[data-skcase],[data-skdel],[data-skink],[data-skmulti],[data-skguide],[data-skrotsnap]";

/* ---- symbols in a sheet, so the page stays in view on a phone ---- */
let palSheetCat=0, palSheetQ="";
function palSheet(){
  const draw=()=>{
    const q=palSheetQ.trim().toLowerCase(), hits=[];
    if(q)PALETTE.forEach(([g,l])=>l.forEach(([t,nm])=>{
      if(nm.toLowerCase().includes(q)||g.toLowerCase().includes(q)||t.includes(q))hits.push([t,nm])}));
    const quick=favs().concat(recents().filter(t=>!favs().includes(t))).filter(t=>SHAPES[t]).map(t=>[t,SHAPENAME(t)]);
    if(palSheetCat===-1&&!quick.length)palSheetCat=0;
    const list=q?hits:(palSheetCat===-1?quick:PALETTE[palSheetCat][1]);
    openSheet(`<h3>Symbols</h3>
      <div class="palsearch"><input type="text" id="psq" placeholder="Search symbols" value="${esc(palSheetQ)}" autocomplete="off" autocapitalize="off"></div>
      ${q?"":`<div class="filters wrap">${quick.length?`<button data-pscat="-1" class="${palSheetCat===-1?"sel":""}">Favourites</button>`:""}
        ${PALETTE.map(([c],ix)=>`<button data-pscat="${ix}" class="${ix===palSheetCat?"sel":""}">${esc(c)}</button>`).join("")}</div>`}
      <div class="palette">${list.map(([t,nm])=>`<button data-add="${t}"><span class="pv">${palPreview(t)}</span><span class="pn">${esc(nm)}</span></button>`).join("")}</div>
      ${list.length?"":`<p class="hint">Nothing matches that.</p>`}
      <p class="hint">Tap a symbol, then tap the page where it goes.</p>
      <button class="btn sec" id="psx" style="max-width:none">Close</button>`);
    $("#psx").onclick=closeSheet;
    $$("[data-pscat]").forEach(b=>b.onclick=()=>{palSheetCat=+b.dataset.pscat;draw()});
    const inp=$("#psq");
    inp.oninput=()=>{palSheetQ=inp.value; const at=inp.selectionStart; draw();
      const el=$("#psq"); if(el){el.focus(); try{el.setSelectionRange(at,at)}catch(_){}}};
  };
  draw();
}

/* ---- measure by tapping the two fixed points ---- */
let measPick=null, MEASPRE=null;
function measPickStart(sk,o){ measPick={o,step:"a",a:null}; closeSheet(); selObj=o.id; keepScroll(()=>renderSketch()) }
function measPickBar(){
  if(!measPick)return "";
  return `<div class="polybar"><span>${measPick.step==="a"?"Tap fixed point A on the sketch":"Now tap fixed point B"}
    — a reference point, a baseline end, a marker, or a corner of a named wall</span>
    <button data-measpickx="1">Cancel</button></div>`;
}
function nearestRef(sk,p,exclude){
  let best=null, bd=Math.max(24,handleU());
  refPoints(sk,exclude).forEach(r=>{const q=refPt(sk,r.key); if(!q)return;
    const d=Math.hypot(q.x-p.x,q.y-p.y); if(d<bd){bd=d;best=r}});
  return best;
}

/* ---- move everything on a layer ---- */
let layerMove=null;
function layerMoveStart(sk,L){
  if(L.locked)return toast(L.name+" is locked");
  layerMove={id:L.id,name:L.name}; closeSheet(); selObj=null; keepScroll(()=>renderSketch());
}
function layerMoveBar(){
  if(!layerMove)return "";
  return `<div class="polybar"><span>Drag anywhere on the page to move everything on ${esc(layerMove.name)}</span>
    <button data-laymovex="1">Done</button></div>`;
}

/* ---- when saving fails, say so ---- */
var SAVEFAIL=false;   // var, because the first save happens before this block runs
function saveFailed(on){
  try{
  if(on===!!SAVEFAIL)return; SAVEFAIL=on;
  let bar=document.getElementById("savefail");
  if(!on){ if(bar)bar.remove(); toast("Saving works again"); return }
  if(!bar){ bar=document.createElement("div"); bar.id="savefail"; document.body.prepend(bar) }
  bar.innerHTML=`<span><b>Changes are not being saved.</b> This device's storage for the app is full or
    blocked, and nothing entered since this appeared will survive a reload. Save a case package now,
    then free space by deleting old sketches or photographs.</span>
    <button id="sfcase">Save case package</button><button id="sfdata">Storage</button>`;
  $("#sfcase").onclick=()=>exportCasePackage("all","fsu-all");
  $("#sfdata").onclick=()=>go("data");
  }catch(e){ console.error("save warning failed",e) }
}

/* ---- a bad object must not blank the sketch ---- */
function objSVG(o,sel){
  try{ const s=objSVGRaw(o,sel); return (multi&&multi.ids.has(o.id))?s.replace(/<\/g>\s*$/,`<rect width="${o.w}" height="${o.h}" class="k-msel"/></g>`):s }
  catch(err){
    console.error("object failed to draw",o&&o.id,err);
    const w=(+o.w>0?o.w:60), h=(+o.h>0?o.h:40);
    return `<g data-obj="${o.id}" transform="translate(${+o.x||0},${+o.y||0})"><rect width="${w}" height="${h}" class="k-broken"/>
      <text x="4" y="${h/2+4}" class="k-brokent">Could not draw ${esc(SHAPENAME(o.t||"object"))}</text></g>`;
  }
}
const SKETCH_V=2;
function repairSketch(sk){
  let fixed=0; const num=(v,d)=>(typeof v==="number"&&isFinite(v))?v:d;
  if(!Array.isArray(sk.objs)){sk.objs=[];fixed++}
  const before=sk.objs.length; sk.objs=sk.objs.filter(o=>o&&typeof o==="object"); fixed+=before-sk.objs.length;
  sk.objs.forEach(o=>{
    if(!o.id){o.id=newId();fixed++}
    if(!o.t||!(SHAPES[o.t]||o.t==="text"||o.t==="dim"||o.t==="legend")){o.t="rect";fixed++}
    const d=DEFSIZE[o.t]||[120,80];
    if(num(o.x,null)===null){o.x=0;fixed++} if(num(o.y,null)===null){o.y=0;fixed++}
    if(o.t==="dim"){ if(num(o.w,null)===null){o.w=d[0];fixed++} if(num(o.h,null)===null){o.h=0;fixed++} }
    else { if(!(num(o.w,0)>0)){o.w=d[0];fixed++} if(!(num(o.h,0)>0)){o.h=d[1];fixed++} }
    if(num(o.r,null)===null){o.r=0;fixed++}
    if((o.t==="poly"||o.t==="ink")&&(!Array.isArray(o.pts)||o.pts.length<(o.t==="ink"?2:3)||o.pts.some(p=>!Array.isArray(p)||!isFinite(+p[0])||!isFinite(+p[1])))){o.pts=o.t==="ink"?[[0,0],[1,1]]:[[0,0],[1,0],[1,1],[0,1]];fixed++}
    if(o.meas&&(!o.meas.a||!isFinite(+o.meas.da))){delete o.meas;fixed++}
  });
  layersOf(sk); if(sk.v!==SKETCH_V)sk.v=SKETCH_V;
  return fixed;
}

/* ---- case packages: the only copy of case material that leaves the device ---- */
async function casePackage(scope){
  const all=scope==="all";
  const incIds=new Set(); if(!all&&scope.incidentId)incIds.add(scope.incidentId);
  const sketches=(S.sketches||[]).filter(s=>all||s.id===scope.sketchId||(scope.incidentId&&s.incidentId===scope.incidentId));
  sketches.forEach(s=>{if(s.incidentId)incIds.add(s.incidentId)});
  const incs=incidents().filter(i=>all||incIds.has(i.id));
  const fills=(S.fills||[]).filter(f=>all||incIds.has(f.incidentId));
  const photoIds=new Set();
  sketches.forEach(s=>{ if(s.bg&&s.bg.imgId)photoIds.add(s.bg.imgId); (s.objs||[]).forEach(o=>{if(o.photoId)photoIds.add(o.photoId)}) });
  const photos={};
  for(const id of photoIds){ try{ const d=await photoGet(id); if(d)photos[id]=d }catch(e){} }
  return {fsuCase:1,version:APP_VERSION,exported:new Date().toISOString(),unit:S.vanName||"",incidents:incs,fills,sketches,photos,forms:S.forms||[]};
}
async function exportCasePackage(scope,label){
  toast("Gathering the case material…");
  let pkg; try{ pkg=await casePackage(scope) }catch(e){ return toast("Could not gather it: "+(e.message||e)) }
  const name=String(label||"case").replace(/[^a-z0-9]+/gi,"-").toLowerCase()+"-"+new Date().toISOString().slice(0,16).replace(/[:T]/g,"-")+".fsucase.json";
  const blob=new Blob([JSON.stringify(pkg)],{type:"application/json"});
  try{
    const file=new File([blob],name,{type:"application/json"});
    if(navigator.canShare&&navigator.canShare({files:[file]}))await navigator.share({files:[file],title:"FSU case package"});
    else dlBlob(blob,name);
  }catch(e){ if(e&&e.name==="AbortError")return; dlBlob(blob,name) }
  const now=new Date().toISOString(); S.lastCase=now;
  pkg.sketches.forEach(s=>{const sk=(S.sketches||[]).find(x=>x.id===s.id); if(sk)sk.packaged=now});
  saveLocal(); if(view==="data")renderData(); else if(view==="sketch")renderSketch();
  const np=Object.keys(pkg.photos).length;
  logAct("case","Saved a case package"); toast("Case package saved — "+pkg.sketches.length+" sketch"+(pkg.sketches.length===1?"":"es")+", "+np+" photograph"+(np===1?"":"s")+". Put it in the case file.");
}
async function importCasePackage(text){
  let pkg; try{pkg=JSON.parse(text)}catch(e){return toast("That isn't a case package")}
  if(!pkg||pkg.fsuCase!==1)return toast("That isn't a case package");
  let n=0;
  const merge=key=>{ S[key]=S[key]||[]; (pkg[key]||[]).forEach(r=>{ if(!r||!r.id)return;
    const i=S[key].findIndex(x=>x.id===r.id); if(i>-1)S[key][i]=r; else S[key].push(r); n++ }) };
  merge("incidents"); merge("fills"); merge("sketches");
  S.forms=S.forms||[]; (pkg.forms||[]).forEach(f=>{ if(f&&f.id&&!S.forms.some(x=>x.id===f.id))S.forms.push(f) });
  let np=0; for(const id in (pkg.photos||{})){ try{ await photoPut(id,pkg.photos[id]); np++ }catch(e){} }
  saveLocal(); render();
  toast("Restored "+n+" record"+(n===1?"":"s")+" and "+np+" photograph"+(np===1?"":"s"));
}
function caseNag(sk){
  if(!sk.updated||!(sk.objs||[]).length)return "";
  if(sk.packaged&&sk.packaged>=sk.updated)return "";
  const age=Date.now()-Date.parse(sk.updated); if(!(age>6*3600000))return "";
  return `<div class="unver">Changed ${Math.round(age/3600000)} hours ago and not in any case package since. Save one from Setup before the shift ends.</div>`;
}

/* ---- hooks ---- */
function sketchExtraClick2(e,skc){
  const t=e.target;
  if(t.closest("#sheet")&&t.closest(SHEET_PASS))closeSheet();   // a choice made from a group sheet
  const z=t.closest("[data-zoom]");
  if(z){const m=z.dataset.zoom; zoomTo(m==="in"?ZOOM.k*1.4:m==="out"?ZOOM.k/1.4:1); return true}
  if(t.closest("[data-placectr]")){ if(PLACE&&skc){const st=PLACE.sticky; addObj(PLACE.t); if(!st)PLACE=null; keepScroll(()=>renderSketch())} return true }
  if(t.closest("[data-placex]")){ PLACE=null; keepScroll(()=>renderSketch()); return true }
  if(t.closest("[data-measpickx]")){ measPick=null; keepScroll(()=>renderSketch()); return true }
  if(t.closest("[data-laymovex]")){ layerMove=null; keepScroll(()=>renderSketch()); return true }
  if(!skc)return false;
  const g=t.closest("[data-skgrp]"); if(g){ groupSheet(skc,g.dataset.skgrp); return true }
  if(t.closest("[data-sksym]")){ palSheet(); return true }
  if(t.closest("[data-skmark]")){ placeStart("marker"); return true }
  if(t.closest("[data-skcase]")){
    const inc=skc.incidentId&&incidentOf(skc.incidentId);
    exportCasePackage(inc?{incidentId:inc.id}:{sketchId:skc.id},(inc&&inc.caseNo)||skc.caseNo||"sketch"); return true }
  const ad=t.closest("[data-add]");
  if(ad&&ad.dataset.add!=="poly"){ placeStart(ad.dataset.add); return true }
  return false;
}
function extraPointerDown2(e,svg,p){
  const sk=curSk(); if(!sk)return false;
  if(PLACE){ placeAt(p.x,p.y); e.preventDefault(); return true }
  if(measPick){
    const r=nearestRef(sk,p,measPick.o.id);
    if(!r)toast("No fixed point there — tap a reference point, a baseline end, a marker, or the corner of a named wall");
    else if(measPick.step==="a"){ measPick.a=r.key; measPick.step="b"; toast(r.name+" is A"); keepScroll(()=>renderSketch()) }
    else if(r.key===measPick.a)toast("B needs to be a different point from A");
    else { const o=measPick.o, a=measPick.a; measPick=null; MEASPRE={a,b:r.key,m:(o.meas&&o.meas.m!=="polar")?o.meas.m:"tri"}; renderSketch(); measSheet(sk,o) }
    e.preventDefault(); return true }
  if(layerMove){
    const ls=layersOf(sk), objs=(sk.objs||[]).filter(o=>(o.lay||ls[0].id)===layerMove.id);
    if(!objs.length){toast("Nothing on that layer"); layerMove=null; renderSketch(); return true}
    pushUndo(sk); drag={mode:"laymove",objs,start:objs.map(o=>[o.x,o.y]),px:p.x,py:p.y};
    try{svg.setPointerCapture&&svg.setPointerCapture(e.pointerId)}catch(_){}
    e.preventDefault(); return true }
  if(polyDraw)return false;
  if(!e.target.closest("[data-obj],[data-handle],[data-rot],[data-vtx]")){
    drag={mode:"pan",sx:e.clientX,sy:e.clientY,x:ZOOM.x,y:ZOOM.y,moved:false};
    try{svg.setPointerCapture&&svg.setPointerCapture(e.pointerId)}catch(_){}
    e.preventDefault(); return true }
  return false;
}
function extraPointerMove2(e,p,o){
  if(drag.mode==="pan"){
    const dx=e.clientX-drag.sx, dy=e.clientY-drag.sy;
    if(Math.hypot(dx,dy)>4)drag.moved=true;
    if(ZOOM.k>1){ const u=unitsPerPx(); ZOOM.x=drag.x-dx*u; ZOOM.y=drag.y-dy*u; zoomApply() }
    e.preventDefault(); return true }
  if(drag.mode==="laymove"){
    const dx=p.x-drag.px, dy=p.y-drag.py;
    drag.objs.forEach((q,i)=>{ q.x=drag.start[i][0]+dx; q.y=drag.start[i][1]+dy;
      const g=document.querySelector(`[data-obj="${q.id}"]`);
      if(g)g.setAttribute("transform",`translate(${q.x},${q.y}) rotate(${q.r||0} ${q.w/2} ${q.h/2})`)});
    e.preventDefault(); return true }
  return false;
}
function extraPointerUp(o){
  if(drag.mode==="vtx"){polyNormalize(o);drag=null;saveLocal();renderSketch();return true}
  if(drag.mode==="pan"){ const moved=drag.moved; drag=null;
    if(!moved&&selObj){selObj=null;renderSketch()} return true }
  if(drag.mode==="laymove"){ drag.objs.forEach(q=>{q.x=Math.round(q.x);q.y=Math.round(q.y)}); drag=null; saveLocal(); renderSketch(); return true }
  return false;
}
document.addEventListener("keydown",e=>{
  if(view!=="sketch")return;
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test((e.target||{}).tagName||"");
  if(e.key==="Escape"){ if(PLACE||measPick||layerMove||inkDraw||multi){PLACE=null;measPick=null;layerMove=null;inkDraw=null;multi=null;renderSketch()} return }
  if(typing||($("#sheet")&&$("#sheet").classList.contains("on")))return;
  if(e.key==="+"||e.key==="="){zoomTo(ZOOM.k*1.25);e.preventDefault()}
  else if(e.key==="-"||e.key==="_"){zoomTo(ZOOM.k/1.25);e.preventDefault()}
  else if(e.key==="0"){zoomTo(1);e.preventDefault()}
  else if(e.key==="m"||e.key==="M"){placeStart("marker")}
});


