/* ---------- app extensions, round four ----------
   one Scenes list, home by urgency and a setup checklist, a guided sweep, item cards with counts,
   guide verification, reorder states, reagent and regulated fields, QR labels and deep links,
   initials and an activity log, folded data view, count mode. */

/* who is doing this, and what was done */
function whoIs(cb){
  if(S.who)return cb(S.who);
  openSheet(`<h3>Your initials</h3>
    <p class="hint" style="margin:0 0 12px">Recorded against sweeps, counts, verifications and exports, so a question later has an answer. Change them under Settings.</p>
    <label class="fld"><span>Initials</span><input type="text" id="whoask" autocapitalize="characters" maxlength="6" placeholder="DA"></label>
    <button class="btn" id="whook" style="max-width:none;margin:0">Continue</button>
    <button class="btn sec" id="whox" style="max-width:none">Cancel</button>`);
  $("#whox").onclick=closeSheet;
  $("#whook").onclick=()=>{const v=$("#whoask").value.trim().toUpperCase().slice(0,6); if(!v)return toast("Initials are needed");
    S.who=v; save(); closeSheet(); cb(v)};
  setTimeout(()=>{const el=$("#whoask"); if(el)el.focus()},80);
}
function logAct(kind,text){
  try{ S.activity=(S.activity||[]).slice(-499);
    S.activity.push({t:new Date().toISOString(),who:S.who||"",k:kind,m:String(text).slice(0,200)}) }catch(_){}
}
function activityHTML(){
  const a=(S.activity||[]).slice(-40).reverse();
  if(!a.length)return `<p class="hint">Nothing yet. Sweeps, counts, verifications, exports and label scans are listed here with who did them.</p>`;
  return `<div style="margin-bottom:8px">${a.map(x=>`<div class="errrow"><span class="et">${esc(String(x.t||"").slice(0,16).replace("T"," "))}${x.who?" · "+esc(x.who):""}</span><span class="em">${esc(x.m)}</span></div>`).join("")}</div>`;
}

/* one Scenes list */
let scenesTab="open";
function scenesSeg(){
  return `<div class="seg" style="margin-bottom:12px">
    <button data-scenestab="open"${scenesTab==="open"?' class="on"':''}>Open${openIncidents().length?" · "+openIncidents().length:""}</button>
    <button data-scenestab="closed"${scenesTab==="closed"?' class="on"':''}>Closed${closedIncidents().length?" · "+closedIncidents().length:""}</button></div>`;
}

/* a sketch with a case number and no incident */
function offerIncident(sk){
  setTimeout(()=>askConfirm("File it to an incident?",
    "This sketch has a case number but no incident. An incident keeps the entry log, evidence log, sketch and report together and bundles them at the end.",
    "Start incident "+sk.caseNo,false,()=>{
      const inc=newIncident(); inc.caseNo=sk.caseNo; inc.addr=sk.addr||""; inc.offence=sk.offence||"";
      sk.incidentId=inc.id; let n=0; (sk.objs||[]).forEach(o=>{if(o.t==="marker")n+=syncMarker(sk,o)});
      logAct("incident","Started incident "+inc.caseNo+" from a sketch"); save(); renderSketch();
      toast("Incident started"+(n?" — markers written to the evidence log":""))}),450);
}

