/* ---------- sketch extensions, round three ----------
   render split, error log, installable, rotation snap, freehand ink, camera from a photo point,
   live distances, select several, saved tick, undo that survives a reload, a first-sketch guide. */

/* 1. only the regions whose markup changed are touched, so nothing flickers or loses its scroll */
function patchSketchView(html){
  const root=$("#v-sketch");
  const key=(curSketch||"")+"|"+(skFull?1:0)+"|"+(skTools?1:0);
  const t=document.createElement("template"); t.innerHTML=html;
  if(root.dataset.skkey!==key||!root.querySelector("#skrail")){ root.innerHTML=html; root.dataset.skkey=key; return }
  ["skhead","skedit","skbars","skpanel","skrail"].forEach(id=>{
    const a=root.querySelector("#"+id), b=t.content.querySelector("#"+id);
    if(a&&b&&a.innerHTML!==b.innerHTML)a.innerHTML=b.innerHTML });
  const ca=root.querySelector(".canvaswrap"), cb=t.content.querySelector(".canvaswrap");
  if(ca&&cb&&ca.innerHTML!==cb.innerHTML)ca.innerHTML=cb.innerHTML;
}

/* 2. nothing fails silently: a toast for the user, a list for whoever maintains the app */
function logErr(msg){
  try{ S.errors=(S.errors||[]).slice(-19);
    S.errors.push({t:new Date().toISOString(),m:String(msg).slice(0,300),v:typeof view==="string"?view:""});
    saveLocal() }catch(_){}
  try{ toast("Something went wrong and that last action may not have taken. It is noted under Settings.") }catch(_){}
}
window.addEventListener("error",e=>logErr((e.message||"Error")+" at "+String(e.filename||"").split("/").pop()+":"+(e.lineno||0)));
window.addEventListener("unhandledrejection",e=>logErr("Promise: "+((e.reason&&e.reason.message)||e.reason)));

