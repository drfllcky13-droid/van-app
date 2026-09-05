/* ---------- sketch extensions ----------
   measurement entry (triangulation and baseline), walls by dimension, typed sizes,
   line types, area fills, outline areas, templates, DXF export, favourites, grid.
   Everything here hangs off hooks placed in the existing handlers; no new click listener. */

/* real-world lengths: accepts 12, 12.5, 12'4", 12 ft 4 in, 4 in, 3.2 m */
function parseLen(str,unit){
  const s=String(str||"").trim().toLowerCase().replace(/′/g,"'").replace(/″/g,'"');
  if(!s)return NaN;
  if((unit||"ft")==="ft"){
    let m=s.match(/^(-?\d+(?:\.\d+)?)\s*(?:'|ft\.?|feet|foot)?\s*(?:(\d+(?:\.\d+)?)\s*(?:"|in\.?|inch|inches)?)?$/);
    if(m)return parseFloat(m[1])+(m[2]?parseFloat(m[2])/12:0);
    m=s.match(/^(-?\d+(?:\.\d+)?)\s*(?:"|in\.?|inch|inches)$/);
    if(m)return parseFloat(m[1])/12;
    return NaN;
  }
  const n=parseFloat(s); return isNaN(n)?NaN:n;
}
const realPx=(sk,real)=>real/unitsPer(sk);
const pxReal=(sk,px)=>px*unitsPer(sk);
const fmtLen=(sk,px)=>measure(sk,px)||(Math.round(px)+" units");
/* a point on an object, as fractions of its box, with its rotation applied */
function objPt(o,fx,fy){
  const cx=o.x+o.w/2, cy=o.y+o.h/2, lx=o.w*(fx-.5), ly=o.h*(fy-.5);
  const a=(o.r||0)*Math.PI/180, c=Math.cos(a), s=Math.sin(a);
  return {x:cx+lx*c-ly*s, y:cy+lx*s+ly*c};
}
function dlBlob(blob,name){
  const u=URL.createObjectURL(blob);const a=document.createElement("a");
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),1500);
}

/* ---- measurement entry ---- */
const CORNERS={nw:[0,0],ne:[1,0],se:[1,1],sw:[0,1],a:[0,.5],b:[1,.5],c:[.5,.5]};
const STRUCT=new Set(["wall","room","building","rect","area","concretearea","tilearea"]);
function refPoints(sk,excludeId){
  const out=[];
  (sk.objs||[]).forEach(o=>{
    if(o.id===excludeId)return;
    const nm=(o.label||"").trim();
    if(o.t==="refpoint")out.push({key:o.id+":c",name:nm||"Reference point"});
    else if(o.t==="baseline"){
      out.push({key:o.id+":a",name:(nm||"Baseline")+" — start"});
      out.push({key:o.id+":b",name:(nm||"Baseline")+" — end"});}
    else if(o.t==="marker")out.push({key:o.id+":c",name:"Marker "+(o.n||"")+(nm?" "+nm:"")});
    else if(nm&&STRUCT.has(o.t))["nw","ne","se","sw"].forEach(k=>
      out.push({key:o.id+":"+k,name:nm+" — "+k.toUpperCase()+" corner"}));
    else if(nm&&o.t!=="text"&&o.t!=="legend"&&o.t!=="dim")out.push({key:o.id+":c",name:nm+" (centre)"});
  });
  return out;
}
function refPt(sk,key){
  const [id,w]=String(key||"").split(":");
  const o=(sk.objs||[]).find(x=>x.id===id); if(!o)return null;
  const f=CORNERS[w]||CORNERS.c; return objPt(o,f[0],f[1]);
}
function refName(sk,key){ const r=refPoints(sk).find(x=>x.key===key); return r?r.name:"a removed point" }
function solveMeas(sk,m){
  if(m.m==="polar"){ const A0=refPt(sk,m.a); if(!A0)return null;
    const d=realPx(sk,m.da), th=(+m.ang||0)*Math.PI/180; return {x:A0.x+Math.sin(th)*d, y:A0.y-Math.cos(th)*d} }
  const A=refPt(sk,m.a), B=refPt(sk,m.b); if(!A||!B)return null;
  const dx=B.x-A.x, dy=B.y-A.y, d=Math.hypot(dx,dy); if(d<1)return null;
  const ux=dx/d, uy=dy/d, nx=uy, ny=-ux;          // left of A->B on screen, where y runs down
  const sg=m.side==="r"?-1:1;
  const da=realPx(sk,m.da), db=realPx(sk,m.db);
  if(m.m==="base")return {x:A.x+ux*da+nx*db*sg, y:A.y+uy*da+ny*db*sg};
  if(d>da+db+0.5||d<Math.abs(da-db)-0.5)return null;
  const a=(da*da-db*db+d*d)/(2*d), h=Math.sqrt(Math.max(0,da*da-a*a));
  return {x:A.x+ux*a+nx*h*sg, y:A.y+uy*a+ny*h*sg};
}
function measSheet(sk,o){
  if(!scaleOf(sk)){toast("Set the scale first, so the distances mean something");return scaleSheet(sk)}
  const refs=refPoints(sk,o.id);
  if(!refs.length)return toast("A fixed point is needed first — place reference points, a baseline, or name a wall");
  const u=sk.scale.unit||"ft";
  const m=Object.assign({},o.meas||{},MEASPRE||{}); MEASPRE=null;
  let mode=m.m||"tri";
  const opt=sel=>refs.map(r=>`<option value="${r.key}"${r.key===sel?" selected":""}>${esc(r.name)}</option>`).join("");
  const sideSel=`<select id="mside">
      <option value="l"${m.side!=="r"?" selected":""}>Left, standing at A looking at B</option>
      <option value="r"${m.side==="r"?" selected":""}>Right, standing at A looking at B</option></select>`;
  const draw=()=>{
    openSheet(`<h3>Place by measurement</h3>
    <p class="hint" style="margin:0 0 12px">${esc(o.label||SHAPENAME(o.t))}${o.n?" "+esc(o.n):""} moves to where the tape measurements meet. The measurements print with the sketch.</p>
    <div class="seg three" style="margin-bottom:12px">
      <button id="mmtri"${mode==="tri"?' class="on"':''}>Triangulation</button>
      <button id="mmbase"${mode==="base"?' class="on"':''}>Baseline</button>
      <button id="mmpolar"${mode==="polar"?' class="on"':''}>Bearing</button></div>
    ${mode==="polar"?`
      <label class="fld"><span>From point A</span><select id="mra">${opt(m.a||refs[0].key)}</select></label>
      <label class="fld"><span>Distance from A (${u})</span>
        <input type="text" id="mda" inputmode="decimal" value="${esc(m.da==null?"":m.da)}"></label>
      <label class="fld"><span>Bearing from A, in degrees clockwise from the top of the page</span>
        <input type="text" id="mang" inputmode="decimal" value="${esc(m.ang==null?"":m.ang)}" placeholder="0 is up the page, 90 is to the right"></label>`
    :mode==="tri"?`
      <label class="fld"><span>Point A</span><select id="mra">${opt(m.a||refs[0].key)}</select></label>
      <label class="fld"><span>Distance from A (${u})</span>
        <input type="text" id="mda" inputmode="decimal" value="${esc(m.da==null?"":m.da)}" placeholder="${u==="ft"?"12' 4&quot;":"3.75"}"></label>
      <label class="fld"><span>Point B</span><select id="mrb">${opt(m.b||(refs[1]||refs[0]).key)}</select></label>
      <label class="fld"><span>Distance from B (${u})</span>
        <input type="text" id="mdb" inputmode="decimal" value="${esc(m.db==null?"":m.db)}"></label>
      <label class="fld"><span>Which side of the line from A to B</span>${sideSel}</label>`
    :`
      <label class="fld"><span>Baseline start, A</span><select id="mra">${opt(m.a||refs[0].key)}</select></label>
      <label class="fld"><span>Baseline end, B</span><select id="mrb">${opt(m.b||(refs[1]||refs[0]).key)}</select></label>
      <label class="fld"><span>Along the baseline from A (${u})</span>
        <input type="text" id="mda" inputmode="decimal" value="${esc(m.da==null?"":m.da)}"></label>
      <label class="fld"><span>Out from the baseline (${u})</span>
        <input type="text" id="mdb" inputmode="decimal" value="${esc(m.db==null?"":m.db)}" placeholder="0 if it sits on the line"></label>
      <label class="fld"><span>Which side of the baseline</span>${sideSel}</label>`}
    <button class="btn sec" id="mmpick" style="max-width:none;margin:0 0 8px">Tap the points on the sketch instead</button>
    <button class="btn" id="mmgo" style="max-width:none;margin:0">Place it</button>
    ${o.meas?`<button class="btn sec" id="mmclr" style="max-width:none">Forget this measurement</button>`:""}
    <button class="btn sec" id="mmx" style="max-width:none">Cancel</button>`);
    $("#mmtri").onclick=()=>{mode="tri";draw()};
    $("#mmbase").onclick=()=>{mode="base";draw()};
    $("#mmpolar").onclick=()=>{mode="polar";draw()};
    $("#mmx").onclick=closeSheet;
    const pk=$("#mmpick"); if(pk)pk.onclick=()=>measPickStart(sk,o);
    const clr=$("#mmclr");
    if(clr)clr.onclick=()=>{pushUndo(sk);delete o.meas;saveLocal();closeSheet();renderSketch();toast("Measurement removed")};
    $("#mmgo").onclick=()=>{
      const a=$("#mra").value, b=mode==="polar"?a:$("#mrb").value;
      if(mode!=="polar"&&a===b)return toast("A and B need to be different points");
      const da=parseLen($("#mda").value,u), db=mode==="polar"?0:parseLen($("#mdb").value,u);
      const ang=mode==="polar"?parseFloat($("#mang").value):0;
      if(isNaN(da)||da<0||(mode!=="base"&&!(da>0)))return toast("Distance from A needs a number");
      if(mode==="polar"&&isNaN(ang))return toast("The bearing needs a number, in degrees clockwise from the top of the page");
      if(mode!=="polar"&&(isNaN(db)||(mode==="tri"&&!(db>0))||(mode==="base"&&db<0)))
        return toast(mode==="tri"?"Distance from B needs a number":"The offset needs a number — 0 is fine");
      const side=mode==="polar"?"l":$("#mside").value;
      const p=solveMeas(sk,{m:mode,a,b,da,db,side,ang});
      if(!p)return toast("Those distances don't meet — the points are "
        +fmtLen(sk,Math.hypot(refPt(sk,a).x-refPt(sk,b).x,refPt(sk,a).y-refPt(sk,b).y))+" apart");
      pushUndo(sk);
      o.meas={m:mode,a,b,da,db,side,ang};
      o.x=Math.round(p.x-o.w/2); o.y=Math.round(p.y-o.h/2);
      sk.showMeas=true;
      saveLocal();closeSheet();renderSketch();
      toast("Placed — "+fmtLen(sk,realPx(sk,da))+(mode==="polar"?" on a bearing of "+ang+"°":" and "+fmtLen(sk,realPx(sk,db))))};
  };
  draw();
}
function measSVG(sk,liveId){
  if(!sk.showMeas)return "";
  let s="";
  const seg=(from,to,txt)=>{const mx=(from.x+to.x)/2, my=(from.y+to.y)/2, tw=txt.length*6.2+6;
    return `<line x1="${from.x.toFixed(1)}" y1="${from.y.toFixed(1)}" x2="${to.x.toFixed(1)}" y2="${to.y.toFixed(1)}" class="k-meas"/>
    <rect x="${(mx-tw/2).toFixed(1)}" y="${(my-7).toFixed(1)}" width="${tw.toFixed(1)}" height="13" rx="3" class="k-dimbg"/>
    <text x="${mx.toFixed(1)}" y="${(my+3.5).toFixed(1)}" class="k-meast" text-anchor="middle">${esc(txt)}</text>`};
  (sk.objs||[]).forEach(o=>{
    if(!o.meas)return;
    const A=refPt(sk,o.meas.a), B=refPt(sk,o.meas.b); if(!A||!B)return;
    const P=objPt(o,.5,.5), g=(o.id===liveId)?measGeom(sk,o):o.meas;
    if(o.meas.m==="tri"){
      s+=seg(A,P,fmtLen(sk,realPx(sk,g.da)))+seg(B,P,fmtLen(sk,realPx(sk,g.db)));
    }else{
      const foot=solveMeas(sk,Object.assign({},o.meas,g,{db:0}));
      if(o.meas.m!=="polar")s+=`<line x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" class="k-measbase"/>`;
      if(foot){ s+=seg(A,foot,fmtLen(sk,realPx(sk,g.da))+(o.meas.m==="polar"?" at "+(+g.ang||0)+"°":""));
        if(g.db>0)s+=seg(foot,P,fmtLen(sk,realPx(sk,g.db))) }
    }
  });
  return s?`<g id="measg">${s}</g>`:"";
}
function measRows(sk){
  return (sk.objs||[]).filter(o=>o.meas).map(o=>{
    const nm=(o.t==="marker"?"Marker "+(o.n||""):o.t==="photopoint"?"Photo "+(o.n||""):SHAPENAME(o.t))
      +((o.label||"").trim()?" — "+o.label.trim():"");
    const m=o.meas, da=fmtLen(sk,realPx(sk,m.da)), db=fmtLen(sk,realPx(sk,m.db));
    const txt=m.m==="polar"? da+" from "+refName(sk,m.a)+" on a bearing of "+(+m.ang||0)+"° clockwise from the top of the page (distance and bearing)"
      : m.m==="tri"
      ? da+" from "+refName(sk,m.a)+" and "+db+" from "+refName(sk,m.b)+", "+(m.side==="r"?"right":"left")+" of the line A to B (triangulation)"
      : da+" along the baseline from "+refName(sk,m.a)+" towards "+refName(sk,m.b)+", "+db+" out to the "+(m.side==="r"?"right":"left")+" (baseline offset)";
    return [nm,txt]});
}

/* ---- walls by dimension ---- */
function buildWalls(segs,thick,head,start){
  const objs=[]; let x=start.x, y=start.y, ang={E:0,S:90,W:180,N:270}[head]||0;
  segs.forEach((sg,i)=>{
    if(i){ if(sg.turn==="L")ang-=90; else if(sg.turn==="R")ang+=90 }
    ang=((ang%360)+360)%360;
    const L=sg.px, a=ang*Math.PI/180, x2=x+Math.cos(a)*L, y2=y+Math.sin(a)*L, e=thick/2;
    let o;
    if(ang===0||ang===180){const l=Math.min(x,x2)-e, r=Math.max(x,x2)+e; o={x:l,y:y-e,w:r-l,h:thick,r:0}}
    else if(ang===90||ang===270){const t=Math.min(y,y2)-e, b=Math.max(y,y2)+e; o={x:x-e,y:t,w:thick,h:b-t,r:0}}
    else {const mx=(x+x2)/2, my=(y+y2)/2, w=L+thick; o={x:mx-w/2,y:my-thick/2,w,h:thick,r:ang}}
    ["x","y","w","h"].forEach(k=>o[k]=Math.round(o[k]));
    objs.push(Object.assign({id:newId(),t:"wall",label:"",ar:o.w/o.h},o));
    x=x2; y=y2;
  });
  return objs;
}
function wallSheet(sk){
  const u=(sk.scale&&sk.scale.unit)||"ft";
  const st={tab:"room",rw:u==="ft"?"16":"5",rd:u==="ft"?"12":"4",head:"E",
    thick:u==="ft"?"6 in":u==="m"?"0.15":u==="cm"?"15":"6",segs:[{len:"",turn:"S"},{len:"",turn:"R"}]};
  const grab=()=>{ ["rw","rd","thick"].forEach(k=>{const el=$("#w"+k); if(el)st[k]=el.value});
    const hd=$("#whead"); if(hd)st.head=hd.value;
    $$("[data-wlen]").forEach(el=>{st.segs[+el.dataset.wlen].len=el.value});
    $$("[data-wturn]").forEach(el=>{st.segs[+el.dataset.wturn].turn=el.value}) };
  const draw=()=>{
    openSheet(`<h3>Walls by dimension</h3>
    ${scaleOf(sk)?`<p class="hint" style="margin:0 0 12px">Type the lengths off the tape. Corners meet cleanly on their own.</p>`
      :`<p class="hint" style="margin:0 0 12px">No scale is set yet. One is chosen so the walls fit the page, and the sketch becomes to scale from then on.</p>`}
    <div class="seg" style="margin-bottom:12px">
      <button id="wtroom"${st.tab==="room"?' class="on"':''}>Room</button>
      <button id="wtrun"${st.tab==="run"?' class="on"':''}>Run of walls</button></div>
    ${st.tab==="room"?`<div class="two">
      <label class="fld"><span>Width, left to right (${u})</span><input type="text" id="wrw" inputmode="decimal" value="${esc(st.rw)}"></label>
      <label class="fld"><span>Depth, top to bottom (${u})</span><input type="text" id="wrd" inputmode="decimal" value="${esc(st.rd)}"></label></div>`
    :`<label class="fld"><span>The first wall runs</span><select id="whead">${[["N","North, up the page"],["E","East, to the right"],["S","South, down the page"],["W","West, to the left"]]
        .map(([k,n])=>`<option value="${k}"${k===st.head?" selected":""}>${n}</option>`).join("")}</select></label>
      <div class="wallrows">${st.segs.map((sg,i)=>`<div class="wallrow">
        <input type="text" inputmode="decimal" data-wlen="${i}" value="${esc(sg.len)}" placeholder="Wall ${i+1} length (${u})" aria-label="Wall ${i+1} length">
        <select data-wturn="${i}" aria-label="Turn before wall ${i+1}"${i===0?" disabled":""}>
          <option value="S"${sg.turn==="S"?" selected":""}>${i===0?"First wall":"Straight on"}</option>
          <option value="L"${sg.turn==="L"?" selected":""}>Turn left</option>
          <option value="R"${sg.turn==="R"?" selected":""}>Turn right</option></select>
        <button data-wdel="${i}" aria-label="Remove wall ${i+1}"${st.segs.length===1?" disabled":""}>&#215;</button></div>`).join("")}</div>
      <button class="btn sec" id="wadd" style="max-width:none;margin:0 0 12px">+ Another wall</button>`}
    <label class="fld"><span>Wall thickness (${u})</span><input type="text" id="wthick" inputmode="decimal" value="${esc(st.thick)}"></label>
    <button class="btn" id="wgo" style="max-width:none;margin:0">Draw the walls</button>
    <button class="btn sec" id="wx" style="max-width:none">Cancel</button>`);
    $("#wtroom").onclick=()=>{grab();st.tab="room";draw()};
    $("#wtrun").onclick=()=>{grab();st.tab="run";draw()};
    $("#wx").onclick=closeSheet;
    const add=$("#wadd"); if(add)add.onclick=()=>{grab();st.segs.push({len:"",turn:"R"});draw()};
    $$("[data-wdel]").forEach(b=>b.onclick=()=>{grab();st.segs.splice(+b.dataset.wdel,1);draw()});
    $("#wgo").onclick=()=>{
      grab();
      const thick=parseLen(st.thick,u);
      if(!(thick>0))return toast("Wall thickness needs a number");
      let segs;
      if(st.tab==="room"){
        const w=parseLen(st.rw,u), d=parseLen(st.rd,u);
        if(!(w>0)||!(d>0))return toast("Width and depth both need a number");
        segs=[{len:w,turn:"S"},{len:d,turn:"R"},{len:w,turn:"R"},{len:d,turn:"R"}]; st.head="E";
      }else{
        segs=st.segs.map(s=>({len:parseLen(s.len,u),turn:s.turn}));
        const bad=segs.findIndex(s=>!(s.len>0));
        if(bad>-1)return toast("Wall "+(bad+1)+" needs a length");
      }
      // choose a scale that lets the run fit, if there is none yet
      if(!scaleOf(sk)){
        const probe=buildWalls(segs.map(s=>({px:s.len,turn:s.turn})),thick,st.head,{x:0,y:0});
        const ew=Math.max(...probe.map(o=>o.x+o.w))-Math.min(...probe.map(o=>o.x));
        const ed=Math.max(...probe.map(o=>o.y+o.h))-Math.min(...probe.map(o=>o.y));
        const top=hasHeader(sk)?HEADER_H:0;
        let ppu=Math.min((pageW(sk)*.7)/Math.max(ew,1),((pageH(sk)-top)*.7)/Math.max(ed,1));
        const nice=[1,2,2.5,4,5,8,10,15,20,25,30,40,50,60,80,100];
        ppu=nice.reduce((a,n)=>(n<=ppu&&n>a)?n:a,nice[0]);
        sk.scale={px:100,real:Math.round(100/ppu*1000)/1000,unit:u};
        toast("Scale set: 100 units on the page = "+fmtLen(sk,100)+". Change it under Set scale.");
      }
      const objs=buildWalls(segs.map(s=>({px:realPx(sk,s.len),turn:s.turn})),realPx(sk,thick),st.head,{x:0,y:0});
      // centre the run on the free part of the page
      const x0=Math.min(...objs.map(o=>o.x)), x1=Math.max(...objs.map(o=>o.x+o.w));
      const y0=Math.min(...objs.map(o=>o.y)), y1=Math.max(...objs.map(o=>o.y+o.h));
      const top=hasHeader(sk)?HEADER_H+2:0;
      const dx=Math.round(pageW(sk)/2-(x0+x1)/2), dy=Math.round(top+(pageH(sk)-top)/2-(y0+y1)/2);
      const ls=layersOf(sk), target=(curLayer&&ls.some(l=>l.id===curLayer))?curLayer:ls[ls.length-1].id;
      pushUndo(sk);
      objs.forEach(o=>{o.x+=dx;o.y+=dy;o.lay=target;sk.objs.push(o)});
      selObj=null; noteRecent("wall"); saveLocal(); closeSheet(); renderSketch();
      const tooBig=x1-x0>pageW(sk)||y1-y0>pageH(sk)-top;
      toast(objs.length+" wall"+(objs.length===1?"":"s")+" drawn"+(tooBig?" — larger than the page at this scale":""));
    };
  };
  draw();
}

/* typed size and rotation, fill and favourites, in the object panel */
function sizeRow(sel,sk){
  const sc=scaleOf(sk), u=sc?(sc.unit||"ft"):"units";
  const v=px=>sc?fmtLen(sk,px):String(Math.round(px));
  const fpSel=AREAS.has(sel.t)?`<label class="fld"><span>Fill</span><select id="osfp">${FILLS.map(([k,n])=>
      `<option value="${k}"${(sel.fp||AREADEF[sel.t]||"hatch")===k?" selected":""}>${n}</option>`).join("")}</select></label>`:"";
  const dims=sel.t==="dim"
    ? `<label class="fld"><span>Length (${u})</span><input type="text" id="oslen" inputmode="decimal" value="${esc(v(dimLen(sel)))}"></label>`
    : `<label class="fld"><span>Width (${u})</span><input type="text" id="osw" inputmode="decimal" value="${esc(v(sel.w))}"></label>
       <label class="fld"><span>${LOCKED.has(sel.t)?"Height":"Depth"} (${u})</span><input type="text" id="osh" inputmode="decimal" value="${esc(v(sel.h))}"></label>`;
  const meas=sel.meas?`<p class="hint" style="margin:6px 0 0">Measured: ${esc(measRows(sk).find(r=>r[0].startsWith(sel.t==="marker"?"Marker "+(sel.n||""):sel.t==="photopoint"?"Photo "+(sel.n||""):SHAPENAME(sel.t)))?.[1]||"")}</p>`:"";
  return `<div class="osgrid sizerow">${dims}
      <label class="fld"><span>Rotation (°)</span><input type="text" id="osrot" inputmode="numeric" value="${sel.r||0}"></label>
      ${fpSel}</div>
    ${sel.t==="poly"?`<div class="objbar"><button data-oaddvtx="${sel.id}">Add a corner</button>
      <button data-odelvtx="${sel.id}"${(sel.pts||[]).length>3?"":" disabled"}>Remove last corner</button></div>
      <p class="hint" style="margin:6px 0 0">Drag the white corner handles to reshape the area.</p>`:""}
    <div class="objbar">
      <button data-omeas="${sel.id}"${sel.t==="legend"||sel.t==="dim"?" disabled":""}>${sel.meas?"Re-measure":"Place by measurement"}</button>
      <button data-ocopy="${sel.id}">Copy style</button>
      ${STYLECLIP?`<button data-opaste="${sel.id}">Paste style</button>`:""}
      <button data-ofav="${sel.t}">${favs().includes(sel.t)?"★ Favourite":"☆ Favourite"}</button>
    </div>${meas}`;
}
let STYLECLIP=null;
function applyTypedSize(id,val){
  const sk=curSk(), o=objAt(selObj); if(!sk||!o)return;
  const sc=scaleOf(sk);
  const toPx=s=>{const n=sc?parseLen(s,sc.unit||"ft"):parseFloat(s); return isNaN(n)?NaN:(sc?realPx(sk,n):n)};
  if(id==="osrot"){const r=parseFloat(val); if(isNaN(r))return toast("Rotation needs a number");
    if(o.lockR)return toast("Rotation is locked");
    pushUndo(sk);o.r=((Math.round(r)%360)+360)%360;saveLocal();renderSketch();return}
  if(id==="osfp"){pushUndo(sk);o.fp=val;saveLocal();renderSketch();return}
  const px=toPx(val);
  if(!(px>0))return toast("That needs a length, like 12' 4\" or 3.5");
  pushUndo(sk);
  if(id==="oslen"){const L=dimLen(o)||1, f=px/L; o.w=Math.round(o.w*f); o.h=Math.round(o.h*f)}
  else if(id==="osw"){const cx=o.x+o.w/2, cy=o.y+o.h/2; o.w=Math.max(4,Math.round(px));
    if(LOCKED.has(o.t))o.h=Math.max(4,Math.round(o.w/(o.ar||1)));
    o.x=Math.round(cx-o.w/2); o.y=Math.round(cy-o.h/2)}
  else if(id==="osh"){const cx=o.x+o.w/2, cy=o.y+o.h/2; o.h=Math.max(4,Math.round(px));
    if(LOCKED.has(o.t))o.w=Math.max(4,Math.round(o.h*(o.ar||1)));
    o.x=Math.round(cx-o.w/2); o.y=Math.round(cy-o.h/2)}
  if(!LOCKED.has(o.t))o.ar=o.w/o.h;
  saveLocal();renderSketch();
  toast(sc?"Now "+fmtLen(sk,o.t==="dim"?dimLen(o):o.w)+(o.t==="dim"?"":" by "+fmtLen(sk,o.h)):"Resized");
}
document.addEventListener("change",e=>{
  const id=(e.target||{}).id||"";
  if(/^os(w|h|len|rot|fp)$/.test(id))applyTypedSize(id,e.target.value);
});

/* ---- favourites and recents ---- */
const favs=()=>(S.palFav=S.palFav||[]);
const recents=()=>(S.palRecent=S.palRecent||[]);
function noteRecent(t){const r=recents(), i=r.indexOf(t); if(i>-1)r.splice(i,1); r.unshift(t); if(r.length>10)r.length=10}
function favBar(){
  const f=favs().filter(t=>SHAPES[t]), r=recents().filter(t=>SHAPES[t]&&!f.includes(t)).slice(0,6);
  if(!f.length&&!r.length)return "";
  const tile=t=>`<button data-add="${t}"><span class="pv">${palPreview(t)}</span><span class="pn">${esc(SHAPENAME(t))}</span></button>`;
  return (f.length?`<div class="sect favsect">Favourites</div><div class="palette">${f.map(tile).join("")}</div>`:"")
    +(r.length?`<div class="sect favsect">Recent</div><div class="palette">${r.map(tile).join("")}</div>`:"");
}
function extraAddDefaults(sk,o,t){
  if(t==="refpoint"){const n=(sk.objs||[]).filter(q=>q.t==="refpoint").length+1; o.label="RP"+n}
  if(t==="grassarea"||t==="hedge"||t==="treeline")o.ink="green";
  if(t==="waterarea"||t==="stream")o.ink="blue";
  if(t==="bloodarea"||t==="bloodtrail")o.ink="red";
  if(t==="tape")o.ink="orange";
  if(t==="gravelarea"||t==="concretearea")o.ink="grey";
  noteRecent(t);
}

/* ---- grid ---- */
let skGrid=false;
function gridSVG(sk){
  if(!skGrid)return "";
  const W=pageW(sk), H=pageH(sk); let a="", b="";
  for(let x=SNAP;x<W;x+=SNAP){ if(x%(SNAP*5))a+=`M${x} 0 V${H} `; else b+=`M${x} 0 V${H} ` }
  for(let y=SNAP;y<H;y+=SNAP){ if(y%(SNAP*5))a+=`M0 ${y} H${W} `; else b+=`M0 ${y} H${W} ` }
  return `<path d="${a}" class="k-grid k-gridminor"/><path d="${b}" class="k-grid"/>`;
}

/* ---- outline areas: tap the corners ---- */
let polyDraw=null;
function polyStart(){ polyDraw={pts:[]}; selObj=null; showSet=false; renderSketch();
  toast("Tap each corner of the area. Tap the first corner again to close it.") }
function polyBar(){
  if(!polyDraw)return "";
  const n=polyDraw.pts.length;
  return `<div class="polybar"><span>${n?n+" corner"+(n===1?"":"s")+" so far":"Tap the page at the first corner"}</span>
    <button data-polyundo="1"${n?"":" disabled"}>Undo corner</button>
    <button data-polydone="1"${n<3?" disabled":""}>Finish</button>
    <button data-polyx="1">Cancel</button></div>`;
}
function polyOverlaySVG(){
  if(!polyDraw||!polyDraw.pts.length)return "";
  const P=polyDraw.pts;
  return `<g><polyline points="${P.map(p=>p.x+","+p.y).join(" ")}" class="k-polyline"/>
    ${P.map((p,i)=>`<circle cx="${p.x}" cy="${p.y}" r="${i?5:10}" class="${i?"k-polypt":"k-polyfirst"}"/>`).join("")}</g>`;
}
function polyFinish(){
  const sk=curSk(); if(!sk||!polyDraw||polyDraw.pts.length<3)return;
  const P=polyDraw.pts;
  const x0=Math.min(...P.map(p=>p.x)), y0=Math.min(...P.map(p=>p.y));
  const w=Math.max(16,Math.max(...P.map(p=>p.x))-x0), h=Math.max(16,Math.max(...P.map(p=>p.y))-y0);
  const ls=layersOf(sk), target=(curLayer&&ls.some(l=>l.id===curLayer))?curLayer:ls[ls.length-1].id;
  pushUndo(sk);
  const o={id:newId(),t:"poly",lay:target,x:Math.round(x0),y:Math.round(y0),w:Math.round(w),h:Math.round(h),r:0,
    label:"",ar:w/h,fp:"hatch",pts:P.map(p=>[+((p.x-x0)/w).toFixed(4),+((p.y-y0)/h).toFixed(4)])};
  sk.objs.push(o); polyDraw=null; selObj=o.id; showSet=true; noteRecent("poly");
  saveLocal(); renderSketch(); toast("Area drawn — pick its fill in the panel");
}
function polyHandles(o){
  return (o.pts||[]).map(([fx,fy],i)=>
    `<circle data-vtx="${o.id}:${i}" cx="${(fx*o.w).toFixed(1)}" cy="${(fy*o.h).toFixed(1)}" r="${(handleU()*.42).toFixed(1)}" class="k-vtx"/>`).join("");
}
function polyNormalize(o){
  if(!o.pts||o.pts.length<3)return;
  const xs=o.pts.map(p=>p[0]*o.w), ys=o.pts.map(p=>p[1]*o.h);
  const x0=Math.min(...xs), y0=Math.min(...ys), x1=Math.max(...xs), y1=Math.max(...ys);
  const w=Math.max(16,x1-x0), h=Math.max(16,y1-y0);
  const a=(o.r||0)*Math.PI/180, dx=(x0+x1)/2-o.w/2, dy=(y0+y1)/2-o.h/2;
  const cx=o.x+o.w/2+dx*Math.cos(a)-dy*Math.sin(a), cy=o.y+o.h/2+dx*Math.sin(a)+dy*Math.cos(a);
  o.pts=o.pts.map((p,i)=>[+((xs[i]-x0)/w).toFixed(4),+((ys[i]-y0)/h).toFixed(4)]);
  o.w=Math.round(w); o.h=Math.round(h); o.ar=o.w/o.h; o.x=Math.round(cx-w/2); o.y=Math.round(cy-h/2);
}

/* ---- fills and line types ---- */
const FILLS=[["hatch","Hatched"],["cross","Cross-hatched"],["dots","Dotted"],["solid","Solid tint"],
  ["grass","Grass"],["water","Water"],["concrete","Concrete"],["gravel","Gravel"],["tile","Tile"],
  ["brick","Brick"],["wood","Wood floor"],["blood","Blood"]];
const AREADEF={area:"hatch",areaell:"hatch",poly:"hatch",grassarea:"grass",waterarea:"water",
  concretearea:"concrete",gravelarea:"gravel",tilearea:"tile",bloodarea:"blood",brickarea:"brick",woodarea:"wood"};
const AREAS=new Set(Object.keys(AREADEF));
function patDef(id,kind){
  const P=(w,h,body)=>`<pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}">${body}</pattern>`;
  switch(kind){
    case "hatch": return P(10,10,`<path d="M0 10 L10 0 M-1 1 L1 -1 M9 11 L11 9" class="k-thin"/>`);
    case "cross": return P(10,10,`<path d="M0 10 L10 0 M0 0 L10 10" class="k-thin"/>`);
    case "dots": return P(8,8,`<circle cx="4" cy="4" r="1.2" class="k-fill"/>`);
    case "grass": return P(18,14,`<path d="M2 12 l2 -6 l1.5 6 M8 13 l2 -7 l2 7 M13 11 l1.5 -5 l1.5 5" class="k-thin"/>`);
    case "water": return P(20,10,`<path d="M0 5 q5 -4 10 0 t10 0" class="k-thin"/>`);
    case "concrete": return P(22,22,`<circle cx="4" cy="6" r="1" class="k-fill"/><circle cx="15" cy="13" r=".8" class="k-fill"/><path d="M9 18 l2 -2.5 l1.5 2.5 z M17 4 l1.5 -1.5 l1 2 z" class="k-fill"/>`);
    case "gravel": return P(16,16,`<path d="M2 4 l3 -2 l2 2 l-2 2 z M10 3 l3 -1 l1 3 l-3 1 z M5 11 l2 -2 l3 1 l-1 3 l-3 0 z M12 12 l2 -2 l2 2 l-2 1 z" class="k-thin"/>`);
    case "tile": return P(16,16,`<path d="M16 0 L0 0 L0 16" class="k-thin"/>`);
    case "brick": return P(24,12,`<path d="M0 6 H24 M0 12 H24 M12 0 V6 M0 6 V12 M24 6 V12" class="k-thin"/>`);
    case "wood": return P(24,12,`<path d="M0 4 H24 M0 10 H24 M6 4 V10 M18 10 V4" class="k-thin"/>`);
    default: return "";
  }
}
function areaShape(kind,ell){
  return (w,hh,o)=>{
    const fp=(o&&o.fp)||kind, id="pat_"+(o?o.id:"pv"+(PVN++)), def=patDef(id,fp);
    const fill=def?`url(#${id})`:"var(--kc,#111)";
    const op=fp==="solid"?".28":fp==="blood"?".6":"1";
    const isEll=o?o.t==="areaell":ell;
    const geom=isEll?`<ellipse cx="${w/2}" cy="${hh/2}" rx="${w/2}" ry="${hh/2}"`:`<rect width="${w}" height="${hh}"`;
    return `<defs>${def}</defs>${geom} fill="${fill}" fill-opacity="${op}" class="k-area"/>${geom} class="k-thin"/>`;
  };
}
Object.assign(SHAPES,{
  area:areaShape("hatch"), areaell:areaShape("hatch",true), grassarea:areaShape("grass"),
  waterarea:areaShape("water"), concretearea:areaShape("concrete"), gravelarea:areaShape("gravel"),
  tilearea:areaShape("tile"), bloodarea:areaShape("blood"), brickarea:areaShape("brick"), woodarea:areaShape("wood"),
  poly:(w,hh,o)=>{
    const pts=(o&&o.pts&&o.pts.length>=3)?o.pts:[[.1,.9],[.3,.1],[.75,.2],[.95,.85]];
    const P=pts.map(([fx,fy])=>`${(fx*w).toFixed(1)},${(fy*hh).toFixed(1)}`).join(" ");
    const fp=(o&&o.fp)||"hatch", id="pat_"+(o?o.id:"pv"+(PVN++)), def=patDef(id,fp);
    const op=fp==="solid"?".28":fp==="blood"?".6":"1";
    return `<defs>${def}</defs><polygon points="${P}" fill="${def?`url(#${id})`:"var(--kc,#111)"}" fill-opacity="${op}" class="k-area"/><polygon points="${P}" class="k-stroke"/>`},
  /* line types: detail repeats at a fixed pitch, so a longer line gets more of it */
  guardrail:(w,hh)=>{const pitch=Math.max(18,hh*1.6), n=Math.max(2,Math.round(w/pitch));
    let s=`<path d="M0 ${hh*.35} L${w} ${hh*.35} M0 ${hh*.65} L${w} ${hh*.65}" class="k-stroke"/>`;
    for(let i=0;i<=n;i++){const x=(w/n)*i; s+=`<rect x="${(x-hh*.12).toFixed(1)}" y="${hh*.18}" width="${(hh*.24).toFixed(1)}" height="${hh*.64}" class="k-fill"/>`}
    return s},
  railroad:(w,hh)=>{const pitch=Math.max(10,hh*.55), n=Math.max(3,Math.round(w/pitch));
    let s=`<path d="M0 ${hh*.3} L${w} ${hh*.3} M0 ${hh*.7} L${w} ${hh*.7}" class="k-stroke"/>`;
    for(let i=0;i<=n;i++){const x=(w/n)*i; s+=`<line x1="${x.toFixed(1)}" y1="${hh*.05}" x2="${x.toFixed(1)}" y2="${hh*.95}" class="k-thick"/>`}
    return s},
  skidmark:(w,hh)=>`<polygon points="0,${hh*.42} ${w},${hh*.12} ${w},${hh*.88} 0,${hh*.58}" class="k-fill" opacity=".55"/>
    <path d="M0 ${hh*.42} L${w} ${hh*.12} M0 ${hh*.58} L${w} ${hh*.88}" class="k-thin"/>`,
  centreline:(w,hh)=>{const d=Math.max(14,hh*.9); return `<path d="M0 ${hh/2} L${w} ${hh/2}" class="k-stroke" stroke-dasharray="${d.toFixed(1)} ${(d*.7).toFixed(1)}"/>`},
  doubleline:(w,hh)=>`<path d="M0 ${hh*.36} L${w} ${hh*.36} M0 ${hh*.64} L${w} ${hh*.64}" class="k-stroke"/>`,
  passzone:(w,hh)=>{const d=Math.max(14,hh*.9); return `<path d="M0 ${hh*.36} L${w} ${hh*.36}" class="k-stroke"/><path d="M0 ${hh*.64} L${w} ${hh*.64}" class="k-stroke" stroke-dasharray="${d.toFixed(1)} ${(d*.7).toFixed(1)}"/>`},
  edgeline:(w,hh)=>`<path d="M0 ${hh/2} L${w} ${hh/2}" class="k-stroke"/>`,
  curb:(w,hh)=>`<path d="M0 ${hh*.4} L${w} ${hh*.4}" class="k-thick"/><path d="M0 ${hh*.62} L${w} ${hh*.62}" class="k-thin"/>`,
  sidewalk:(w,hh)=>{const pitch=Math.max(20,hh*1.3), n=Math.max(2,Math.round(w/pitch));
    let s=`<path d="M0 ${hh*.15} L${w} ${hh*.15} M0 ${hh*.85} L${w} ${hh*.85}" class="k-stroke"/>`;
    for(let i=1;i<n;i++){const x=(w/n)*i; s+=`<line x1="${x.toFixed(1)}" y1="${hh*.15}" x2="${x.toFixed(1)}" y2="${hh*.85}" class="k-thin"/>`}
    return s},
  chainlink:(w,hh)=>{const pitch=Math.max(8,hh*.5), n=Math.max(3,Math.round(w/pitch)); let d="";
    for(let i=0;i<n;i++){const x=(w/n)*i, x2=(w/n)*(i+1); d+=`M${x.toFixed(1)} ${hh*.2} L${x2.toFixed(1)} ${hh*.8} M${x.toFixed(1)} ${hh*.8} L${x2.toFixed(1)} ${hh*.2} `}
    return `<path d="${d}" class="k-thin"/><path d="M0 ${hh*.2} L${w} ${hh*.2} M0 ${hh*.8} L${w} ${hh*.8}" class="k-stroke"/>`},
  hedge:(w,hh)=>{const pitch=Math.max(10,hh*.7), n=Math.max(2,Math.round(w/pitch)), r=w/n/2; let d=`M0 ${hh*.7}`;
    for(let i=0;i<n;i++){d+=` a${r.toFixed(1)} ${(hh*.45).toFixed(1)} 0 0 1 ${(r*2).toFixed(1)} 0`}
    return `<path d="${d}" class="k-stroke"/><path d="M0 ${hh*.7} L${w} ${hh*.7}" class="k-thin"/>`},
  treeline:(w,hh)=>{const pitch=Math.max(16,hh*.9), n=Math.max(2,Math.round(w/pitch)), r=w/n/2; let d=`M0 ${hh*.75}`, c="";
    for(let i=0;i<n;i++){d+=` a${r.toFixed(1)} ${(hh*.6).toFixed(1)} 0 0 1 ${(r*2).toFixed(1)} 0`; c+=`<circle cx="${(r*(2*i+1)).toFixed(1)}" cy="${hh*.75}" r="${Math.max(1.5,hh*.07).toFixed(1)}" class="k-fill"/>`}
    return `<path d="${d}" class="k-stroke"/>${c}`},
  stream:(w,hh)=>{const pitch=Math.max(16,hh*1.2), n=Math.max(2,Math.round(w/pitch)), q=w/n/2;
    const wave=y=>{let d=`M0 ${y}`; for(let i=0;i<n;i++){d+=` q${q.toFixed(1)} ${(-hh*.25).toFixed(1)} ${(q*2).toFixed(1)} 0`} return d};
    return `<path d="${wave(hh*.35)}" class="k-stroke"/><path d="${wave(hh*.75)}" class="k-stroke"/>`},
  powerline:(w,hh)=>{const pitch=Math.max(30,hh*3), n=Math.max(1,Math.round(w/pitch)); let s=`<path d="M0 ${hh/2} L${w} ${hh/2}" class="k-thin" stroke-dasharray="6 4"/>`;
    for(let i=0;i<=n;i++){const x=(w/n)*i; s+=`<circle cx="${x.toFixed(1)}" cy="${hh/2}" r="${Math.max(2,hh*.28).toFixed(1)}" class="k-fill"/>`}
    return s},
  propline:(w,hh)=>`<path d="M0 ${hh/2} L${w} ${hh/2}" class="k-stroke" stroke-dasharray="18 5 3 5"/>`,
  tape:(w,hh)=>{const pitch=Math.max(10,hh*.8), n=Math.max(3,Math.round(w/pitch)); let d="";
    for(let i=0;i<n;i+=2){const x=(w/n)*i, x2=(w/n)*(i+1); d+=`M${x.toFixed(1)} ${hh*.15} L${x2.toFixed(1)} ${hh*.15} L${(x2-hh*.3).toFixed(1)} ${hh*.85} L${(x-hh*.3).toFixed(1)} ${hh*.85} Z `}
    return `<rect x="0" y="${hh*.15}" width="${w}" height="${hh*.7}" class="k-stroke"/><path d="${d}" class="k-fill"/>`},
  footpath:(w,hh)=>{const pitch=Math.max(14,hh*1.1), n=Math.max(2,Math.round(w/pitch)); let s="";
    for(let i=0;i<n;i++){const x=(w/n)*(i+.5), y=i%2?hh*.32:hh*.68;
      s+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${Math.max(2,hh*.14).toFixed(1)}" ry="${Math.max(3,hh*.24).toFixed(1)}" transform="rotate(-70 ${x.toFixed(1)} ${y.toFixed(1)})" class="k-fill"/>`}
    return s},
  bloodtrail:(w,hh)=>{const pitch=Math.max(12,hh*1), n=Math.max(2,Math.round(w/pitch)), r=R(5); let s="";
    for(let i=0;i<n;i++){const x=(w/n)*(i+.5), y=hh*(.3+r()*.4), rr=Math.max(1.5,hh*(.1+r()*.12));
      s+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" class="k-fill"/><circle cx="${(x+rr*1.6).toFixed(1)}" cy="${(y-rr*.4).toFixed(1)}" r="${(rr*.35).toFixed(1)}" class="k-fill"/>`}
    return s},
  travel:(w,hh)=>{const d=Math.max(10,hh*.6); return `<path d="M0 ${hh/2} L${w*.86} ${hh/2}" class="k-stroke" stroke-dasharray="${d.toFixed(1)} ${(d*.6).toFixed(1)}"/><polygon points="${w},${hh/2} ${w*.84},${hh*.1} ${w*.84},${hh*.9}" class="k-fill"/>`},
  hidden:(w,hh)=>`<path d="M0 ${hh/2} L${w} ${hh/2}" class="k-thin" stroke-dasharray="6 5"/>`,
  ditch:(w,hh)=>{const pitch=Math.max(8,hh*.5), n=Math.max(3,Math.round(w/pitch)); let d="";
    for(let i=0;i<=n;i++){const x=(w/n)*i; d+=`M${x.toFixed(1)} ${hh*.3} L${x.toFixed(1)} ${hh*.85} `}
    return `<path d="M0 ${hh*.3} L${w} ${hh*.3}" class="k-stroke"/><path d="${d}" class="k-thin"/>`},
  stonewall:(w,hh)=>{const pitch=Math.max(12,hh*.9), n=Math.max(2,Math.round(w/pitch)); let s=`<rect x="0" y="${hh*.15}" width="${w}" height="${hh*.7}" class="k-stroke"/>`;
    for(let i=0;i<n;i++){const x=(w/n)*i, sw=w/n; s+=`<rect x="${(x+sw*.1).toFixed(1)}" y="${(hh*(i%2?.2:.5)).toFixed(1)}" width="${(sw*.8).toFixed(1)}" height="${(hh*.3).toFixed(1)}" rx="${(hh*.1).toFixed(1)}" class="k-thin"/>`}
    return s},
  handrail:(w,hh)=>`<path d="M0 ${hh/2} L${w} ${hh/2}" class="k-thin"/><circle cx="${hh*.3}" cy="${hh/2}" r="${hh*.3}" class="k-stroke"/><circle cx="${w-hh*.3}" cy="${hh/2}" r="${hh*.3}" class="k-stroke"/>`,
  parkline:(w,hh)=>`<path d="M0 ${hh/2} L${w} ${hh/2}" class="k-thick"/>`
});
const LINETYPES=new Set(["guardrail","railroad","skidmark","centreline","doubleline","passzone","edgeline","curb","sidewalk",
  "chainlink","hedge","treeline","stream","powerline","propline","tape","footpath","bloodtrail","travel","hidden","ditch","stonewall","handrail","parkline"]);

/* ---- templates ---- */
const TPL_PPU=10;   // page units per foot when a template sets the scale
function tplScale(sk){ if(!scaleOf(sk)){sk.scale={px:100,real:10,unit:"ft"}} return realPx(sk,1) }
function tplBuiltin(){
  const W=sk=>pageW(sk), H=sk=>pageH(sk), top=sk=>hasHeader(sk)?HEADER_H+2:0;
  const cy=sk=>top(sk)+(H(sk)-top(sk))/2;
  const north=sk=>({t:"north",x:W(sk)-76,y:top(sk)+16,w:52,h:53,r:0});
  const legend=sk=>({t:"legend",x:16,y:H(sk)-206,w:300,h:190,r:0});
  const road=(sk,ft,vert)=>{const p=tplScale(sk), h=ft*p;
    return vert?{t:"road",x:W(sk)/2-(H(sk)-top(sk))/2,y:cy(sk)-h/2,w:H(sk)-top(sk),h,r:90}
               :{t:"road",x:0,y:cy(sk)-h/2,w:W(sk),h,r:0}};
  return [
    {id:"tpl-4way",name:"Four-way intersection",desc:"Two 24 ft roads crossing, north arrow, legend",
      build:sk=>[road(sk,24),road(sk,24,true),north(sk),legend(sk)]},
    {id:"tpl-t",name:"T-intersection",desc:"A side road meeting a through road",
      build:sk=>{const p=tplScale(sk), h=24*p, len=(H(sk)-cy(sk))-h/2;
        return [road(sk,24),{t:"road",x:W(sk)/2-len/2,y:cy(sk)+h/2+len/2-h/2,w:len,h,r:90},north(sk),legend(sk)]}},
    {id:"tpl-road",name:"Two-lane road with shoulders",desc:"Road, edge lines and sidewalks",
      build:sk=>{const p=tplScale(sk), h=24*p, y=cy(sk);
        return [road(sk,24),{t:"sidewalk",x:0,y:y-h/2-6*p,w:W(sk),h:5*p,r:0},{t:"sidewalk",x:0,y:y+h/2+p,w:W(sk),h:5*p,r:0},north(sk),legend(sk)]}},
    {id:"tpl-room",name:"Rectangular room",desc:"16 by 12 ft, one door and one window",
      build:sk=>{const p=tplScale(sk), t=.5*p, w=16*p, d=12*p, x0=W(sk)/2-w/2, y0=cy(sk)-d/2;
        const walls=buildWalls([{px:w,turn:"S"},{px:d,turn:"R"},{px:w,turn:"R"},{px:d,turn:"R"}],t,"E",{x:x0,y:y0});
        return walls.concat([{t:"door",x:x0+w*.6,y:y0+d-3*p,w:3*p,h:3*p,r:0},{t:"window",x:x0+w*.2,y:y0-t/2-2,w:4*p,h:t+4,r:0},north(sk)])}},
    {id:"tpl-lot",name:"Parking bay",desc:"Concrete with 9 ft stalls marked",
      build:sk=>{const p=tplScale(sk), n=6, sw=9*p, len=18*p, x0=W(sk)/2-n*sw/2, y0=cy(sk)-len/2;
        const o=[{t:"concretearea",x:x0-2*p,y:y0-2*p,w:n*sw+4*p,h:len+4*p,r:0,ink:"grey"}];
        for(let i=0;i<=n;i++)o.push({t:"parkline",x:x0+i*sw-len/2,y:y0+len/2-8,w:len,h:16,r:90});
        return o.concat([north(sk)])}},
    {id:"tpl-stop",name:"Vehicle stop",desc:"Two vehicles on a two-lane road",
      build:sk=>{const p=tplScale(sk), h=24*p, y=cy(sk);
        return [road(sk,24),{t:"car",x:W(sk)*.35,y:y+2*p,w:15*p,h:6.5*p,r:0},{t:"car",x:W(sk)*.35+19*p,y:y+2*p,w:15*p,h:6.5*p,r:0},north(sk),legend(sk)]}},
    {id:"tpl-xproj",name:"Cross-projection room",desc:"Floor with the four walls folded out flat",
      build:sk=>{const p=tplScale(sk), w=14*p, d=10*p, hgt=6*p, x0=W(sk)/2-w/2, y0=cy(sk)-d/2;
        return [{t:"room",x:x0,y:y0,w,h:d,r:0,label:"Floor"},
          {t:"rect",x:x0,y:y0-hgt-4,w,h:hgt,r:0,label:"North wall"},{t:"rect",x:x0,y:y0+d+4,w,h:hgt,r:0,label:"South wall"},
          {t:"rect",x:x0-hgt-4,y:y0,w:hgt,h:d,r:0,label:"West wall"},{t:"rect",x:x0+w+4,y:y0,w:hgt,h:d,r:0,label:"East wall"},north(sk)]}}
  ];
}
const sktpls=()=>(S.sktpl=S.sktpl||[]);
function applyTemplate(sk,objs,name){
  const ls=layersOf(sk), target=(curLayer&&ls.some(l=>l.id===curLayer))?curLayer:ls[ls.length-1].id;
  pushUndo(sk);
  objs.forEach(o=>{const c=Object.assign({},o,{id:newId(),lay:target,label:o.label||"",r:o.r||0});
    delete c.photoId; delete c.meas; c.ar=c.ar||(c.w/c.h);
    if(c.t==="marker")c.n=String(nextMarkerNo(sk));
    if(c.t==="photopoint")c.n=String(nextPhotoNo(sk));
    sk.objs.push(c)});
  selObj=null; saveLocal(); closeSheet(); renderSketch();
  toast(name+" added — "+objs.length+" object"+(objs.length===1?"":"s"));
}
function tplSheet(sk){
  const mine=sktpls(), builtin=tplBuiltin();
  const row=(id,name,desc,del)=>`<div class="tplrow"><button class="row" data-tpl="${id}"><span><span class="code">${esc(name)}</span><span class="desc">${esc(desc)}</span></span><span class="rt"><span class="chev">&#8250;</span></span></button>${del?`<button class="laybig" data-tpldel="${id}" aria-label="Delete template">&#215;</button>`:""}</div>`;
  openSheet(`<h3>Templates</h3>
    <p class="hint" style="margin:0 0 12px">A template drops a common layout into the current layer. Move things afterwards as usual.</p>
    <div class="sect">Standard layouts</div>
    <div class="rows">${builtin.map(t=>row(t.id,t.name,t.desc)).join("")}</div>
    <div class="sect">This unit's templates</div>
    ${mine.length?`<div class="rows">${mine.map(t=>row(t.id,t.name,(t.objs||[]).length+" objects"+(t.scale?", to scale":""),true)).join("")}</div>`
      :`<p class="hint">None saved yet. Lay out a scene you draw often, then save it here.</p>`}
    <button class="btn sec" id="tplsave" style="max-width:none;margin:12px 0 0"${(sk.objs||[]).length?"":" disabled"}>Save this sketch as a template</button>
    <p class="hint" style="margin:8px 0 0">Templates travel with the van data, so save layouts, not real scenes. Photographs and measurements are left out.</p>
    <button class="btn sec" id="tplx" style="max-width:none">Cancel</button>`);
  $("#tplx").onclick=closeSheet;
  $$("[data-tpl]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.tpl, bi=builtin.find(t=>t.id===id), m=mine.find(t=>t.id===id);
    if(bi){const objs=bi.build(sk); saveLocal(); return applyTemplate(sk,objs,bi.name)}
    if(m){ if(m.scale&&!scaleOf(sk))sk.scale=Object.assign({},m.scale);
      if(m.portrait!=null&&!(sk.objs||[]).length)sk.portrait=!!m.portrait;
      return applyTemplate(sk,m.objs||[],m.name)}
  });
  $$("[data-tpldel]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.tpldel; S.sktpl=mine.filter(t=>t.id!==id); save(); tplSheet(sk); toast("Template deleted")});
  $("#tplsave").onclick=()=>{
    openSheet(`<h3>Save as template</h3>
      <label class="fld"><span>Name</span><input type="text" id="tpln" placeholder="Living room, standard" value="${esc(sk.depicts||"")}"></label>
      <button class="btn" id="tplok" style="max-width:none;margin:0">Save</button>
      <button class="btn sec" id="tplback" style="max-width:none">Back</button>`);
    $("#tplback").onclick=()=>tplSheet(sk);
    $("#tplok").onclick=()=>{
      const name=$("#tpln").value.trim(); if(!name)return toast("Give it a name");
      const objs=(sk.objs||[]).map(o=>{const c=Object.assign({},o); delete c.photoId; delete c.meas; delete c.id; delete c.lay; return c});
      sktpls().push({id:newId(),name,objs,scale:scaleOf(sk)?Object.assign({},sk.scale):null,portrait:!!sk.portrait,saved:new Date().toISOString()});
      save(); closeSheet(); toast("Template saved")};
  };
}

/* ---- export options and DXF ---- */
const EXPORTOPT={mode:"fit",ratio:10,paper:"letter"};
function exportSheet(sk){
  const sc=scaleOf(sk), u=sc?(sc.unit||"ft"):"";
  openSheet(`<h3>Export</h3>
    <label class="fld"><span>Paper</span><select id="xpaper">
      ${[["letter","Letter, 8½ by 11"],["legal","Legal, 8½ by 14"],["tabloid","Tabloid, 11 by 17"]]
        .map(([k,n])=>`<option value="${k}"${EXPORTOPT.paper===k?" selected":""}>${n}</option>`).join("")}</select></label>
    ${sc?`<label class="fld"><span>Size on the page</span><select id="xmode">
        <option value="fit"${EXPORTOPT.mode==="fit"?" selected":""}>Fit the page</option>
        <option value="scale"${EXPORTOPT.mode==="scale"?" selected":""}>Fixed ratio, so it can be measured with a ruler</option></select></label>
      <label class="fld" id="xratiof"${EXPORTOPT.mode==="scale"?"":' hidden'}><span>One inch on paper equals</span><select id="xratio">
        ${[1,2,4,5,8,10,16,20,25,30,40,50,100].map(n=>`<option value="${n}"${EXPORTOPT.ratio===n?" selected":""}>${n} ${u}</option>`).join("")}</select></label>`
      :`<p class="hint" style="margin:0 0 12px">Set the scale to print at a fixed ratio.</p>`}
    ${measRows(sk).length?`<p class="hint" style="margin:0 0 12px">${measRows(sk).length} measurement${measRows(sk).length===1?"":"s"} print in a table under the sketch.</p>`:""}
    <label class="chkrow"><input type="checkbox" id="xvec"${EXPORTOPT.vector?" checked":""}><span>Vector drawing in the PDF — sharper when zoomed, needs a connection the first time</span></label>
    <button class="btn" id="xpdf" style="max-width:none;margin:0">Export PDF</button>
    <button class="btn sec" id="xdxf" style="max-width:none">Export DXF for CAD</button>
    <p class="hint" style="margin:6px 0 0">DXF opens in AutoCAD, FARO Zone, Map360 and most reconstruction software. Symbols go across as outlines with their names.</p>
    <button class="btn sec" id="xx" style="max-width:none">Cancel</button>`);
  const grabOpt=()=>{EXPORTOPT.paper=$("#xpaper").value; const xv=$("#xvec"); EXPORTOPT.vector=!!(xv&&xv.checked);
    const m=$("#xmode"); EXPORTOPT.mode=m?m.value:"fit";
    const r=$("#xratio"); if(r)EXPORTOPT.ratio=+r.value};
  const m=$("#xmode"); if(m)m.onchange=()=>{$("#xratiof").hidden=m.value!=="scale"};
  $("#xx").onclick=closeSheet;
  $("#xpdf").onclick=()=>{grabOpt(); if(!(sk.objs||[]).length)return toast("Nothing drawn yet");
    closeSheet(); toast("Building the PDF…"); exportSketch(sk)};
  $("#xdxf").onclick=()=>{grabOpt(); if(!(sk.objs||[]).length)return toast("Nothing drawn yet");
    closeSheet(); exportDXF(sk)};
}
function exportDXF(sk){
  const sc=scaleOf(sk), k=sc?unitsPer(sk):1, unit=sc?(sc.unit||"ft"):"units";
  const INS={ft:2,m:6,in:1,cm:5}[unit]||0, PH=pageH(sk);
  const f=n=>String(Math.round(n*1000)/1000);
  const tx=(x,y)=>[x*k,(PH-y)*k];
  const pt=(o,fx,fy)=>{const p=objPt(o,fx,fy);return tx(p.x,p.y)};
  const L=[]; const put=(...a)=>a.forEach(v=>L.push(String(v)));
  const clean=s=>String(s||"").replace(/′/g,"'").replace(/″/g,'"').replace(/—/g,"-").replace(/[\r\n]+/g," ");
  const lname=n=>(String(n||"").replace(/[^A-Za-z0-9_\-]/g,"_").slice(0,31)||"L1").toUpperCase();
  const layers=[...new Set(layersOf(sk).map(l=>lname(l.name)).concat(["LABELS","MARKERS","DIMENSIONS","MEASUREMENTS","NOTES"]))];
  const layOf=o=>lname((layerOf(sk,o)||{}).name);
  const line=(lay,a,b)=>put(0,"LINE",8,lay,10,f(a[0]),20,f(a[1]),30,0,11,f(b[0]),21,f(b[1]),31,0);
  const pline=(lay,pts,closed)=>{put(0,"POLYLINE",8,lay,66,1,70,closed?1:0,10,0,20,0,30,0);
    pts.forEach(p=>put(0,"VERTEX",8,lay,10,f(p[0]),20,f(p[1]),30,0)); put(0,"SEQEND",8,lay)};
  const circle=(lay,c,r)=>put(0,"CIRCLE",8,lay,10,f(c[0]),20,f(c[1]),30,0,40,f(r));
  const text=(lay,p,h,s,rot,centre)=>{ if(!clean(s).trim())return;
    put(0,"TEXT",8,lay,10,f(p[0]),20,f(p[1]),30,0,40,f(h),1,clean(s),50,f(rot||0));
    if(centre)put(72,1,11,f(p[0]),21,f(p[1]),31,0)};
  const ellipse=(lay,o)=>{const pts=[]; for(let i=0;i<36;i++){const a=i/36*Math.PI*2; pts.push(pt(o,.5+Math.cos(a)/2,.5+Math.sin(a)/2))} pline(lay,pts,true)};
  const objs=sk.objs||[];
  const xs=[],ys=[];
  objs.forEach(o=>{
    const lay=layOf(o), rot=-(o.r||0), c=pt(o,.5,.5), box=[pt(o,0,0),pt(o,1,0),pt(o,1,1),pt(o,0,1)];
    box.forEach(p=>{xs.push(p[0]);ys.push(p[1])});
    const t=o.t;
    if(t==="dim"){const a=tx(o.x,o.y), b=tx(o.x+o.w,o.y+o.h);
      line("DIMENSIONS",a,b);
      const ang=Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
      text("DIMENSIONS",[(a[0]+b[0])/2,(a[1]+b[1])/2+2*k],9*k,(o.label&&o.label.trim())||measure(sk,dimLen(o))||"",Math.abs(ang)>90?ang+180:ang,true)}
    else if(t==="line"||t==="arrow"||t==="baseline"||LINETYPES.has(t)){
      line(lay,pt(o,0,.5),pt(o,1,.5));
      if(t==="arrow"||t==="travel"){line(lay,pt(o,1,.5),pt(o,.84,.1));line(lay,pt(o,1,.5),pt(o,.84,.9))}
      if(t!=="line"&&t!=="arrow")text(lay,pt(o,.5,-.2),7*k,SHAPENAME(t),rot,true)}
    else if(t==="poly"&&o.pts&&o.pts.length>=3)pline(lay,o.pts.map(([fx,fy])=>pt(o,fx,fy)),true);
    else if(t==="ink"&&o.pts&&o.pts.length>=2)pline(lay,o.pts.map(([fx,fy])=>pt(o,fx,fy)),false);
    else if(t==="circle"||t==="areaell"||t==="roundtable"||t==="pole"){ if(Math.abs(o.w-o.h)<2)circle(lay,c,o.w/2*k); else ellipse(lay,o) }
    else if(t==="text")text(lay,pt(o,0,.85),o.h*.72*k,o.label||"",rot);
    else if(t==="marker"||t==="photopoint"||t==="refpoint"){
      const r=Math.min(o.w,o.h)/2*k; circle("MARKERS",c,r);
      text("MARKERS",[c[0],c[1]-r*.35],r*.7,(t==="photopoint"?"P":t==="refpoint"?"RP":"")+(o.n||""),0,true)}
    else if(t==="legend"){ pline(lay,box,true); text(lay,pt(o,.03,.12),10*k,"Legend",rot);
      legendRows(sk).forEach((m,i)=>text(lay,pt(o,.03,.22+i*.09),8*k,(m.n||"?")+"  "+(m.label||"not named"),rot))}
    else { pline(lay,box,true);
      if(!["wall","rect","room","building","area","window","door"].includes(t)&&!AREAS.has(t))text(lay,c,Math.min(8*k,o.h*.3*k),SHAPENAME(t),rot,true)}
    if(o.label&&t!=="text"&&t!=="dim")text("LABELS",[c[0],c[1]-(o.h/2+14)*k],10*k,o.label,0,true);
  });
  objs.forEach(o=>{ if(!o.meas)return;
    const A=refPt(sk,o.meas.a), B=refPt(sk,o.meas.b); if(!A||!B)return;
    const P=objPt(o,.5,.5), a=tx(A.x,A.y), b=tx(B.x,B.y), p=tx(P.x,P.y);
    if(o.meas.m==="tri"){line("MEASUREMENTS",a,p);line("MEASUREMENTS",b,p);
      text("MEASUREMENTS",[(a[0]+p[0])/2,(a[1]+p[1])/2],7*k,fmtLen(sk,realPx(sk,o.meas.da)),0,true);
      text("MEASUREMENTS",[(b[0]+p[0])/2,(b[1]+p[1])/2],7*k,fmtLen(sk,realPx(sk,o.meas.db)),0,true)}
    else{const foot=solveMeas(sk,Object.assign({},o.meas,{db:0})); if(o.meas.m!=="polar")line("MEASUREMENTS",a,b);
      if(foot){const fp=tx(foot.x,foot.y); line("MEASUREMENTS",a,fp); line("MEASUREMENTS",fp,p);
        text("MEASUREMENTS",[(a[0]+fp[0])/2,(a[1]+fp[1])/2],7*k,fmtLen(sk,realPx(sk,o.meas.da)),0,true);
        if(o.meas.db>0)text("MEASUREMENTS",[(fp[0]+p[0])/2,(fp[1]+p[1])/2],7*k,fmtLen(sk,realPx(sk,o.meas.db)),0,true)}}
  });
  const note=[sk.caseNo?"Case "+sk.caseNo:"", sk.addr||"", sk.depicts||"",
    sc?"Units: "+unit+". Drawn to scale.":"Not to scale. Units are sketch units.",
    "Exported from FSU "+APP_VERSION+" on "+new Date().toISOString().slice(0,16).replace("T"," ")+". The case file remains the record."].filter(Boolean).join(" - ");
  text("NOTES",[0,-12*k],9*k,note,0);
  const minx=xs.length?Math.min(...xs):0, miny=ys.length?Math.min(...ys,-12*k):0, maxx=xs.length?Math.max(...xs):pageW(sk)*k, maxy=ys.length?Math.max(...ys):PH*k;
  const head=[0,"SECTION",2,"HEADER",9,"$ACADVER",1,"AC1009",9,"$INSUNITS",70,INS,
    9,"$EXTMIN",10,f(minx),20,f(miny),30,0,9,"$EXTMAX",10,f(maxx),20,f(maxy),30,0,0,"ENDSEC",
    0,"SECTION",2,"TABLES",0,"TABLE",2,"LTYPE",70,1,0,"LTYPE",2,"CONTINUOUS",70,0,3,"Solid line",72,65,73,0,40,0,0,"ENDTAB",
    0,"TABLE",2,"LAYER",70,layers.length];
  layers.forEach(l=>head.push(0,"LAYER",2,l,70,0,62,7,6,"CONTINUOUS"));
  head.push(0,"ENDTAB",0,"ENDSEC",0,"SECTION",2,"ENTITIES");
  const out=head.map(String).concat(L,["0","ENDSEC","0","EOF"]).join("\r\n")+"\r\n";
  const safe=String(sk.caseNo||"sketch").replace(/[^a-z0-9]+/gi,"-").toLowerCase();
  dlBlob(new Blob([out],{type:"application/dxf"}),safe+"-sketch-"+new Date().toISOString().slice(0,10)+".dxf");
  toast("DXF exported — "+objs.length+" object"+(objs.length===1?"":"s")+(sc?", in "+unit:""));
}

/* ---- hooks called from the existing listeners ---- */
function sketchExtraClick(e,skc){
  const t=e.target;
  const ad=t.closest("[data-add]");
  if(ad&&ad.dataset.add==="poly"){ if(!skc)return true; polyStart(); return true }
  if(t.closest("[data-polyundo]")){ if(polyDraw)polyDraw.pts.pop(); keepScroll(()=>renderSketch()); return true }
  if(t.closest("[data-polydone]")){ polyFinish(); return true }
  if(t.closest("[data-polyx]")){ polyDraw=null; keepScroll(()=>renderSketch()); return true }
  if(t.closest("[data-skgrid]")){ skGrid=t.closest("[data-skgrid]").dataset.skgrid==="1"; keepScroll(()=>renderSketch()); return true }
  if(t.closest("[data-skmeasl]")){ if(skc){skc.showMeas=!skc.showMeas; saveLocal(); keepScroll(()=>renderSketch())} return true }
  if(!skc)return false;
  if(t.closest("[data-skwalls]")){ wallSheet(skc); return true }
  if(t.closest("[data-sktpl]")){ tplSheet(skc); return true }
  if(t.closest("[data-skexport]")){ exportSheet(skc); return true }
  if(t.closest("[data-skmeas]")){
    let o=objAt(selObj);
    if(!o){ addObj("marker"); o=objAt(selObj); if(!o)return true; showSet=true }
    measSheet(skc,o); return true }
  const om=t.closest("[data-omeas]");
  if(om){ const o=objAt(om.dataset.omeas); if(o)measSheet(skc,o); return true }
  const oc=t.closest("[data-ocopy]");
  if(oc){ const o=objAt(oc.dataset.ocopy); if(o){STYLECLIP={ink:o.ink||"",fp:o.fp,t:o.t};
      keepScroll(()=>renderSketch()); toast("Style copied — select another object and paste")} return true }
  const op=t.closest("[data-opaste]");
  if(op){ const o=objAt(op.dataset.opaste); if(o&&STYLECLIP){pushUndo(skc); o.ink=STYLECLIP.ink;
      if(AREAS.has(o.t)&&STYLECLIP.fp)o.fp=STYLECLIP.fp; saveLocal(); keepScroll(()=>renderSketch())} return true }
  const of=t.closest("[data-ofav]");
  if(of){ const ty=of.dataset.ofav, F=favs(), i=F.indexOf(ty);
    if(i>-1)F.splice(i,1); else F.unshift(ty); if(F.length>12)F.length=12;
    save(); keepScroll(()=>renderSketch()); toast(i>-1?"Removed from favourites":"Added to favourites"); return true }
  const av=t.closest("[data-oaddvtx]");
  if(av){ const o=objAt(av.dataset.oaddvtx); if(o&&o.pts&&o.pts.length>=3){ pushUndo(skc);
      let best=0,bd=-1; for(let i=0;i<o.pts.length;i++){const a=o.pts[i],b=o.pts[(i+1)%o.pts.length];
        const d=Math.hypot((b[0]-a[0])*o.w,(b[1]-a[1])*o.h); if(d>bd){bd=d;best=i}}
      const a=o.pts[best],b=o.pts[(best+1)%o.pts.length];
      o.pts.splice(best+1,0,[(a[0]+b[0])/2,(a[1]+b[1])/2]); saveLocal(); keepScroll(()=>renderSketch())} return true }
  const dv=t.closest("[data-odelvtx]");
  if(dv){ const o=objAt(dv.dataset.odelvtx); if(o&&o.pts&&o.pts.length>3){pushUndo(skc); o.pts.pop(); polyNormalize(o); saveLocal(); keepScroll(()=>renderSketch())} return true }
  return false;
}
function extraPointerDown(e,svg,p){
  if(polyDraw){
    const q={x:snapVal(p.x),y:snapVal(p.y)}, P=polyDraw.pts;
    if(P.length>=3&&Math.hypot(q.x-P[0].x,q.y-P[0].y)<16){polyFinish();e.preventDefault();return true}
    P.push(q); keepScroll(()=>renderSketch()); e.preventDefault(); return true }
  const vEl=e.target.closest("[data-vtx]");
  if(vEl){ const [id,i]=vEl.dataset.vtx.split(":"), o=objAt(id), sk=curSk(); if(!o||!sk)return true;
    if(layerLocked(sk,o)){toast("Layer is locked");return true}
    pushUndo(sk); drag={mode:"vtx",o,i:+i};
    try{svg.setPointerCapture&&svg.setPointerCapture(e.pointerId)}catch(_){}
    e.preventDefault(); return true }
  return false;
}
function extraPointerMove(e,p,o){
  if(drag.mode!=="vtx")return false;
  const cx=o.x+o.w/2, cy=o.y+o.h/2, a=-(o.r||0)*Math.PI/180;
  const lx=(p.x-cx)*Math.cos(a)-(p.y-cy)*Math.sin(a)+o.w/2, ly=(p.x-cx)*Math.sin(a)+(p.y-cy)*Math.cos(a)+o.h/2;
  o.pts[drag.i]=[lx/o.w,ly/o.h];
  const g=document.querySelector(`[data-obj="${o.id}"]`); if(g)g.outerHTML=objSVG(o,true);
  e.preventDefault(); return true;
}