/* home: a setup checklist while the unit is still being logged */
function setupCard(){
  if(S.setupHide&&Date.now()-Date.parse(S.setupHide)<7*86400000)return "";
  const cs=comps(), L=live(); if(!cs.length&&!L.length)return "";
  const rows=[
    [cs.filter(c=>!(c.desc||"").trim()).length,"compartment|compartments|not named","compartments"],
    [L.filter(i=>!placed(i)).length,"item|items|not placed in a compartment","sweep"],
    [L.filter(i=>placed(i)&&!String(i.par||"").trim()).length,"item|items|without a par level","tidy"],
    [L.filter(i=>(i.steps||[]).length&&!i.verified).length,"instruction set|instruction sets|unverified","verify"],
    [cs.filter(c=>!c.checked).length,"compartment|compartments|not swept","sweep"]].filter(r=>r[0]>0)
    .map(r=>{const [one,many,rest]=r[1].split("|"); return [r[0],(r[0]===1?one:many)+" "+rest,r[2]]});
  if(!rows.length)return "";
  return `<div class="setupcard"><div class="sh"><b>Set up this unit</b><span>${5-rows.length} of 5 done</span>
      <button class="lnkbtn" data-setuphide="1">Hide for a week</button></div>
    ${rows.map(([n,l,g])=>`<button class="act" ${g==="verify"?'data-verifyrun="1"':'data-go="'+g+'"'}><span>${n} ${l}</span><span class="chev">&#8250;</span></button>`).join("")}</div>`;
}

/* the sweep: by bay, with names, and a next button */
function nextUnchecked(after){
  const cs=comps(); if(!cs.length)return null;
  let start=after?cs.findIndex(c=>c.code===after)+1:0;
  for(let k=0;k<cs.length;k++){const c=cs[(start+k)%cs.length]; if(!c.checked)return c}
  return null;
}
function sweepNextBar(cs,cur){
  const left=cs.filter(c=>!c.checked).length; if(!cs.length)return "";
  if(!left)return `<div class="okbox" style="margin-bottom:12px">Every compartment has been checked this sweep.</div>`;
  const nxt=nextUnchecked(cur);
  return `<div class="polybar"><span>${left} of ${cs.length} still to check${nxt?" — next is "+esc(nxt.code)+(nxt.desc?", "+esc(nxt.desc):""):""}</span>
    <button data-sweepnext="1">${cur?"Go to the next":"Start with the first"}</button>
    <button data-scan="sweep">Scan a label</button></div>`;
}
function sweepList(cs,cur){
  const groups={}; cs.forEach(c=>{const b=bayOf(c.code);(groups[b]=groups[b]||[]).push(c)});
  return Object.keys(groups).sort().map(b=>{const g=groups[b], done=g.filter(c=>c.checked).length;
    return `<div class="sect">${esc(BAYNAME[b]||("Bay "+b))} — ${done} of ${g.length} swept</div><div class="rows">`
      +g.map(c=>{const st=compState(c.code), n=st.items.length;
        return `<button class="row${c.code===cur?" on":""}" data-loc="${esc(c.code)}">
          <span><span class="code">${esc(c.code)}</span><span class="desc">${esc(c.desc||"Not named yet")}${n?" · "+n+(n===1?" item":" items"):""}</span></span>
          <span class="rt"><span class="badge b-${c.checked?"good":"unchecked"}">${c.checked?"Swept":"Not checked"}</span><span class="chev">&#8250;</span></span></button>`}).join("")+`</div>`}).join("");
}
const regUncounted=code=>live().filter(i=>i.loc===code&&i.cls==="Regulated"&&i.counted!==today());
function markSweptNext(code){
  const cc=S.comps.find(x=>x.code===code); if(!cc)return;
  cc.checked=today(); logAct("sweep","Swept "+cc.code); save();
  const n=nextUnchecked(code);
  if(n){ S.curLoc=n.code; S.pick=false; S.lastCat=""; save(); renderSweep(); toast("Swept — next is "+n.code+(n.desc?", "+n.desc:""));
    const f=$("#q-name")||$("#f-name"); if(f)f.focus() }
  else { S.curLoc=""; save(); renderSweep(); toast("Swept — that was the last one");
    if(S.lastBackup!==today())setTimeout(()=>askConfirm("Sweep finished","All "+S.comps.length+" compartments are checked. Back up now so there is a copy off this device.","Back up",false,()=>backupOut()),700) }
}

