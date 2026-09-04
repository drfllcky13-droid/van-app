// Builds a realistic sample incident in a fresh browser profile and saves what the app exports:
// the incident bundle PDF, the report as Word, the sketch as DXF. Run from fsu-tests: node sample.js
const {chromium}=require("@playwright/test");
const path=require("path"), fs=require("fs");
const OUT=path.join(__dirname,"..","sample-2026-0912");
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch(); const ctx=await b.newContext({acceptDownloads:true,viewport:{width:1400,height:1000}});
  const page=await ctx.newPage();
  page.on("pageerror",e=>console.error("page error:",e.message));
  await page.goto("http://127.0.0.1:8766/index.html");
  await page.waitForFunction(()=>typeof render==="function");

  await page.evaluate(async()=>{
    S.who="DA"; S.whoName="Det. D. Alvarez #417"; S.vanName="Forensic Services Unit"; save();
    const inc=newIncident(); Object.assign(inc,{caseNo:"2026-0912",offence:"Burglary, residential",addr:"412 Elm Street, Williamsport, PA",opened:"2026-09-04T21:40"});
    save(); curInc=inc.id; go("incident");
    const startDoc=key=>{ document.querySelector('[data-plan="'+key+'"]').click(); return new Promise(r=>setTimeout(r,150)) };
    const fld=(rec,re)=>{const f=S.forms.find(x=>x.id===rec.formId); const d=f.fields.find(x=>re.test(x.label)); return d};
    const setv=(rec,re,v)=>{const d=fld(rec,re); if(d)rec.values[d.id]=v};

    // entry log
    await startDoc("entrylog");
    let r=(S.fills||[]).find(x=>x.id===curFill);
    setv(r,/time scene secured/i,"21:32"); setv(r,/^date$/i,"2026-09-04"); setv(r,/log maintained by/i,"Ofc. M. Reyes #202"); setv(r,/time scene released/i,"00:55");
    setv(r,/entries/i,[
      {"Name":"Ofc. M. Reyes","Rank or agency":"Patrol, WBP","Reason for entry":"First on scene, secured","Time in":"21:20","Time out":"00:55"},
      {"Name":"Det. D. Alvarez","Rank or agency":"Forensic Services Unit","Reason for entry":"Scene processing","Time in":"21:58","Time out":"00:50"},
      {"Name":"Sgt. K. Boone","Rank or agency":"Patrol supervisor","Reason for entry":"Walk-through","Time in":"22:05","Time out":"22:20"},
      {"Name":"Det. L. Park","Rank or agency":"Criminal Investigations","Reason for entry":"Victim interview, walk-through","Time in":"22:40","Time out":"23:30"}]);
    setv(r,/notes/i,"Rear door forced. Homeowner (R. Whitfield) returned at 21:10 and called 911 from the driveway. No one else in the house.");
    r.completed=true; save();

    // the sketch, with the room, furniture, markers, reference points, measurements and photo points
    const sk=newSketch(); Object.assign(sk,{incidentId:inc.id,caseNo:inc.caseNo,offence:inc.offence,addr:inc.addr,
      depicts:"Ground floor bedroom, items 1 to 4",when:"2026-09-04T21:58",prepared:"2026-09-04T23:40",by:"Det. D. Alvarez #417",sheet:"1 of 1",kind:"Rough sketch",
      scale:{px:280,real:10,unit:"ft"},showMeas:true});
    curSketch=sk.id; go("sketch"); await new Promise(x=>setTimeout(x,100));
    const p=28, W=pageW(sk), top=HEADER_H+2, cy=top+(pageH(sk)-top)/2;
    const w=16*p, d=13*p, x0=W/2-w/2-60, y0=cy-d/2;
    const walls=buildWalls([{px:w,turn:"S"},{px:d,turn:"R"},{px:w,turn:"R"},{px:d,turn:"R"}],.5*p,"E",{x:x0,y:y0});
    const add=(t,x,y,w2,h2,extra)=>{const [dw,dh]=DEFSIZE[t]||[60,40]; const o=Object.assign({id:newId(),t,lay:"L1",x:Math.round(x),y:Math.round(y),w:Math.round(w2||dw),h:Math.round(h2||dh),r:0,label:"",ar:(w2||dw)/(h2||dh)},extra||{}); sk.objs.push(o); return o};
    walls.forEach(o=>{o.lay="L1";sk.objs.push(o)});
    add("door",x0+w*.62,y0+d-3*p,3*p,3*p,{label:"Rear door"});
    add("window",x0+w*.15,y0-4,4.5*p,.5*p+8,{label:"Window"});
    add("bed",x0+1*p,y0+1*p,6.5*p,7*p,{label:"Bed",r:0});
    add("dresser",x0+w-5.2*p,y0+.6*p,5*p,2*p,{label:"Dresser"});
    add("table",x0+9*p,y0+1*p,2.4*p,2*p,{label:"Nightstand"});
    add("chair",x0+w-3*p,y0+d-4.5*p,2*p,2*p,{label:"Chair",r:30});
    add("bloodarea",x0+11.5*p,y0+8.6*p,1.6*p,1.3*p,{ink:"red",label:"Blood pool"});
    add("glass",x0+w*.66-1.2*p,y0+d-5.4*p,2.2*p,1.6*p,{label:""});
    const rp1=add("refpoint",x0-0.9*p,y0+d+0.4*p,44,44,{label:"RP1, SW corner"});
    const rp2=add("refpoint",x0+w+0.5*p,y0+d+0.4*p,44,44,{label:"RP2, SE corner"});
    const mk=(n,label,x,y)=>add("marker",x,y,48,56,{n:String(n),label});
    const m1=mk(1,"Spent 9mm casing",x0+w*.55,y0+d*.55), m2=mk(2,"Pry bar, 18 inch",x0+w*.72,y0+d-2.2*p), m3=mk(3,"Blood drop, carpet",x0+11.2*p,y0+7.2*p), m4=mk(4,"Glass fragments, floor",x0+w*.66,y0+d-3.6*p);
    [m1,m2,m3,m4].forEach(o=>syncMarker(sk,o));
    [[m1,14.2,9.6],[m3,18.9,8.3],[m4,13.6,5.1]].forEach(([o,da,db])=>{
      const meas={m:"tri",a:rp1.id+":c",b:rp2.id+":c",da,db,side:"l"};
      const pt=solveMeas(sk,meas); if(pt){o.meas=meas; o.x=Math.round(pt.x-o.w/2); o.y=Math.round(pt.y-o.h/2)}});
    add("dim",x0,y0-2.2*p,w,0,{label:""});
    add("north",W-84,top+18,52,53);
    add("legend",W-330,top+90,300,150);
    add("text",x0,y0+d+2.4*p,220,26,{label:"Carpet throughout. Rear door frame split at strike plate."});
    const ph=(n,label,x,y,r)=>add("photopoint",x,y,64,64,{n:String(n),label,r});
    const p1=ph(1,"Rear door from outside, damage to frame",x0+w*.62+1.5*p,y0+d+1.4*p,0);
    const p2=ph(2,"Bedroom from the doorway, overall",x0+w*.62+.5*p,y0+d-5*p,0);
    const p3=ph(3,"Casing at marker 1 with scale",x0+w*.45,y0+d*.72,315);
    const p4=ph(4,"Blood drop at marker 3, close up",x0+9.3*p,y0+7*p,90);
    // photographs: placeholders drawn here so the photograph index has real images
    const mkPhoto=(n,label)=>{const c=document.createElement("canvas"); c.width=640;c.height=480; const g=c.getContext("2d");
      const grd=g.createLinearGradient(0,0,0,480); grd.addColorStop(0,"#3b4a5a"); grd.addColorStop(1,"#141a20"); g.fillStyle=grd; g.fillRect(0,0,640,480);
      g.fillStyle="#7a6a55"; g.fillRect(0,330,640,150); g.strokeStyle="#c9c0b0"; g.lineWidth=3; g.strokeRect(210,80,220,260);
      g.fillStyle="#fff"; g.font="bold 28px sans-serif"; g.fillText("Photograph "+n,24,44); g.font="20px sans-serif"; g.fillText(label,24,76);
      g.font="16px sans-serif"; g.fillStyle="#ddd"; g.fillText("2026-0912  ·  2026-09-04 22:1"+n+"  ·  D. Alvarez",24,460);
      return {data:c.toDataURL("image/jpeg",.8),w:640,hh:480}};
    for(const [o,lab] of [[p1,"Rear door"],[p2,"Bedroom overall"],[p3,"Marker 1"],[p4,"Marker 3"]]){ const id=newId(); await photoPut(id,mkPhoto(o.n,lab)); o.photoId=id; syncPhoto(sk,o) }
    sk.updated=new Date().toISOString(); saveLocal(); renderSketch();

    // evidence log rows filled out
    const ev=(S.fills||[]).find(x=>x.incidentId===inc.id&&x.formName==="Evidence log");
    setv(ev,/^date$/i,"2026-09-04"); setv(ev,/time scene entered/i,"21:58"); setv(ev,/log completed by/i,"Det. D. Alvarez #417"); setv(ev,/date completed/i,"2026-09-05");
    const evt=fld(ev,/evidence/i); const where=["Bedroom floor, 14 ft 2 in from RP1","Bedroom floor by rear door","Carpet beside bed, 18 ft 11 in from RP1","Floor inside rear door"];
    (ev.values[evt.id]||[]).forEach((row,i)=>{row["Where found"]=where[i]||""; row["Collected by"]="D. Alvarez"; row["Time"]=["22:41","22:52","23:05","23:12"][i]||""});
    setv(ev,/notes/i,"Items 1 to 4 photographed in place with markers before collection. Item 3 swabbed, swab air dried and packaged.");
    ev.completed=true;

    // photo log
    const pl=(S.fills||[]).find(x=>x.incidentId===inc.id&&x.formName==="Photograph log");
    setv(pl,/camera/i,"Nikon D7500, unit camera 2"); const plt=fld(pl,/photographs/i);
    (pl.values[plt.id]||[]).forEach((row,i)=>{row["Time"]=["22:10","22:14","22:38","23:02"][i]||""}); setv(pl,/log completed by/i,"Det. D. Alvarez #417"); pl.completed=true;

    // the report
    await startDoc("report");
    r=(S.fills||[]).find(x=>x.id===curFill);
    setv(r,/personnel on scene/i,"Ofc. M. Reyes #202 (first on scene)\nSgt. K. Boone #118\nDet. L. Park #331, Criminal Investigations\nDet. D. Alvarez #417, Forensic Services Unit");
    setv(r,/notification and arrival/i,"On 2026-09-04 at 21:40 the Forensic Services Unit was notified by Ofc. M. Reyes of a residential burglary at 412 Elm Street. I arrived at 21:58 and made contact with Ofc. Reyes, who briefed me on the circumstances and the extent of the scene. The scene had been secured by crime scene tape and an entry log was maintained by Ofc. Reyes for the duration of processing.");
    setv(r,/scene description/i,"Single-storey residence with the point of entry at the rear door, which opens into the ground floor bedroom. The door frame was split at the strike plate and the deadbolt was in the extended position. Weather at the time of processing was clear and dry. Lighting was artificial, supplemented by scene lighting. Carpet throughout the bedroom; drawers of the dresser open and contents disturbed.");
    setv(r,/scene processing/i,"The scene was photographed in overall, mid-range and close-up views before any item was moved. Evidence markers were then placed and the scene was photographed again with the markers in position. A rough sketch of the scene was prepared on scene. Measurements were taken by triangulation from two fixed reference points at the south-west and south-east corners of the room and are recorded on the sketch. The rear door and frame were examined for latent prints using black magnetic powder; two lifts were recovered from the exterior face of the door and packaged individually. Suspected biological stains at marker 3 were photographed, recorded on the sketch and collected with sterile swabs. Swabs were air dried and packaged separately.");
    setv(r,/evidence collected/i,"Item 1: spent 9mm casing, bedroom floor.\nItem 2: pry bar, 18 inch, floor inside rear door.\nItem 3: blood drop on carpet beside bed, swabbed.\nItem 4: glass fragments, floor inside rear door.\nTwo latent print lifts from the exterior of the rear door.");
    setv(r,/photographs taken/i,"4");
    setv(r,/additional notes/i,"Processing concluded at 00:50 and the scene was released to Ofc. Reyes. No further forensic action was taken. All items collected were transported to the unit and secured.");
    setv(r,/report prepared by/i,"Det. D. Alvarez #417"); setv(r,/date of report/i,"2026-09-05");
    r.completed=true; save(); render();
    return true;
  });

  // exports: the bundle, the report as Word, the sketch as DXF
  const grab=async(trigger,name)=>{ const [dl]=await Promise.all([page.waitForEvent("download",{timeout:60000}),page.evaluate(trigger)]); await dl.saveAs(path.join(OUT,name)); console.log("saved "+name) };
  await grab(async()=>{const inc=incidents()[0]; await bundleIncident(inc)},"2026-0912-bundle.pdf");
  await grab(async()=>{const r=(S.fills||[]).find(x=>x.formName==="Forensic services report"); await exportFillDocx(r)},"2026-0912-forensic-services-report.docx");
  await grab(async()=>{curSketch=S.sketches[0].id; exportDXF(curSk())},"2026-0912-sketch.dxf");
  await grab(async()=>{curSketch=S.sketches[0].id; EXPORTOPT.vector=true; await exportSketch(curSk())},"2026-0912-sketch-vector.pdf");
  await page.evaluate(()=>{curSketch=S.sketches[0].id; go("sketch")});
  await page.waitForTimeout(400);
  await page.screenshot({path:path.join(OUT,"sketch-on-screen.png"),fullPage:false});
  await b.close();
  console.log("done → "+OUT);
})().catch(e=>{console.error("FAIL",e);process.exit(1)});