/* 3. installable: a service worker when served over http, so it opens from the home screen and works offline */
if("serviceWorker" in navigator&&/^https?:/.test(location.protocol)){
  try{ navigator.serviceWorker.register("sw.js").catch(()=>{}) }catch(_){}
}
const isStandalone=()=>!!((window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||navigator.standalone);

/* 5. rotation snaps to right angles on touch, where there is no shift key */
let rotSnap=true;

/* 7. freehand with the Pencil */
let inkDraw=null;
function inkStart(){ inkDraw={pen:!!S.penSeen,col:""}; selObj=null; showSet=false; PLACE=null; closeSheet(); keepScroll(()=>renderSketch()) }
function inkBar(){
  if(!inkDraw)return "";
  return `<div class="polybar"><span>${inkDraw.pen?"Freehand: draw with the Pencil. Fingers pan and pinch.":"Freehand: draw with the Pencil or a finger."}</span>
    <span class="inkrow" style="margin:0"><span class="inklab">Colour</span>${INKS.map(([k,nm,hex])=>`<button class="ink${(inkDraw.col||"")===k?" on":""}" data-inkcol="${k}" title="${nm}" aria-label="${nm}" style="background:${hex}"></button>`).join("")}</span>
    <button data-inkpen="${inkDraw.pen?0:1}"${inkDraw.pen?' class="on"':''}>Pencil only</button>
    <button data-inkx="1">Done</button></div>`;
}
const inkPath=pts=>pts.map((p,i)=>(i?"L":"M")+(+p[0]).toFixed(1)+" "+(+p[1]).toFixed(1)).join(" ");
function simplify(pts,tol){
  if(pts.length<3)return pts;
  const d2=(p,a,b)=>{const dx=b[0]-a[0], dy=b[1]-a[1], l2=dx*dx+dy*dy;
    let t=l2?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l2:0; t=Math.max(0,Math.min(1,t));
    const x=a[0]+t*dx-p[0], y=a[1]+t*dy-p[1]; return x*x+y*y};
  const out=[pts[0]];
  const rec=(s,e)=>{ let mi=-1, md=0;
    for(let i=s+1;i<e;i++){const d=d2(pts[i],pts[s],pts[e]); if(d>md){md=d;mi=i}}
    if(md>tol*tol){rec(s,mi);rec(mi,e)} else out.push(pts[e]) };
  rec(0,pts.length-1); return out;
}
function inkFinish(pts,col){
  const sk=curSk(); if(!sk||!pts||!pts.length)return;
  if(pts.length===1)pts.push([pts[0][0]+2,pts[0][1]+2]);
  pts=simplify(pts,1.2);
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
  const x0=Math.min(...xs), y0=Math.min(...ys);
  const w=Math.max(8,Math.max(...xs)-x0), h=Math.max(8,Math.max(...ys)-y0);
  const ls=layersOf(sk), target=(curLayer&&ls.some(l=>l.id===curLayer))?curLayer:ls[ls.length-1].id;
  pushUndo(sk);
  sk.objs.push({id:newId(),t:"ink",lay:target,x:Math.round(x0),y:Math.round(y0),w:Math.round(w),h:Math.round(h),r:0,
    label:"",ar:w/h,ink:col||"",pts:pts.map(p=>[+((p[0]-x0)/w).toFixed(4),+((p[1]-y0)/h).toFixed(4)])});
  saveLocal(); renderSketch();
}
SHAPES.ink=(w,hh,o)=>{
  const pts=(o&&o.pts&&o.pts.length>=2)?o.pts:[[0,.8],[.2,.15],[.4,.7],[.6,.2],[.8,.75],[1,.3]];
  return `<path d="${pts.map((p,i)=>(i?"L":"M")+(p[0]*w).toFixed(1)+" "+(p[1]*hh).toFixed(1)).join(" ")}" class="k-ink"/>`;
};

/* 9. live distances while a measured object moves, and the record follows where it is dropped */
function measGeom(sk,o){
  const m=o.meas||{}, A=refPt(sk,m.a), B=refPt(sk,m.b); if(!A)return m;
  const P=objPt(o,.5,.5), u=(sk.scale&&sk.scale.unit)||"ft";
  const rnd=v=>u==="ft"?Math.round(v*12)/12:Math.round(v*100)/100;
  const g=Object.assign({},m);
  if(m.m==="polar"){ g.da=rnd(pxReal(sk,Math.hypot(P.x-A.x,P.y-A.y)));
    g.ang=Math.round(((Math.atan2(P.x-A.x,-(P.y-A.y))*180/Math.PI)%360+360)%360); return g }
  if(!B)return m;
  if(m.m==="tri"){ g.da=rnd(pxReal(sk,Math.hypot(P.x-A.x,P.y-A.y))); g.db=rnd(pxReal(sk,Math.hypot(P.x-B.x,P.y-B.y)));
    g.side=((P.x-A.x)*(B.y-A.y)-(P.y-A.y)*(B.x-A.x))>0?"l":"r"; return g }
  const dx=B.x-A.x, dy=B.y-A.y, d=Math.hypot(dx,dy)||1, ux=dx/d, uy=dy/d;
  const along=(P.x-A.x)*ux+(P.y-A.y)*uy, out=(P.x-A.x)*uy-(P.y-A.y)*ux;
  g.da=rnd(pxReal(sk,along)); g.db=rnd(pxReal(sk,Math.abs(out))); g.side=out>0?"l":"r"; return g;
}
function measFromGeometry(sk,o){
  if(!o.meas||!scaleOf(sk))return;
  const g=measGeom(sk,o); if(g===o.meas)return;
  o.meas=g; toast("Measurement updated to where it sits now — Undo puts it back");
}

/* 10. select several: tap to add, drag across the page, then move, recolour, duplicate or delete */
let multi=null;
function multiStart(){ multi={ids:new Set(selObj?[selObj]:[])}; selObj=null; showSet=false; PLACE=null; closeSheet(); keepScroll(()=>renderSketch()) }
function multiBar(){
  if(!multi)return "";
  const n=multi.ids.size;
  return `<div class="polybar"><span>${n?n+" selected — drag one of them to move them all, tap one to drop it from the selection":"Tap objects, or drag across the page, to select several"}</span>
    ${n?`<span class="inkrow" style="margin:0"><span class="inklab">Colour</span>${INKS.map(([k,nm,hex])=>`<button class="ink" data-mink="${k}" title="${nm}" aria-label="${nm}" style="background:${hex}"></button>`).join("")}</span>
    <button data-mdup="1">Duplicate</button><button data-mdel="1">Delete</button>`:""}
    <button data-multix="1">Done</button></div>`;
}
function multiObjs(sk){ return (sk.objs||[]).filter(q=>multi&&multi.ids.has(q.id)) }
function multiDelete(){ const sk=curSk(); if(!sk||!multi||!multi.ids.size)return;
  pushUndo(sk); const n=multi.ids.size; sk.objs=sk.objs.filter(q=>!multi.ids.has(q.id)); multi.ids.clear();
  saveLocal(); renderSketch(); toast(n+" removed — Undo brings them back") }

/* 11. a quiet tick when a save lands */
var TICKT=null;
function savedTick(){
  try{ const el=document.getElementById("savedtick"); if(!el)return;
    el.textContent="Saved"; el.classList.add("on"); clearTimeout(TICKT); TICKT=setTimeout(()=>el.classList.remove("on"),1400) }catch(_){}
}

/* 12. undo that survives a reload: the last few snapshots, kept apart from the main store */
function persistUndo(sk){
  try{ const st=(UNDO[sk.id]||[]).slice(-6), s=JSON.stringify(st);
    if(s.length>400000)return; localStorage.setItem("fsu-undo-"+sk.id,s) }catch(_){}
}
function loadUndo(sk){
  try{ const s=localStorage.getItem("fsu-undo-"+sk.id);
    if(s){const st=JSON.parse(s); if(Array.isArray(st)&&st.length)UNDO[sk.id]=st} }catch(_){}
}

/* 13. the first sketch, five steps */
function guideSheet(){
  const step=(n,b,t)=>`<div class="guidestep"><div class="gn">${n}</div><p><b>${b}</b> ${t}</p></div>`;
  openSheet(`<h3>How to sketch a scene</h3>
    ${step(1,"Set the scale.","Setup › Set the scale. Draw a dimension across something you measured, then type its length. Or use Walls by dimension and the scale sets itself.")}
    ${step(2,"Fix two points.","Place two reference points on things that will still be there next year — a corner of the building, a utility pole. Everything is measured from them.")}
    ${step(3,"Mark the evidence.","Draw › Marker mode, then tap each item. The numbers write themselves into the evidence log. Name each marker in its panel.")}
    ${step(4,"Measure.","Select a marker, Place by measurement, tap the two fixed points, type the tape distances. The marker moves to where they meet and the measurements print with the sketch.")}
    ${step(5,"Export.","Setup › Scene details fills the title block. Export makes the PDF; a case package carries everything to the case file.")}
    <p class="hint">Pinch to zoom. Freehand with the Pencil for the rough sketch, then tidy it with symbols.</p>
    <button class="btn" id="gdx" style="max-width:none;margin:0">Got it</button>`);
  $("#gdx").onclick=()=>{S.sketchGuideSeen=true;saveLocal();closeSheet()};
}

/* ---- hooks, checked before round two's ---- */
function sketchExtraClick3(e,skc){
  const t=e.target;
  if(t.closest("[data-inkx]")){ inkDraw=null; keepScroll(()=>renderSketch()); return true }
  if(t.closest("[data-multix]")){ multi=null; keepScroll(()=>renderSketch()); return true }
  const ip=t.closest("[data-inkpen]"); if(ip){ if(inkDraw)inkDraw.pen=ip.dataset.inkpen==="1"; keepScroll(()=>renderSketch()); return true }
  const ic=t.closest("[data-inkcol]"); if(ic){ if(inkDraw)inkDraw.col=ic.dataset.inkcol; keepScroll(()=>renderSketch()); return true }
  if(!skc)return false;
  const rl=t.closest("[data-orotlock]"); if(rl){ const o=objAt(rl.dataset.orotlock); if(o){ o.lockR=!o.lockR; saveLocal(); keepScroll(()=>renderSketch()); toast(o.lockR?"Rotation locked":"Rotation unlocked") } return true }
  const ad=t.closest("[data-add]");
  if(ad&&ad.dataset.add==="ink"){ inkStart(); return true }
  // any other tool ends freehand, so the next tap places rather than draws
  if(inkDraw&&(ad||t.closest("[data-skmark],[data-skmeas],[data-skwalls],[data-sktpl],[data-skmulti],[data-add]")))inkDraw=null;
  if(t.closest("[data-skink]")){ inkStart(); return true }
  if(t.closest("[data-skmulti]")){ multiStart(); return true }
  if(t.closest("[data-skguide]")){ closeSheet(); guideSheet(); return true }
  const rs=t.closest("[data-skrotsnap]"); if(rs){ rotSnap=rs.dataset.skrotsnap==="1"; toast(rotSnap?"Rotation snaps to right angles":"Rotation is free"); return true }
  const mk=t.closest("[data-mink]");
  if(mk&&multi){ const objs=multiObjs(skc); if(objs.length){pushUndo(skc); objs.forEach(q=>q.ink=mk.dataset.mink); saveLocal(); keepScroll(()=>renderSketch())} return true }
  if(t.closest("[data-mdup]")&&multi){ const objs=multiObjs(skc); if(!objs.length)return true; pushUndo(skc);
    const ids=new Set(); objs.forEach(q=>{const c=Object.assign({},q,{id:newId(),x:q.x+24,y:q.y+24}); delete c.meas; delete c.photoId;
      if(c.t==="marker")c.n=String(nextMarkerNo(skc)); if(c.t==="photopoint")c.n=String(nextPhotoNo(skc)); skc.objs.push(c); ids.add(c.id)});
    multi.ids=ids; saveLocal(); keepScroll(()=>renderSketch()); toast(objs.length+" duplicated — the copies are selected"); return true }
  if(t.closest("[data-mdel]")&&multi){ multiDelete(); return true }
  return false;
}
function extraPointerDown3(e,svg,p){
  const sk=curSk(); if(!sk)return false;
  if(inkDraw){
    if(e.pointerType==="pen"&&!S.penSeen){ S.penSeen=true; inkDraw.pen=true; saveLocal();
      toast("Pencil detected — fingers now pan and pinch while you draw"); keepScroll(()=>renderSketch());
      svg=document.getElementById("skcanvas") }
    if(inkDraw.pen&&e.pointerType!=="pen")return false;
    drag={mode:"ink",pts:[[p.x,p.y]],col:inkDraw.col||""};
    svg.insertAdjacentHTML("beforeend",`<path id="inkdraw" d="M${p.x.toFixed(1)} ${p.y.toFixed(1)}" class="k-ink" style="--kc:${inkHex(drag.col)}"/>`);
    try{svg.setPointerCapture&&svg.setPointerCapture(e.pointerId)}catch(_){}
    e.preventDefault(); return true }
  if(multi){
    const gEl=e.target.closest("[data-obj]");
    if(gEl){ const o=objAt(gEl.dataset.obj); if(!o)return true;
      if(layerLocked(sk,o)){toast("Layer is locked");return true}
      if(!multi.ids.has(o.id)){ multi.ids.add(o.id); keepScroll(()=>renderSketch()); e.preventDefault(); return true }
      const objs=multiObjs(sk); pushUndo(sk);
      drag={mode:"laymove",objs,start:objs.map(q=>[q.x,q.y]),px:p.x,py:p.y,tap:true,tapId:o.id,moved:false};
      try{svg.setPointerCapture&&svg.setPointerCapture(e.pointerId)}catch(_){}
      e.preventDefault(); return true }
    drag={mode:"marquee",x0:p.x,y0:p.y,x1:p.x,y1:p.y};
    svg.insertAdjacentHTML("beforeend",`<rect id="marquee" class="k-marquee" x="${p.x}" y="${p.y}" width="0" height="0"/>`);
    try{svg.setPointerCapture&&svg.setPointerCapture(e.pointerId)}catch(_){}
    e.preventDefault(); return true }
  return false;
}
function extraPointerMove3(e,p,o){
  if(drag.mode==="ink"){
    const pts=drag.pts, last=pts[pts.length-1];
    if(Math.hypot(p.x-last[0],p.y-last[1])>=1){ pts.push([p.x,p.y]); const el=document.getElementById("inkdraw"); if(el)el.setAttribute("d",inkPath(pts)) }
    e.preventDefault(); return true }
  if(drag.mode==="marquee"){
    drag.x1=p.x; drag.y1=p.y; const el=document.getElementById("marquee");
    if(el){ el.setAttribute("x",Math.min(drag.x0,p.x)); el.setAttribute("y",Math.min(drag.y0,p.y));
      el.setAttribute("width",Math.abs(p.x-drag.x0)); el.setAttribute("height",Math.abs(p.y-drag.y0)) }
    e.preventDefault(); return true }
  if(drag.mode==="laymove"&&drag.tap&&Math.hypot(p.x-drag.px,p.y-drag.py)>3)drag.moved=true;
  return false;
}
function extraPointerUp3(o){
  if(drag.mode==="ink"){ const pts=drag.pts, col=drag.col; drag=null;
    const el=document.getElementById("inkdraw"); if(el)el.remove(); inkFinish(pts,col); return true }
  if(drag.mode==="marquee"){
    const sk=curSk(), x0=Math.min(drag.x0,drag.x1), x1=Math.max(drag.x0,drag.x1), y0=Math.min(drag.y0,drag.y1), y1=Math.max(drag.y0,drag.y1);
    drag=null; const el=document.getElementById("marquee"); if(el)el.remove();
    if(sk&&multi&&(x1-x0>4||y1-y0>4)){ let n=0; (sk.objs||[]).forEach(q=>{ if(layerLocked(sk,q))return;
        const c=objPt(q,.5,.5); if(c.x>=x0&&c.x<=x1&&c.y>=y0&&c.y<=y1){multi.ids.add(q.id);n++} });
      if(!n)toast("Nothing inside that box") }
    renderSketch(); return true }
  if(drag.mode==="laymove"&&drag.tap&&!drag.moved){
    if(multi)multi.ids.delete(drag.tapId); drag=null; const sk=curSk(); if(sk&&UNDO[sk.id]&&UNDO[sk.id].length)UNDO[sk.id].pop();
    renderSketch(); return true }
  return false;
}
document.addEventListener("keydown",e=>{
  if(view!=="sketch")return;
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test((e.target||{}).tagName||"");
  if(e.key==="Escape"){ if(inkDraw||multi){inkDraw=null;multi=null;renderSketch()} return }
  if(typing||($("#sheet")&&$("#sheet").classList.contains("on")))return;
  if(multi&&(e.key==="Delete"||e.key==="Backspace")){ multiDelete(); e.preventDefault() }
});