/* item cards on a phone, with counts you can tap */
function itemCard(i,flagHtml){
  return `<div class="icard"><button class="row" data-item="${i.id}">
      <span><span class="code">${esc(i.name)}</span>
      <span class="desc">${esc(i.loc||"—")}${i.par?" · par "+esc(i.par):""}${i.cls?" · "+esc(i.cls):""}<br>${esc(catName(i.cat))}</span></span>
      <span class="rt">${flagHtml}<span class="chev">&#8250;</span></span></button>
    <div class="iq"><button data-qty="${i.id}:-1" aria-label="One fewer">&minus;</button><span class="qn">${esc(i.qty)}</span>
      <button data-qty="${i.id}:1" aria-label="One more">+</button>
      <button data-qout="${i.id}"${isOut(i)?' class="on"':''}>${isOut(i)?"Out":"Mark out"}</button></div></div>`;
}
function setQty(i,q){
  i.qty=String(Math.max(0,q));
  if(n(i.qty)===0)i.status="Out"; else if(i.status==="Out")i.status="Stocked";
}

/* guide verification, one set at a time */
function verifyRun(){
  whoIs(who=>{
    const list=live().filter(i=>(i.steps||[]).length&&(!i.verified||isStale(i))).sort((a,b)=>a.name.localeCompare(b.name));
    if(!list.length)return toast("Every set of instructions has a verified date within the year");
    let idx=0, done=0;
    const finish=()=>{closeSheet(); save(); if(view==="guide")renderGuide(); else render(); toast(done+" verified")};
    const draw=()=>{
      if(idx>=list.length)return finish();
      const i=list[idx];
      openSheet(`<h3>Verify ${idx+1} of ${list.length}</h3>
        <div class="idsect" style="margin-top:0">${esc(i.name)}</div>
        <p class="hint" style="margin:0 0 10px">${esc(i.source||"No source recorded")} · ${i.verified?"last verified "+esc(i.verified):"never verified"}</p>
        <div class="steps">${(i.steps||[]).map((s,x)=>`<div class="step"><i>${x+1}</i><p>${esc(s)}</p></div>`).join("")}</div>
        <div class="stackb" style="margin-top:12px">
          <button class="btn" id="vfok" style="max-width:none;margin:0">Confirmed against the current sheet</button>
          <button class="btn sec" id="vffix" style="max-width:none">Needs fixing</button>
          <button class="btn sec" id="vfskip" style="max-width:none">Skip</button>
          <button class="btn sec" id="vfx" style="max-width:none">Stop</button></div>`);
      $("#vfok").onclick=()=>{i.verified=today(); i.verifiedBy=who; delete i.verifyNote; done++; logAct("verify","Verified instructions for "+i.name); idx++; draw()};
      $("#vffix").onclick=()=>{i.verifyNote="Needs fixing, "+today()+(who?" ("+who+")":""); logAct("verify",i.name+" instructions flagged as needing fixing"); idx++; draw()};
      $("#vfskip").onclick=()=>{idx++; draw()};
      $("#vfx").onclick=finish;
    };
    draw();
  });
}

