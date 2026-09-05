/* ---------- reports and upkeep, round ten ----------
   report wording, auto-fill, photograph log, Word export, vector PDF, version stamp,
   vehicle check, part numbers, shift handover, service and calibration, help and change log. */
const APP_VERSION="2026.09.04.19";
const CHANGELOG=[
  ["2026-09-05","Every page opens as the main screen; the side-by-side pane is gone. On an iPad the sketch gets the width back: the side bar folds to icons while sketching and the tool rail is narrower."],
  ["2026-09-05","The side bar on wide screens folds to an icon rail with the chevron at its top, and remembers that on this device."],
  ["2026-09-04","Landscape only on the iPad: held upright, the app asks to be turned sideways. On by default on an iPad, off on phones, and switchable under Settings › Display."],
  ["2026-09-04","iPad: a bay opens as its own page. Picking any tool or symbol ends freehand drawing. Full screen is on the sketch toolbar. The object panel sits at the top of the right-hand rail beside the canvas. Lock rotation on any object."],
  ["2026-09-04","Symbol previews in the sketch palette, the symbols sheet and the layer list are readable in dark mode, including when dark is chosen under Settings rather than by the device."],
  ["2026-09-04","Scan a label works on every device: a live camera view where the browser allows it, with a QR reader that loads on first use, and a Use the camera app button that takes a photo of the label and reads it."],
  ["2026-09-04","Settings is a button at the top of Home and at the foot of the side navigation. The settings page is a menu of sections, each showing its state at a glance and opening on its own: initials, automatic saving, back up, restore, case packages, templates, wording, display, labels, storage, activity, errors, reset."],
  ["2026-09-04","Hosted on GitHub Pages with a printable install sheet. Bundle order is report, entry log, evidence log, sketch, photo log; each photograph sits on its photo log row; measurement tables no longer split across pages."],
  ["2026-09-04","Reports: wording snippets, auto-fill from the incident, a photograph log fed by photo points, Word export, a vector option for the sketch PDF. Upkeep: vehicle check, part numbers on the reorder list, shift handover, service and calibration on durable kit. Help page, change log and a version stamp on every export."],
  ["2026-09-04","Home, Scenes, Guide, Storage and Items redesigned around status tiles. Bay wall with true proportions, zoom and tap previews. Illustrated van. Ten symbols redrawn in plan view."],
  ["2026-09-04","Sketch: measurement entry, walls by dimension, 24 line types, area fills, templates, DXF, pinch zoom, tap to place, freehand ink, selection, live distances, case packages, install as an app, Playwright suite."]
];