/* counts: every compartment in turn, or the regulated items in one */
function countRows(items){
  return items.map(i=>`<div class="countrow"><span>${esc(i.name)}${i.par?` <span class="hint" style="display:inline">· par ${esc(i.par)}</span>`:""}</span>
    <input type="text" inputmode="numeric" data-cnt="${i.id}" value="${esc(i.qty)}" aria-label="Count of ${esc(i.name)}"></div>`).join("");
}
function applyCounts(who){
  let changed=0;
  $$("[data-cnt]").forEach(el=>{const i=S.items.find(x=>x.id===el.dataset.cnt); if(!i)return;
    const v=parseInt(el.value,10); if(isNaN(v))return;
    if(v!==n(i.qty)){setQty(i,v);changed++}
    i.counted=today(); i.countedBy=who});
  return changed;
}
function countRun(){
  whoIs(who=>{
    const cs=comps().filter(c=>live().some(i=>i.loc===c.code));
    if(!cs.length)return toast("Nothing is placed in a compartment yet");
    let idx=0, changed=0;
    const summary=()=>{
      const short=live().filter(i=>isOut(i)||isLow(i));
      logAct("count","Counted stock in "+cs.length+" compartment"+(cs.length===1?"":"s")+", "+changed+" change"+(changed===1?"":"s"));
      save();
      openSheet(`<h3>Count finished</h3>
        <p class="hint" style="margin:0 0 12px">${cs.length} compartments counted, ${changed} quantit${changed===1?"y":"ies"} changed.</p>
        ${short.length?`<div class="sect" style="margin-top:0">Below par or out — ${short.length}</div><div class="rows">${short.map(i=>`<button class="row" data-item="${i.id}"><span><span class="code">${esc(i.name)}</span><span class="desc">${esc(i.loc||"")} · ${esc(i.qty)} in stock${i.par?" · par "+esc(i.par):""}</span></span><span class="rt"><span class="chev">&#8250;</span></span></button>`).join("")}</div>
          <button class="btn" data-go="reorder" style="max-width:none;margin:12px 0 0">Open the reorder list</button>`
          :`<div class="okbox">Nothing is short.</div>`}
        <button class="btn sec" id="ctx" style="max-width:none">Close</button>`);
      $("#ctx").onclick=()=>{closeSheet(); render()};
    };
    const draw=()=>{
      if(idx>=cs.length)return summary();
      const c=cs[idx], items=live().filter(i=>i.loc===c.code).sort((a,b)=>a.name.localeCompare(b.name));
      openSheet(`<h3>Count ${idx+1} of ${cs.length} — ${esc(c.code)}</h3>
        <p class="hint" style="margin:0 0 10px">${esc(c.desc||"")}${c.side?" · "+esc(c.side):""}. Type what is actually there.</p>
        ${countRows(items)}
        <div class="stackb" style="margin-top:12px">
          <button class="btn" id="ctnext" style="max-width:none;margin:0">${idx+1<cs.length?"Next compartment":"Finish"}</button>
          ${idx?`<button class="btn sec" id="ctback" style="max-width:none">Back</button>`:""}
          <button class="btn sec" id="ctstop" style="max-width:none">Stop</button></div>`);
      $("#ctnext").onclick=()=>{changed+=applyCounts(who); save(); idx++; draw()};
      const bk=$("#ctback"); if(bk)bk.onclick=()=>{changed+=applyCounts(who); save(); idx--; draw()};
      $("#ctstop").onclick=()=>{changed+=applyCounts(who); logAct("count","Counted stock in "+(idx+1)+" compartment"+(idx?"s":"")+", stopped early"); save(); closeSheet(); render(); toast("Stopped — counts so far are kept")};
      setTimeout(()=>{const f=$("[data-cnt]"); if(f){f.focus();f.select&&f.select()}},80);
    };
    draw();
  });
}
function countSheet(code,itemsOverride){
  whoIs(who=>{
    const items=itemsOverride||live().filter(i=>i.loc===code&&i.cls==="Regulated");
    if(!items.length)return toast("No regulated items here");
    openSheet(`<h3>Count regulated items${code?" — "+esc(code):""}</h3>
      <p class="hint" style="margin:0 0 10px">Regulated stock is counted every sweep. Type what is there.</p>
      ${countRows(items)}
      <button class="btn" id="rcok" style="max-width:none;margin:12px 0 0">Save the count</button>
      <button class="btn sec" id="rcx" style="max-width:none">Cancel</button>`);
    $("#rcx").onclick=closeSheet;
    $("#rcok").onclick=()=>{const ch=applyCounts(who); logAct("count","Counted "+items.length+" regulated item"+(items.length===1?"":"s")+(code?" in "+code:"")); save(); closeSheet(); render(); toast("Counted"+(ch?" — "+ch+" changed":""))};
  });
}
function lotSheet(i){
  openSheet(`<h3>${esc(i.name)}</h3>
    <label class="fld"><span>Lot or batch number</span><input type="text" id="lot1" value="${esc(i.lot||"")}" autocapitalize="characters"></label>
    <div class="two"><label class="fld"><span>Received</span><input type="date" id="lot2" value="${esc(i.received||"")}"></label>
      <label class="fld"><span>Opened</span><input type="date" id="lot3" value="${esc(i.opened||"")}"></label></div>
    <button class="btn" id="lotok" style="max-width:none;margin:0">Save</button>
    <button class="btn sec" id="lotx" style="max-width:none">Cancel</button>`);
  $("#lotx").onclick=closeSheet;
  $("#lotok").onclick=()=>{i.lot=$("#lot1").value.trim(); i.received=$("#lot2").value; i.opened=$("#lot3").value;
    logAct("lot","Lot details updated for "+i.name); save(); closeSheet(); renderItemDetail(); toast("Saved")};
}