/* ---- report wording ---- */
const SNIPPET_DEFAULTS=[
  ["Notification and arrival","On [date] at [time] the Forensic Services Unit was notified by [officer] of a [incident type] at [address]. I arrived at [time] and made contact with [officer], who briefed me on the circumstances and the extent of the scene."],
  ["Scene secured","On arrival the scene was secured by crime scene tape. An entry log was maintained by [officer] for the duration of processing."],
  ["Weather and lighting","Weather at the time of processing was [conditions]. Lighting was [natural daylight / artificial / scene lighting]."],
  ["Photography","The scene was photographed in overall, mid-range and close-up views before any item was moved. Evidence markers were then placed and the scene was photographed again with the markers in position."],
  ["Sketch","A rough sketch of the scene was prepared on scene. Measurements were taken by [baseline / triangulation] from fixed reference points and are recorded on the sketch."],
  ["Latent prints","Surfaces were examined for latent prints using [powder / reagent]. [number] lifts were recovered, each packaged and labelled individually."],
  ["Biological evidence","Suspected biological stains were photographed, recorded on the sketch and collected with sterile swabs. Swabs were air dried and packaged separately."],
  ["Impression evidence","[Footwear / tyre] impressions were photographed with a scale and [cast / lifted] as recorded in the evidence log."],
  ["Scene released","Processing concluded at [time] and the scene was released to [officer]."],
  ["Nothing further","No further forensic action was taken. All items collected were transported to the unit and secured."]
];
function snippets(){
  if(!Array.isArray(S.snippets)||!S.snippets.length){ S.snippets=SNIPPET_DEFAULTS.map(([name,text])=>({id:newId(),name,text})); saveLocal() }
  return S.snippets;
}
function snippetSheet(fieldId){
  const list=snippets();
  openSheet(`<h3>Insert wording</h3>
    <p class="hint" style="margin:0 0 12px">Tap a line to insert it at the cursor. Square brackets mark what to fill in. The library is under Settings › Report wording.</p>
    <div class="rows">${list.map(s=>`<button class="row" data-snipins="${s.id}"><span><span class="code">${esc(s.name)}</span><span class="desc">${esc(s.text.slice(0,96))}${s.text.length>96?"…":""}</span></span><span class="rt"><span class="chev">&#8250;</span></span></button>`).join("")}</div>
    <button class="btn sec" id="snx" style="max-width:none;margin:12px 0 0">Cancel</button>`);
  $("#snx").onclick=closeSheet;
  $$("[data-snipins]").forEach(b=>b.onclick=()=>{
    const s=list.find(x=>x.id===b.dataset.snipins), ta=document.querySelector(`textarea[data-fv="${fieldId}"]`);
    if(!s||!ta)return closeSheet();
    const st=ta.selectionStart??ta.value.length, en=ta.selectionEnd??st;
    const before=ta.value.slice(0,st), after=ta.value.slice(en), sep=before&&!/\s$/.test(before)?" ":"";
    ta.value=before+sep+s.text+after;
    ta.dispatchEvent(new Event("input",{bubbles:true}));
    closeSheet(); ta.focus(); const pos=(before+sep+s.text).length; try{ta.setSelectionRange(pos,pos)}catch(_){}
  });
}
function snippetManage(){
  const list=snippets();
  const edit=s=>{
    openSheet(`<h3>${s?"Edit wording":"New wording"}</h3>
      <label class="fld"><span>Name</span><input type="text" id="snn" value="${esc(s?s.name:"")}" placeholder="Scene secured"></label>
      <label class="fld"><span>Text</span><textarea id="snt" rows="6">${esc(s?s.text:"")}</textarea></label>
      <button class="btn" id="snok" style="max-width:none;margin:0">Save</button>
      ${s?`<button class="btn sec" id="sndel" style="max-width:none;color:var(--red);border-color:var(--red)">Delete</button>`:""}
      <button class="btn sec" id="snb" style="max-width:none">Back</button>`);
    $("#snb").onclick=snippetManage;
    $("#snok").onclick=()=>{const name=$("#snn").value.trim(), text=$("#snt").value.trim(); if(!name||!text)return toast("Name and text are both needed");
      if(s){s.name=name;s.text=text} else list.push({id:newId(),name,text}); save(); snippetManage(); toast("Saved")};
    const d=$("#sndel"); if(d)d.onclick=()=>{S.snippets=list.filter(x=>x!==s); save(); snippetManage(); toast("Deleted")};
  };
  openSheet(`<h3>Report wording</h3>
    <p class="hint" style="margin:0 0 12px">Standard sentences for the narrative report. Keep them in the unit's approved wording.</p>
    <div class="rows">${list.map(s=>`<button class="row" data-snipedit="${s.id}"><span><span class="code">${esc(s.name)}</span><span class="desc">${esc(s.text.slice(0,96))}${s.text.length>96?"…":""}</span></span><span class="rt"><span class="chev">&#8250;</span></span></button>`).join("")}</div>
    <button class="btn" id="snnew" style="max-width:none;margin:12px 0 0">Add wording</button>
    <button class="btn sec" id="snx2" style="max-width:none">Close</button>`);
  $("#snx2").onclick=closeSheet; $("#snnew").onclick=()=>edit(null);
  $$("[data-snipedit]").forEach(b=>b.onclick=()=>edit(list.find(x=>x.id===b.dataset.snipedit)));
}

/* ---- the photograph log follows the photo points ---- */
const compassOf=r=>["N","NE","E","SE","S","SW","W","NW"][Math.round((((+r||0)%360)+360)%360/45)%8];
function syncPhoto(sk,o){
  if(!sk||!sk.incidentId||!o||o.t!=="photopoint")return 0;
  const inc=incidentOf(sk.incidentId); if(!inc)return 0;
  const f=S.forms.find(x=>x.name==="Photograph log"); if(!f)return 0;
  const tbl=(f.fields||[]).find(x=>x.type==="table"); if(!tbl)return 0;
  let rec=(S.fills||[]).find(x=>x.incidentId===inc.id&&x.formId===f.id&&!x.exported);
  if(!rec){ rec=newFill(f); rec.incidentId=inc.id;
    const put=(re,v)=>{const fd=(f.fields||[]).find(x=>re.test(x.label)); if(fd&&v)rec.values[fd.id]=v};
    put(/case/i,inc.caseNo); put(/address|scene/i,inc.addr); put(/^date$/i,today()); put(/photographer/i,S.whoName||S.who||"") }
  const rows=Array.isArray(rec.values[tbl.id])?rec.values[tbl.id]:[];
  const num=String(o.n||"").trim(); if(!num)return 0;
  const key=(tbl.cols||[])[0]||"No.";
  let row=rows.find(r=>String((r||{})[key]||"").trim()===num);
  if(!row){row={};row[key]=num;rows.push(row)}
  if(o.label&&o.label.trim())row["What it shows"]=o.label.trim();
  row["Facing"]=compassOf(o.r);
  rec.values[tbl.id]=rows.filter(r=>Object.values(r||{}).some(v=>String(v||"").trim()));
  saveLocal(); return 1;
}
incidents().forEach(i=>{ if(Array.isArray(i.plan)&&!i.plan.includes("photolog")){const k=i.plan.indexOf("evidence"); i.plan.splice(k>-1?k+1:i.plan.length,0,"photolog")} });

/* ---- Word export ---- */
let ZIPP=null;
function zipLib(){
  if(window.JSZip)return Promise.resolve();
  if(ZIPP)return ZIPP;
  ZIPP=new Promise((res,rej)=>{const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload=res; s.onerror=()=>{ZIPP=null;rej(new Error("The Word export needs a connection the first time"))}; document.head.appendChild(s)});
  return ZIPP;
}
const xml=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function docxPara(text,opt){ opt=opt||{};
  const runs=String(text).split("\n").map((line,i)=>(i?"<w:r><w:br/></w:r>":"")+`<w:r>${opt.bold?"<w:rPr><w:b/></w:rPr>":""}<w:t xml:space="preserve">${xml(line)}</w:t></w:r>`).join("");
  return `<w:p>${opt.style?`<w:pPr><w:pStyle w:val="${opt.style}"/></w:pPr>`:""}${runs}</w:p>`;
}
function docxTable(cols,rows){
  const cell=(t,b)=>`<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${docxPara(t,{bold:b})}</w:tc>`;
  const borders=["top","left","bottom","right","insideH","insideV"].map(b=>`<w:${b} w:val="single" w:sz="4" w:space="0" w:color="888888"/>`).join("");
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${borders}</w:tblBorders></w:tblPr>
    <w:tr>${cols.map(c=>cell(c,true)).join("")}</w:tr>${rows.map(r=>`<w:tr>${cols.map(c=>cell((r||{})[c]||"",false)).join("")}</w:tr>`).join("")}</w:tbl><w:p/>`;
}
async function exportFillDocx(r){
  try{ await zipLib() }catch(e){ return toast(e.message) }
  const f=S.forms.find(x=>x.id===r.formId)||{fields:[]};
  let body=docxPara(r.formName,{style:"Title"})
    +docxPara("Williamsport Bureau of Police — Forensic Services Unit"+(r.rev?" · Revision "+r.rev:"")+" · Started "+r.started.slice(0,16).replace("T"," "));
  (f.fields||[]).forEach(x=>{ const v=r.values[x.id];
    if(x.type==="table"){ const rows=(Array.isArray(v)?v:[]).filter(row=>Object.values(row||{}).some(s=>String(s||"").trim()));
      body+=docxPara(x.label,{style:"Heading2"})+(rows.length?docxTable(x.cols||[],rows):docxPara("—")) }
    else if(x.type==="check")body+=docxPara((v?"☑ ":"☐ ")+x.label);
    else body+=docxPara(x.label,{style:"Heading2"})+docxPara(String(v||"—")) });
  body+=docxPara("Produced by FSU "+APP_VERSION+" on "+new Date().toISOString().slice(0,16).replace("T"," ")+". The case file remains the record.");
  const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:spacing w:before="200" w:after="60"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/></w:rPr></w:style><w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/></w:style></w:styles>`;
  const ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const drels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const z=new JSZip();
  z.file("[Content_Types].xml",ct); z.file("_rels/.rels",rels); z.file("word/document.xml",doc); z.file("word/styles.xml",styles); z.file("word/_rels/document.xml.rels",drels);
  const blob=await z.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
  const safe=String(fillCase(r)||"form").replace(/[^a-z0-9]+/gi,"-").toLowerCase();
  const name=safe+"-"+String(r.formName).replace(/[^a-z0-9]+/gi,"-").toLowerCase()+"-"+today()+".docx";
  try{ const file=new File([blob],name,{type:blob.type});
    if(navigator.canShare&&navigator.canShare({files:[file]})){ await navigator.share({files:[file],title:r.formName}); markExported(r); logAct("export","Exported "+r.formName+" as Word"); if(view==="fill")renderFill(); return toast("Word document saved") }
  }catch(e){ if(e&&e.name==="AbortError")return }
  dlBlob(blob,name); markExported(r); logAct("export","Exported "+r.formName+" as Word"); if(view==="fill")renderFill(); toast("Word document exported");
}

/* ---- vector drawing in the sketch PDF ---- */
let SVGP=null;
function svgPdfLib(){
  if(window.svg2pdf)return Promise.resolve();
  if(SVGP)return SVGP;
  SVGP=new Promise((res,rej)=>{const s=document.createElement("script");
    s.src="https://cdn.jsdelivr.net/npm/svg2pdf.js@2.2.4/dist/svg2pdf.umd.min.js";
    s.onload=res; s.onerror=()=>{SVGP=null;rej(new Error("no network"))}; document.head.appendChild(s)});
  return SVGP;
}
async function svgVector(doc,svgStr,x,y,w,h){
  let host=null;
  try{
    await svgPdfLib();
    host=document.createElement("div"); host.style.cssText="position:fixed;left:-9999px;top:0;width:1200px;height:900px;overflow:hidden";
    host.innerHTML=svgStr; document.body.appendChild(host);
    const svg=host.querySelector("svg");
    const props=["fill","fill-opacity","stroke","stroke-width","stroke-dasharray","stroke-linecap","stroke-linejoin","opacity","font-size","font-family","font-weight","font-style","text-anchor"];
    svg.querySelectorAll("*").forEach(el=>{
      if(el.tagName.toLowerCase()==="style"){el.remove();return}
      const cs=getComputedStyle(el);
      props.forEach(p=>{const v=cs.getPropertyValue(p); if(v&&v!=="normal")el.setAttribute(p,v)});
      if(el.tagName.toLowerCase()==="text"){el.setAttribute("stroke","none");el.setAttribute("font-family","Arial, Helvetica, sans-serif")}
      el.removeAttribute("class"); el.removeAttribute("style");
    });
    if(typeof doc.svg==="function")await doc.svg(svg,{x,y,width:w,height:h});
    else { const fn=window.svg2pdf&&(window.svg2pdf.svg2pdf||window.svg2pdf); if(typeof fn!=="function")throw new Error("svg2pdf not available"); await fn(svg,doc,{x,y,width:w,height:h}) }
    host.remove(); window.__vecOK=true; return true;
  }catch(e){ console.error("vector export failed, using the drawing as an image",e); if(host)host.remove(); window.__vecOK=false; return false }
}

/* ---- vehicle check ---- */
const VEH_ITEMS=["Lights and indicators","Tyres and pressures","Fuel level","Windscreen, wipers and washer","First aid kit in date","Fire extinguisher in date","Generator or inverter runs","Scene lighting works","Cab and cargo area clean and secure","No warning lights on the dash"];
const vehChecks=()=>(S.vehicleChecks=S.vehicleChecks||[]);
const lastVeh=()=>vehChecks()[vehChecks().length-1];
const vehDue=()=>{const l=lastVeh(); return !l||(Date.now()-Date.parse(l.t))>7*86400000};
function vehSheet(existing){
  whoIs(who=>{
    const chk=existing||{t:new Date().toISOString(),who,mileage:"",items:VEH_ITEMS.map(k=>({k,ok:null,note:""}))};
    const draw=()=>{
      openSheet(`<h3>Vehicle check</h3>
        <p class="hint" style="margin:0 0 12px">${existing?"Checked "+esc(chk.t.slice(0,16).replace("T"," "))+(chk.who?" by "+esc(chk.who):""):"Walk round the van. Tap Pass or Fail on each line; a fail takes a note."}</p>
        <label class="fld"><span>Mileage</span><input type="text" id="vmil" inputmode="numeric" value="${esc(chk.mileage||"")}"></label>
        ${chk.items.map((it,i)=>`<div class="vrow"><span class="vk">${esc(it.k)}</span>
          <span class="vbtns"><button data-vpass="${i}"${it.ok===true?' class="on"':''}>Pass</button><button data-vfail="${i}"${it.ok===false?' class="onf"':''}>Fail</button></span>
          ${it.ok===false?`<input type="text" data-vnote="${i}" placeholder="What is wrong" value="${esc(it.note||"")}">`:""}</div>`).join("")}
        <button class="btn" id="vsave" style="max-width:none;margin:12px 0 0">Save the check</button>
        <button class="btn sec" id="vx" style="max-width:none">Cancel</button>`);
      const grab=()=>{chk.mileage=$("#vmil").value.trim(); $$("[data-vnote]").forEach(el=>{chk.items[+el.dataset.vnote].note=el.value})};
      $$("[data-vpass]").forEach(b=>b.onclick=()=>{grab();chk.items[+b.dataset.vpass].ok=true;draw()});
      $$("[data-vfail]").forEach(b=>b.onclick=()=>{grab();chk.items[+b.dataset.vfail].ok=false;draw()});
      $("#vx").onclick=closeSheet;
      $("#vsave").onclick=()=>{grab();
        const un=chk.items.filter(i=>i.ok===null).length; if(un)return toast(un+" line"+(un===1?"":"s")+" not checked yet");
        if(!existing)vehChecks().push(chk); if(vehChecks().length>60)vehChecks().splice(0,vehChecks().length-60);
        const fails=chk.items.filter(i=>i.ok===false).length;
        logAct("vehicle","Vehicle check, "+(fails?fails+" fail"+(fails===1?"":"s"):"all passed")+(chk.mileage?", "+chk.mileage+" mi":""));
        save(); closeSheet(); render(); toast(fails?fails+" item"+(fails===1?"":"s")+" failed — listed under Next actions":"Vehicle check saved, all passed")};
    };
    draw();
  });
}

/* ---- shift handover ---- */
const handovers=()=>(S.handovers=S.handovers||[]);
function handoverPanel(){
  const h=handovers()[handovers().length-1];
  return `<div class="panel"><div class="ph2">Handover</div><div class="pb">
    ${h?`<p class="hmeta">${esc(h.t.slice(0,16).replace("T"," "))}${h.who?" · "+esc(h.who):""}</p><p class="htext">${esc(h.text).replace(/\n/g,"<br>")}</p>`
      :`<p class="hint" style="margin:0 0 10px">No handover note yet. Write one when the van changes hands.</p>`}
    <button class="btn sec" data-handover="1" style="max-width:none;margin:0">Write a handover</button></div></div>`;
}
function handoverAuto(){
  const L=live(), lines=[];
  const short=L.filter(i=>isOut(i)||isLow(i)), onOrder=L.filter(i=>i.ordered), lv=lastVeh(), vf=lv?lv.items.filter(i=>i.ok===false):[];
  if(short.length)lines.push("Short: "+short.map(i=>i.name).join(", "));
  if(onOrder.length)lines.push("On order: "+onOrder.map(i=>i.name).join(", "));
  if(vf.length)lines.push("Vehicle faults: "+vf.map(i=>i.k+(i.note?" ("+i.note+")":"")).join(", "));
  const oi=openIncidents(); if(oi.length)lines.push("Open scenes: "+oi.map(i=>i.caseNo||"no case number").join(", "));
  return lines.join("\n");
}
function handoverSheet(){
  whoIs(who=>{
    openSheet(`<h3>Handover</h3>
      <p class="hint" style="margin:0 0 12px">What the next officer should know. The lines below came from the app; add anything else.</p>
      <textarea id="hotext" rows="8">${esc(handoverAuto())}</textarea>
      <button class="btn" id="hook" style="max-width:none;margin:12px 0 0">Save the handover</button>
      <button class="btn sec" id="hox" style="max-width:none">Cancel</button>`);
    $("#hox").onclick=closeSheet;
    $("#hook").onclick=()=>{const t=$("#hotext").value.trim(); if(!t)return toast("Write something first");
      handovers().push({t:new Date().toISOString(),who,text:t}); if(handovers().length>30)handovers().splice(0,handovers().length-30);
      logAct("handover","Wrote a handover note"); save(); closeSheet(); render(); toast("Handover saved")};
  });
}

/* ---- service and calibration on durable kit ---- */
function svcSheet(i){
  openSheet(`<h3>${esc(i.name)}</h3>
    <div class="two"><label class="fld"><span>Last serviced or calibrated</span><input type="date" id="sv1" value="${esc(i.lastService||"")}"></label>
      <label class="fld"><span>Next due</span><input type="date" id="sv2" value="${esc(i.date||"")}"></label></div>
    <label class="fld"><span>Certificate or record (link)</span><input type="url" id="sv3" value="${esc(i.cert||"")}" placeholder="https://" autocapitalize="off"></label>
    <button class="btn" id="svok" style="max-width:none;margin:0">Save</button>
    <button class="btn sec" id="svtoday" style="max-width:none">Serviced today</button>
    <button class="btn sec" id="svx" style="max-width:none">Cancel</button>`);
  $("#svx").onclick=closeSheet;
  $("#svtoday").onclick=()=>{$("#sv1").value=today()};
  $("#svok").onclick=()=>{i.lastService=$("#sv1").value; i.date=$("#sv2").value; i.cert=$("#sv3").value.trim();
    if(i.status==="Service due"&&i.date&&daysOut(i.date)>30)i.status="Stocked";
    logAct("service","Service record updated for "+i.name); save(); closeSheet(); renderItemDetail(); toast("Saved")};
}

/* ---- help and about ---- */
function helpSheet(){
  const sec=(t,b)=>`<div class="idsect">${t}</div><p class="helpp">${b}</p>`;
  openSheet(`<h3>How to use FSU</h3>
    <p class="hint" style="margin:0 0 6px">Version ${esc(APP_VERSION)}. Two pages, top to bottom.</p>
    ${sec("At a scene","Start an incident on Home. It keeps the entry log, evidence log, photo log, sketch and report together. Quick sketch is for when there is no case number yet; it offers to become an incident once there is.")}
    ${sec("The sketch","Setup › Set the scale, or draw walls by dimension and the scale sets itself. Place two reference points. Draw › Marker mode numbers evidence as you tap; markers write themselves into the evidence log, photo points into the photo log. Place by measurement moves an item to where two tape distances meet. Pinch to zoom. Freehand with the Pencil for the rough sketch.")}
    ${sec("Forms and the report","Fields fill from the incident. On any narrative field, Insert wording drops in the unit's standard sentences; edit them under Settings › Report wording. Export gives a PDF, and Export Word gives a document a supervisor can edit.")}
    ${sec("Finishing","Export gives one PDF; the incident bundle gives everything in one packet. A case package carries the sketches, forms and photographs to the case file. Case material never leaves the device any other way.")}
    ${sec("The sweep","Storage › a bay, or Home › Sweep. Work through the compartments in order: log what is there, tap Swept, next. Regulated stock is counted before a compartment can be marked. Scan a label to jump to a compartment.")}
    ${sec("Items and reorder","Items shows every item with a count you can tap. Count the stock walks every compartment. Anything short goes on the reorder list; mark it Ordered when it has gone in and Received when it arrives, and send the list with part numbers to whoever orders.")}
    ${sec("The van itself","Vehicle check on Storage or Home: pass or fail each line, weekly. Failures go to Next actions. Write a handover when the van changes hands; the note appears on Home for the next officer.")}
    ${sec("The guide","Every item can carry its instructions and a source. Verify walks the unverified ones with a date and your initials. Durable kit carries a service date and a certificate link.")}
    ${sec("Settings","Back up the van data, connect automatic saving, set your initials, print labels, and read the activity log and any errors. Add the app to the home screen so it opens full screen and works without a connection.")}
    <div class="idsect">Change log</div>
    ${CHANGELOG.map(([d,t])=>`<p class="helpp"><b>${esc(d)}</b> ${esc(t)}</p>`).join("")}
    <button class="btn sec" id="hlx" style="max-width:none;margin:12px 0 0">Close</button>`);
  $("#hlx").onclick=closeSheet;
}

/* ---- hooks ---- */
/* ---- landscape only on a tablet ---- */
const isTablet=()=>Math.min(screen.width||innerWidth||0,screen.height||innerHeight||0)>=700;
const isIPadLike=()=>/iPad/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
function landscapeOnly(){ return S.landscapeOnly==null?isIPadLike():!!S.landscapeOnly }
function applyRotLock(){
  const on=landscapeOnly()&&isTablet();
  document.body.classList.toggle("rotlock",on);
  try{ if(on&&screen.orientation&&screen.orientation.lock)screen.orientation.lock("landscape").catch(()=>{}) }catch(e){}
}
window.addEventListener("resize",applyRotLock);
window.addEventListener("orientationchange",applyRotLock);

function appExtraClick10(e){
  const t=e.target;
  if(t.closest("[data-sidetog]")){ S.sideMin=!S.sideMin; saveLocal(); applyMode(); buildTabs(); fitHeader(); return true }
  const rl=t.closest("[data-rotlock]"); if(rl){ S.landscapeOnly=rl.dataset.rotlock==="1"; save(); applyRotLock(); closeSheet(); toast(S.landscapeOnly?"Landscape only":"Any orientation"); return true }
  const sn=t.closest("[data-snip]"); if(sn){snippetSheet(sn.dataset.snip); return true}
  if(t.closest("[data-snipmanage]")){snippetManage(); return true}
  const dx=t.closest("[data-exportdocx]"); if(dx){const r=(S.fills||[]).find(x=>x.id===dx.dataset.exportdocx); if(r)exportFillDocx(r); return true}
  if(t.closest("[data-vehcheck]")){closeSheet(); vehSheet(null); return true}
  if(t.closest("[data-vehlast]")){closeSheet(); const l=lastVeh(); if(l)vehSheet(l); return true}
  if(t.closest("[data-handover]")){closeSheet(); handoverSheet(); return true}
  const sv=t.closest("[data-editsvc]"); if(sv){const i=S.items.find(x=>x.id===sv.dataset.editsvc); if(i)svcSheet(i); return true}
  if(t.closest("[data-help]")){helpSheet(); return true}
  return false;
}
document.addEventListener("change",e=>{
  const id=(e.target||{}).id||"";
  if(id==="whoname"){S.whoName=e.target.value.trim(); save(); toast(S.whoName?"Reports will show "+S.whoName:"Name cleared")}
});