/* the data view folds into sections */
const DATA_OPEN=new Set(["Saved on this device","Back up","Case material"]);
function foldData(){
  const root=$("#v-data"); if(!root)return;
  [...root.querySelectorAll(":scope > .idsect")].forEach(h=>{
    if(h.classList.contains("dhead"))return;
    const key=h.textContent.trim(), wrap=document.createElement("div"); wrap.className="dfold";
    let nx=h.nextSibling; const kids=[];
    while(nx&&!(nx.nodeType===1&&nx.classList.contains("idsect"))){kids.push(nx);nx=nx.nextSibling}
    kids.forEach(k=>wrap.appendChild(k)); h.after(wrap);
    const open=(S.dataOpen&&key in S.dataOpen)?!!S.dataOpen[key]:DATA_OPEN.has(key);
    wrap.hidden=!open; h.classList.add("dhead"); h.setAttribute("role","button"); h.setAttribute("tabindex","0"); h.dataset.dfold=key;
    h.innerHTML=`<span>${esc(key)}</span><span class="dchev">${open?"&#8722;":"+"}</span>`;
  });
}

/* labels and deep links */
const appUrl=()=>String(S.appUrl||"").trim()||(/^https?:/.test(location.protocol)?location.origin+location.pathname:"");
const qrText=(kind,val)=>{const b=appUrl(); return b?b+"#"+kind+"="+encodeURIComponent(val):"fsu:"+kind+":"+val};
let QRP=null;
function qrLib(){
  if(window.qrcode)return Promise.resolve();
  if(QRP)return QRP;
  QRP=new Promise((res,rej)=>{const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
    s.onload=res; s.onerror=()=>{QRP=null;rej(new Error("no network"))}; document.head.appendChild(s)});
  return QRP;
}
function labelHTML(kind,x){
  if(kind==="comps")return `<div class="label"><div class="qr" data-qr="${esc(qrText("c",x.code))}"></div><div class="lt"><b>${esc(x.code)}</b><span>${esc(x.desc||"")}</span><span>${esc(x.side||"")}</span></div></div>`;
  return `<div class="label"><div class="qr" data-qr="${esc(qrText("i",x.id))}"></div><div class="lt"><b>${esc(x.name)}</b><span>${esc(x.loc||"")}${x.par?" · par "+esc(x.par):""}</span></div></div>`;
}
function renderLabels(){
  $("#title").textContent="Labels";
  const cs=comps(), bays=[...new Set(cs.map(c=>bayOf(c.code)))].sort();
  const kind=S.labelKind||"comps", sel=S.labelBay||"all";
  const list=kind==="comps"?cs.filter(c=>sel==="all"||bayOf(c.code)===sel)
    :live().filter(i=>placed(i)&&(sel==="all"||bayOf(i.loc)===sel)).sort((a,b)=>(a.loc||"").localeCompare(b.loc||"")||a.name.localeCompare(b.name));
  $("#v-labels").innerHTML=`<div class="noprint">
    <button class="back" data-navback="compartments">&#8249; Storage</button>
    <div class="editbar"><button data-labelkind="comps"${kind==="comps"?' class="on"':''}>Compartments</button>
      <button data-labelkind="items"${kind==="items"?' class="on"':''}>Items</button>
      <button data-doprint="1">Print</button></div>
    <div class="filters">${["all"].concat(bays).map(b=>`<button data-labelbay="${b}" class="${sel===b?"sel":""}">${b==="all"?"All":esc(BAYNAME[b]||"Bay "+b)}</button>`).join("")}</div>
    <p class="hint" style="margin:0 0 12px">${appUrl()
      ?"Scan one with the camera app, or with Scan a label inside this app, and it opens at that "+(kind==="comps"?"compartment":"item")+". Print on plain paper or label stock; three across."
      :"No web address is set under Settings › Labels, so these codes only work with the in-app scanner."}</p></div>
    <div class="labelgrid" id="labelgrid">${list.map(x=>labelHTML(kind,x)).join("")||`<p class="hint">Nothing to label yet.</p>`}</div>`;
  qrLib().then(()=>{ $$("#labelgrid .qr[data-qr]").forEach(el=>{
      try{ const q=qrcode(0,"M"); q.addData(el.dataset.qr); q.make(); el.innerHTML=q.createSvgTag(3,0) }catch(e){ el.textContent="QR" } }) })
    .catch(()=>toast("The QR maker needs a connection the first time. The labels print without codes until then."));
}
function openTarget(kind,val,mode){
  if(kind==="c"){ if(!S.comps.some(c=>c.code===val))return toast("No compartment "+val+" is logged");
    logAct("scan","Opened "+val+" from a label");
    if(mode==="sweep"){S.curLoc=val;S.pick=false;save();renderSweep();const f=$("#q-name")||$("#f-name");if(f)f.focus();return}
    curComp=val; prevView="compartments"; view="compdetail"; window.scrollTo(0,0); render(); return }
  if(kind==="i"){ if(!S.items.some(i=>i.id===val))return toast("That item is no longer logged");
    curItem=val; prevView="inventory"; view="itemdetail"; window.scrollTo(0,0); render(); return }
  if(kind==="s"){ if(!(S.sketches||[]).some(s=>s.id===val))return toast("That sketch is not on this device"); curSketch=val; view="sketch"; render(); return }
  if(kind==="inc"){ if(!incidents().some(i=>i.id===val))return toast("That incident is not on this device"); curInc=val; view="incident"; render() }
}
function openScanned(text,mode){
  const s=String(text||""); const m=s.match(/#(c|i|s|inc)=([^&]+)/)||s.match(/^fsu:(c|i|s|inc):(.+)$/);
  if(!m)return toast("That isn't an FSU label");
  openTarget(m[1],decodeURIComponent(m[2]),mode);
}
function handleHash(){
  const m=location.hash.match(/^#(c|i|s|inc)=(.+)$/); if(!m)return;
  try{history.replaceState(null,"",location.pathname+location.search)}catch(_){}
  openTarget(m[1],decodeURIComponent(m[2]));
}
/* the scanner: live camera when the browser allows it, a photo from the camera app otherwise.
   BarcodeDetector where it exists (Chrome, Android), jsQR loaded on demand everywhere else (iPad, iPhone). */
let JSQRP=null;
function jsqrLib(){
  if(window.jsQR)return Promise.resolve();
  if(JSQRP)return JSQRP;
  JSQRP=new Promise((res,rej)=>{const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";
    s.onload=res; s.onerror=()=>{JSQRP=null;rej(new Error("no network"))}; document.head.appendChild(s)});
  return JSQRP;
}
const hasDetector=()=>"BarcodeDetector" in window;
function loadStill(file){
  if(typeof createImageBitmap==="function")return createImageBitmap(file);
  return new Promise((res,rej)=>{const u=URL.createObjectURL(file), im=new Image();
    im.onload=()=>{URL.revokeObjectURL(u);res(im)}; im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("not an image"))}; im.src=u});
}
// text of the first QR code in a video frame or a still, or null
async function decodeFrame(src){
  if(hasDetector()){
    try{ const det=new BarcodeDetector({formats:["qr_code"]}); const codes=await det.detect(src); if(codes.length)return codes[0].rawValue }catch(e){}
  }
  await jsqrLib();
  const sw=src.videoWidth||src.naturalWidth||src.width||0, sh=src.videoHeight||src.naturalHeight||src.height||0;
  if(!sw||!sh)return null;
  const k=Math.min(1,1024/sw), W=Math.round(sw*k), H=Math.round(sh*k);
  const c=decodeFrame.c||(decodeFrame.c=document.createElement("canvas"));
  c.width=W;c.height=H; const g=c.getContext("2d",{willReadFrequently:true}); g.drawImage(src,0,0,W,H);
  const d=g.getImageData(0,0,W,H); const r=jsQR(d.data,W,H,{inversionAttempts:"dontInvert"});
  return r&&r.data?r.data:null;
}
async function scanSheet(mode){
  const canLive=!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
  openSheet(`<h3>Scan a label</h3>
    ${canLive?`<video id="scv" playsinline muted style="width:100%;border-radius:12px;background:#000;aspect-ratio:4/3"></video>`:""}
    <p class="hint" id="scmsg" style="margin:10px 0">${canLive?"Hold the label in view.":"Take a photo of the label and it opens here."}</p>
    <label class="btn${canLive?" sec":""}" style="max-width:none;display:block;text-align:center;margin:0">${canLive?"Use the camera app instead":"Open the camera"}<input type="file" id="scfile" accept="image/*" capture="environment" style="display:none"></label>
    <button class="btn sec" id="scx" style="max-width:none">Cancel</button>`);
  let stream=null; const stop=()=>{ if(stream)stream.getTracks().forEach(t=>t.stop()); stream=null };
  const msg=t=>{const m=$("#scmsg"); if(m)m.textContent=t};
  $("#scx").onclick=()=>{stop();closeSheet()};
  const done=text=>{stop();closeSheet();openScanned(text,mode)};
  $("#scfile").onchange=async()=>{
    const f=$("#scfile").files&&$("#scfile").files[0]; if(!f)return;
    msg("Reading the photo…");
    try{
      const still=await loadStill(f);
      const text=await decodeFrame(still);
      if(text)return done(text);
      msg("No code found in that photo. Fill the frame with the label and try again.");
    }catch(e){ msg(e.message==="no network"?"The reader needs a connection the first time it is used.":"Could not read that photo.") }
  };
  if(!canLive)return;
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    const v=$("#scv"); if(!v){stop();return} v.srcObject=stream; await v.play();
    if(!hasDetector()){ try{ await jsqrLib() }catch(e){ msg("The reader needs a connection the first time it is used. Until then, use the camera app."); return } }
    const tick=async()=>{ if(!stream)return;
      try{ const text=await decodeFrame(v); if(text)return done(text) }catch(e){}
      setTimeout(tick,hasDetector()?250:120) };
    tick();
  }catch(e){ msg("The camera could not be opened here. Use the camera app instead."); const v=$("#scv"); if(v)v.style.display="none" }
}

/* the click hook, checked first */
function appExtraClick(e){
  const t=e.target;
  const st=t.closest("[data-scenestab]"); if(st){scenesTab=st.dataset.scenestab; view="active"; render(); return true}
  if(t.closest("[data-setuphide]")){S.setupHide=new Date().toISOString(); save(); render(); return true}
  const df=t.closest("[data-dfold]"); if(df){S.dataOpen=S.dataOpen||{}; const k=df.dataset.dfold; S.dataOpen[k]=!((k in S.dataOpen)?S.dataOpen[k]:DATA_OPEN.has(k)); saveLocal(); const y=scrollY; renderData(); scrollTo(0,y); return true}
  if(t.closest("[data-sweepnext]")){const nx=nextUnchecked(S.curLoc); if(!nx)return toast("Nothing left to check"),true;
    S.curLoc=nx.code; S.pick=false; S.lastCat=""; save(); renderSweep(); const f=$("#q-name")||$("#f-name"); if(f)f.focus(); return true}
  const sd=t.closest("[data-sweepdone]"); if(sd){const code=sd.dataset.sweepdone; const r=regUncounted(code);
    if(r.length){toast("Count the regulated items first"); countSheet(code,r); return true} markSweptNext(code); return true}
  const ck=t.closest("[data-check]"); if(ck){const r=regUncounted(ck.dataset.check); if(r.length){toast("Count the regulated items first"); countSheet(ck.dataset.check,r); return true} return false}
  const qy=t.closest("[data-qty]"); if(qy){const [id,d]=qy.dataset.qty.split(":"); const i=S.items.find(x=>x.id===id); if(!i)return true;
    setQty(i,n(i.qty)+(+d)); save(); const y=scrollY; renderInventory(); scrollTo(0,y); return true}
  const qo=t.closest("[data-qout]"); if(qo){const i=S.items.find(x=>x.id===qo.dataset.qout); if(!i)return true;
    if(isOut(i)){i.status="Stocked"; i.qty=String(Math.max(1,n(i.par))); toast(i.name+" back in stock at "+i.qty)} else {i.status="Out"; i.qty="0"; toast(i.name+" marked out")}
    logAct("stock",i.name+(isOut(i)?" marked out":" restocked")); save(); const y=scrollY; renderInventory(); scrollTo(0,y); return true}
  if(t.closest("[data-verifyrun]")){closeSheet(); verifyRun(); return true}
  if(t.closest("[data-countrun]")){closeSheet(); countRun(); return true}
  const ca=t.closest("[data-countall]"); if(ca){countSheet(ca.dataset.countall); return true}
  const cn=t.closest("[data-countnow]"); if(cn){const i=S.items.find(x=>x.id===cn.dataset.countnow); if(i)countSheet(i.loc||"",[i]); return true}
  const el=t.closest("[data-editlot]"); if(el){const i=S.items.find(x=>x.id===el.dataset.editlot); if(i)lotSheet(i); return true}
  const od=t.closest("[data-ordered]"); if(od){const i=S.items.find(x=>x.id===od.dataset.ordered); if(i){i.ordered=today(); logAct("reorder","Ordered "+i.name); save(); renderReorder()} return true}
  const rc=t.closest("[data-received]"); if(rc){const i=S.items.find(x=>x.id===rc.dataset.received); if(i){
      const need=Math.max(n(i.par)-n(i.qty),1); setQty(i,n(i.qty)+need); if(i.status==="Expired")i.status="Stocked"; delete i.ordered;
      logAct("reorder","Received "+i.name); save(); renderReorder(); toast(i.name+" now "+i.qty+" in stock")} return true}
  const uo=t.closest("[data-unordered]"); if(uo){const i=S.items.find(x=>x.id===uo.dataset.unordered); if(i){delete i.ordered; save(); renderReorder()} return true}
  if(t.closest("[data-doprint]")){window.print&&window.print(); return true}
  const sc=t.closest("[data-scan]"); if(sc){scanSheet(sc.dataset.scan); return true}
  const lk=t.closest("[data-labelkind]"); if(lk){S.labelKind=lk.dataset.labelkind; saveLocal(); renderLabels(); return true}
  const lb=t.closest("[data-labelbay]"); if(lb){S.labelBay=lb.dataset.labelbay; saveLocal(); renderLabels(); return true}
  return false;
}
document.addEventListener("change",e=>{
  const id=(e.target||{}).id||"";
  if(id==="whoin"){S.who=e.target.value.trim().toUpperCase().slice(0,6); save(); toast(S.who?"Initials set to "+S.who:"Initials cleared")}
  if(id==="appurl"){S.appUrl=e.target.value.trim(); save(); toast(S.appUrl?"Labels will point at "+S.appUrl:"Labels will use in-app codes")}
});
document.addEventListener("keydown",e=>{
  if((e.key==="Enter"||e.key===" ")&&e.target&&e.target.dataset&&e.target.dataset.dfold){e.preventDefault();e.target.click()}
});
window.addEventListener("hashchange",handleHash);
setTimeout(handleHash,80);


