// FSU end-to-end checks. Run with `npx playwright test` from the fsu-tests folder.
// The render sweep runs at four widths in both colour schemes; the flows run at desktop width.
const {test,expect}=require("@playwright/test");
const fs=require("fs"), path=require("path");
const SWEEP=fs.readFileSync(path.join(__dirname,"..","..","sweep.js"),"utf8");

async function open(page){
  await page.goto("/index.html");
  await page.waitForFunction(()=>typeof render==="function"&&document.querySelector("#v-home"));
}
async function quickSketch(page){
  await page.evaluate(()=>{document.querySelector("[data-quicksketch]").click()});
  await page.waitForSelector("#skcanvas");
  await page.evaluate(()=>{const sk=curSk(); sk.scale={px:100,real:10,unit:"ft"}; saveLocal(); renderSketch()});
}
const sizes=[[1500,1000],[1194,834],[393,852],[320,700]];
for(const [w,h] of sizes)for(const scheme of ["light","dark"]){
  test(`sweep ${w}px ${scheme}`,async({page})=>{
    await page.setViewportSize({width:w,height:h});
    await page.emulateMedia({colorScheme:scheme});
    const errors=[]; page.on("pageerror",e=>errors.push(e.message)); page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
    await open(page);
    const out=await page.evaluate(SWEEP);
    expect(out.viewErrors).toEqual([]); expect(out.symbolErrors).toEqual([]);
    expect(out.dupIds).toEqual([]); expect(out.noHandler).toEqual([]); expect(out.overflow).toEqual({});
    expect(errors.filter(e=>!/failed to draw/.test(e))).toEqual([]);
  });
}

test.describe("sketch flows",()=>{
  test.beforeEach(async({page})=>{ await page.setViewportSize({width:1400,height:1000}); await open(page); await quickSketch(page); });

  test("measurement maths and typed lengths",async({page})=>{
    const r=await page.evaluate(()=>{
      const sk=curSk(); addObj("refpoint"); const a=objAt(selObj); a.x=100;a.y=500;
      addObj("refpoint"); const b=objAt(selObj); b.x=600;b.y=500;
      const A=objPt(a,.5,.5), B=objPt(b,.5,.5);
      const tri=solveMeas(sk,{m:"tri",a:a.id+":c",b:b.id+":c",da:30,db:40,side:"l"});
      const base=solveMeas(sk,{m:"base",a:a.id+":c",b:b.id+":c",da:10,db:5,side:"r"});
      const polar=solveMeas(sk,{m:"polar",a:a.id+":c",da:15,ang:90});
      return {dA:pxReal(sk,Math.hypot(tri.x-A.x,tri.y-A.y)), dB:pxReal(sk,Math.hypot(tri.x-B.x,tri.y-B.y)),
        base:[base.x-A.x,base.y-A.y], polar:[polar.x-A.x,polar.y-A.y],
        parse:[parseLen("12'4\"","ft"),parseLen("4 in","ft"),parseLen("3.2","m")]};
    });
    expect(r.dA).toBeCloseTo(30,6); expect(r.dB).toBeCloseTo(40,6);
    expect(r.base).toEqual([100,50]); expect(r.polar[0]).toBeCloseTo(150,6); expect(Math.abs(r.polar[1])).toBeLessThan(1e-6);
    expect(r.parse[0]).toBeCloseTo(12.3333,3); expect(r.parse[1]).toBeCloseTo(0.3333,3); expect(r.parse[2]).toBe(3.2);
  });

  test("walls by dimension from the sheet",async({page})=>{
    await page.click("[data-skgrp=draw]"); await page.click("#sheet [data-skwalls]");
    await page.fill("#wrw","16"); await page.fill("#wrd","12"); await page.click("#wgo");
    const walls=await page.evaluate(()=>curSk().objs.filter(o=>o.t==="wall").length);
    expect(walls).toBe(4);
  });

  test("tap to place and marker mode",async({page})=>{
    await page.evaluate(()=>placeStart("chair"));
    const c=await page.locator("#skcanvas").boundingBox();
    await page.mouse.click(c.x+c.width*.8,c.y+c.height*.3);
    let r=await page.evaluate(()=>{const o=curSk().objs[curSk().objs.length-1]; return {t:o.t,place:PLACE}});
    expect(r.t).toBe("chair"); expect(r.place).toBeNull();
    await page.evaluate(()=>placeStart("marker"));
    await page.mouse.click(c.x+c.width*.3,c.y+c.height*.6);
    await page.mouse.click(c.x+c.width*.4,c.y+c.height*.6);
    r=await page.evaluate(()=>curSk().objs.filter(o=>o.t==="marker").map(o=>o.n));
    expect(r).toEqual(["1","2"]);
  });

  test("outline an area by tapping corners, then reshape it",async({page})=>{
    await page.evaluate(()=>polyStart());
    const c=await page.locator("#skcanvas").boundingBox();
    const P=[[.3,.3],[.6,.3],[.6,.6],[.3,.6]];
    for(const [fx,fy] of P)await page.mouse.click(c.x+c.width*fx,c.y+c.height*fy);
    await page.mouse.click(c.x+c.width*.3,c.y+c.height*.3);
    const r=await page.evaluate(()=>{const p=curSk().objs.filter(o=>o.t==="poly").pop(); return p&&{n:p.pts.length,fp:p.fp}});
    expect(r).toEqual({n:4,fp:"hatch"});
  });

  test("freehand ink stroke becomes an object",async({page})=>{
    await page.evaluate(()=>inkStart());
    const c=await page.locator("#skcanvas").boundingBox();
    await page.mouse.move(c.x+c.width*.2,c.y+c.height*.8); await page.mouse.down();
    for(let i=1;i<=10;i++)await page.mouse.move(c.x+c.width*(.2+i*.04),c.y+c.height*(.8-(i%2)*.05));
    await page.mouse.up();
    const r=await page.evaluate(()=>{const o=curSk().objs.filter(x=>x.t==="ink").pop(); return o&&{n:o.pts.length,w:o.w}});
    expect(r.n).toBeGreaterThanOrEqual(2); expect(r.w).toBeGreaterThan(50);
  });

  test("select several with a marquee and delete",async({page})=>{
    await page.evaluate(()=>{["chair","chair","chair"].forEach((t,i)=>{addObj(t); const o=objAt(selObj); o.x=200+i*80; o.y=300}); selObj=null; multiStart()});
    const c=await page.locator("#skcanvas").boundingBox();
    const f=(x,y)=>[c.x+c.width*x/1000,c.y+c.height*y/750];
    let [x0,y0]=f(150,250), [x1,y1]=f(520,400);
    await page.mouse.move(x0,y0); await page.mouse.down(); await page.mouse.move(x1,y1,{steps:5}); await page.mouse.up();
    let n=await page.evaluate(()=>multi.ids.size); expect(n).toBe(3);
    await page.keyboard.press("Delete");
    n=await page.evaluate(()=>curSk().objs.filter(o=>o.t==="chair").length); expect(n).toBe(0);
  });

  test("layer move shifts every object together",async({page})=>{
    await page.evaluate(()=>{["car","tree"].forEach((t,i)=>{addObj(t); const o=objAt(selObj); o.x=300+i*200; o.y=300}); const sk=curSk(); layerMoveStart(sk,layersOf(sk)[0])});
    const before=await page.evaluate(()=>curSk().objs.map(o=>[o.x,o.y]));
    const c=await page.locator("#skcanvas").boundingBox();
    await page.mouse.move(c.x+c.width*.5,c.y+c.height*.9); await page.mouse.down(); await page.mouse.move(c.x+c.width*.55,c.y+c.height*.85,{steps:4}); await page.mouse.up();
    const after=await page.evaluate(()=>curSk().objs.map(o=>[o.x,o.y]));
    const d=after.map((p,i)=>[p[0]-before[i][0],p[1]-before[i][1]]);
    expect(d.every(v=>v[0]===d[0][0]&&v[1]===d[0][1])).toBe(true); expect(d[0][0]).toBeGreaterThan(0);
  });

  test("DXF and PDF export",async({page})=>{
    await page.evaluate(()=>{addObj("wall"); addObj("marker"); const o=objAt(selObj); o.label="Casing"});
    const dxf=await page.evaluate(async()=>{let t=null; const od=dlBlob; dlBlob=(b)=>{b.text().then(x=>t=x)}; exportDXF(curSk()); await new Promise(r=>setTimeout(r,300)); dlBlob=od; return t});
    expect(dxf).toContain("ENTITIES"); expect(dxf.trim().endsWith("EOF")).toBe(true); expect(dxf).not.toMatch(/NaN|undefined/);
    const pdf=await page.evaluate(async()=>{const J=await loadPDF(); const d=new J({unit:"pt",format:"letter",orientation:"landscape"}); await exportSketch(curSk(),d); return d.output("arraybuffer").byteLength});
    expect(pdf).toBeGreaterThan(10000);
  });

  test("a failed save shows the bar and clears when saving works again",async({page})=>{
    const r=await page.evaluate(()=>{const orig=localStorage.setItem.bind(localStorage); localStorage.setItem=()=>{throw new Error("quota")};
      saveLocal(); const shown=!!document.getElementById("savefail"); localStorage.setItem=orig; saveLocal(); return {shown,gone:!document.getElementById("savefail")}});
    expect(r).toEqual({shown:true,gone:true});
  });

  test("a symbol that throws draws a placeholder, and damaged values are repaired",async({page})=>{
    const r=await page.evaluate(()=>{addObj("chair"); const keep=SHAPES.chair; SHAPES.chair=()=>{throw new Error("boom")}; redrawCanvas();
      const broken=document.querySelectorAll(".k-broken").length; SHAPES.chair=keep;
      const sk=curSk(); sk.objs.push({id:"bad",t:"rect",x:NaN,y:1,w:0,h:-1}); const n=repairSketch(sk); const b=sk.objs.find(o=>o.id==="bad");
      return {broken,n,x:b.x,w:b.w}});
    expect(r.broken).toBe(1); expect(r.n).toBeGreaterThan(0); expect(r.x).toBe(0); expect(r.w).toBeGreaterThan(0);
  });

  test("case package round trip",async({page})=>{
    const r=await page.evaluate(async()=>{let t=null; const od=dlBlob; dlBlob=(b)=>{b.text().then(x=>t=x)};
      Object.defineProperty(navigator,"canShare",{value:undefined,configurable:true});
      await exportCasePackage("all","t"); await new Promise(r=>setTimeout(r,400)); dlBlob=od;
      const pkg=JSON.parse(t); const n0=S.sketches.length; pkg.sketches[0].id="imp1"; await importCasePackage(JSON.stringify(pkg));
      return {sk:pkg.sketches.length, added:S.sketches.length-n0}});
    expect(r.sk).toBeGreaterThan(0); expect(r.added).toBe(1);
  });

  test("undo survives a reload",async({page})=>{
    await page.evaluate(()=>{addObj("chair"); addObj("table")});
    const id=await page.evaluate(()=>curSketch);
    await page.reload(); await page.waitForFunction(()=>typeof render==="function");
    const r=await page.evaluate((id)=>{curSketch=id; go("sketch"); return {can:canUndo(curSk()), n:curSk().objs.length}},id);
    expect(r.can).toBe(true);
    await page.evaluate(()=>doUndo());
    const n=await page.evaluate(()=>curSk().objs.length); expect(n).toBe(r.n-1);
  });
});

test("opens offline after the first visit",async({page,context})=>{
  await page.setViewportSize({width:1200,height:900});
  await open(page);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready});
  await page.waitForTimeout(800);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(()=>typeof render==="function"&&document.querySelectorAll("section.view").length>=19);
  await context.setOffline(false);
});

test.describe("van flows",()=>{
  test.beforeEach(async({page})=>{ await page.setViewportSize({width:1400,height:1000}); await open(page); await page.evaluate(()=>{S.who="TT";save()}); });

  test("one Scenes list with open and closed",async({page})=>{
    await page.evaluate(()=>go("active"));
    await expect(page.locator("#v-active .seg [data-scenestab=closed]")).toBeVisible();
    await page.click("#v-active .seg [data-scenestab=closed]");
    await expect(page.locator("#v-active .empty strong")).toHaveText("No finished scenes yet");
    const tabs=await page.evaluate(()=>[...document.querySelectorAll("#side button span.lbl")].map(b=>b.textContent.trim()));
    expect(tabs).toEqual(["Home","Scenes","Guide","Storage","Items","Settings"]);
  });

  test("guided sweep marks and advances",async({page})=>{
    await page.evaluate(()=>go("sweep"));
    await page.click("[data-sweepnext]");
    const first=await page.evaluate(()=>S.curLoc); expect(first).toBeTruthy();
    await page.click("[data-sweepdone]");
    const r=await page.evaluate(()=>({checked:S.comps.filter(c=>c.checked).length,cur:S.curLoc,act:(S.activity||[]).slice(-1)[0]?.m}));
    expect(r.checked).toBe(1); expect(r.cur).not.toBe(first); expect(r.act).toContain("Swept");
  });

  test("item cards count with a tap on a phone",async({page})=>{
    await page.setViewportSize({width:393,height:852});
    await page.evaluate(()=>{const i=live()[0]; i.loc=comps()[0].code; i.qty="3"; i.par="4"; save(); go("inventory")});
    const id=await page.evaluate(()=>live()[0].id);
    await page.click(`[data-qty="${id}:1"]`);
    let q=await page.evaluate(id=>S.items.find(x=>x.id===id).qty,id); expect(q).toBe("4");
    await page.click(`[data-qout="${id}"]`);
    q=await page.evaluate(id=>{const i=S.items.find(x=>x.id===id); return [i.qty,i.status]},id); expect(q).toEqual(["0","Out"]);
  });

  test("guide verification records a date and initials",async({page})=>{
    await page.evaluate(()=>{const i=live()[0]; i.steps=["Open it","Use it"]; delete i.verified; save(); go("guide")});
    await page.click("#v-guide [data-verifyrun]");
    await page.click("#vfok");
    const r=await page.evaluate(()=>{const i=live().find(x=>x.verifiedBy==="TT"); return i&&{v:i.verified,by:i.verifiedBy}});
    expect(r.by).toBe("TT"); expect(r.v).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("reorder ordered and received",async({page})=>{
    await page.evaluate(()=>{const i=live()[0]; i.loc=comps()[0].code; i.qty="0"; i.par="5"; i.status="Out"; save(); go("reorder")});
    const id=await page.evaluate(()=>live()[0].id);
    await page.click(`[data-ordered="${id}"]`);
    let r=await page.evaluate(id=>({ordered:!!S.items.find(x=>x.id===id).ordered, onOrder:document.querySelectorAll("#v-reorder .sect").length}),id);
    expect(r.ordered).toBe(true);
    await page.click(`[data-received="${id}"]`);
    r=await page.evaluate(id=>{const i=S.items.find(x=>x.id===id); return {q:i.qty,o:!!i.ordered,s:i.status}},id);
    expect(r).toEqual({q:"5",o:false,s:"Stocked"});
  });

  test("regulated items must be counted before a compartment is swept",async({page})=>{
    await page.evaluate(()=>{const i=live()[0]; i.loc=comps()[0].code; i.cls="Regulated"; delete i.counted; save(); curComp=comps()[0].code; prevView="compartments"; view="compdetail"; render()});
    await page.click(`[data-check]`);
    await expect(page.locator("#sheet [data-cnt]")).toBeVisible();
    await page.fill("#sheet [data-cnt]","7"); await page.click("#rcok");
    const r=await page.evaluate(()=>{const i=live()[0]; return {q:i.qty,c:i.counted,by:i.countedBy}});
    expect(r.q).toBe("7"); expect(r.by).toBe("TT");
  });

  test("labels view lists compartments and deep links open one",async({page})=>{
    await page.evaluate(()=>go("labels"));
    const n=await page.locator("#labelgrid .label").count(); expect(n).toBeGreaterThan(10);
    const code=await page.evaluate(()=>comps()[0].code);
    await page.goto("/index.html#c="+code);
    await page.waitForFunction(()=>typeof render==="function");
    await page.waitForFunction(c=>view==="compdetail"&&curComp===c,code);
  });

  test("settings is a menu of sections with a way back",async({page})=>{
    await page.click("#v-home #gear");
    await page.waitForFunction(()=>view==="data");
    const rows=await page.locator("#v-data [data-setsec]").count(); expect(rows).toBeGreaterThan(8);
    await page.click('#v-data [data-setsec="reset"]');
    await expect(page.locator("#v-data #wipe")).toBeVisible();
    await page.click("#v-data [data-setback]");
    await expect(page.locator('#v-data [data-setsec="who"]')).toBeVisible();
    await page.evaluate(()=>{S.who="";save();go("home")});
    await page.click('#v-home [data-gosec="who"]');
    await expect(page.locator("#v-data #whoin")).toBeVisible();
  });

  test("scan a label opens a sheet with a camera-app route",async({page})=>{
    await page.evaluate(()=>go("compartments"));
    await page.click("#v-compartments [data-scan]");
    await expect(page.locator("#sheet #scfile")).toHaveCount(1);
    await expect(page.locator("#sheet #scx")).toBeVisible();
    await page.click("#sheet #scx");
  });

  test("a bay opens as its own page on a wide screen",async({page})=>{
    await page.setViewportSize({width:1180,height:820});
    await page.evaluate(()=>{S.mode="desktop";save();applyMode();go("compartments")});
    await page.click("#v-compartments .bayhead");
    await page.waitForFunction(()=>view==="bay");
    const split=await page.evaluate(()=>document.querySelector(".main.split")!==null);
    expect(split).toBe(false);
    await expect(page.locator("#v-bay .back")).toBeVisible();
  });

  test("freehand ends when a symbol is picked, and rotation can be locked",async({page})=>{
    await page.evaluate(()=>{const b=document.querySelector("#v-home [data-quicksketch]"); b&&b.click()});
    await page.waitForFunction(()=>view==="sketch");
    await page.evaluate(()=>{inkStart()});
    expect(await page.evaluate(()=>!!inkDraw)).toBe(true);
    await page.evaluate(()=>placeStart("rect"));
    expect(await page.evaluate(()=>!!inkDraw)).toBe(false);
    await page.evaluate(()=>{PLACE=null;addObj("rect");showSet=true;renderSketch()});
    await expect(page.locator("#skrail .objset [data-orotlock]")).toBeVisible();
    expect(await page.evaluate(()=>document.querySelectorAll("#skcanvas [data-rot]").length)).toBe(1);
    await page.click("#skrail .objset [data-orotlock]");
    expect(await page.evaluate(()=>document.querySelectorAll("#skcanvas [data-rot]").length)).toBe(0);
    await expect(page.locator("#skrail .objset [data-orot]")).toHaveCount(0);
    await expect(page.locator("#v-sketch #skedit [data-skfull]")).toBeVisible();
  });

  test("count mode walks the compartments",async({page})=>{
    await page.evaluate(()=>{live().slice(0,3).forEach((i,k)=>{i.loc=comps()[k].code;i.qty="2";i.par="3"}); save(); go("inventory")});
    await page.click("#v-inventory [data-countrun]");
    await page.fill("#sheet [data-cnt]","9"); await page.click("#ctnext");
    await page.click("#ctstop");
    const r=await page.evaluate(()=>({q:live()[0].qty, c:live()[0].counted, act:S.activity.slice(-1)[0].m}));
    expect(r.q).toBe("9"); expect(r.c).toMatch(/^\d{4}/);
  });
});

test.describe("reports and upkeep",()=>{
  test.beforeEach(async({page})=>{ await page.setViewportSize({width:1400,height:1000}); await open(page); await page.evaluate(()=>{S.who="TT";S.whoName="Det. T. Test";save()}); });

  test("the report fills from the incident and takes standard wording",async({page})=>{
    await page.evaluate(()=>{const inc=newIncident(); inc.caseNo="C-1"; inc.addr="1 Main St"; inc.offence="Theft"; save(); curInc=inc.id; go("incident")});
    await page.click("[data-plan=report]");
    const r=await page.evaluate(()=>{const f=(S.fills||[]).find(x=>x.formName==="Forensic services report"); const form=S.forms.find(x=>x.id===f.formId); const v=re=>f.values[form.fields.find(x=>re.test(x.label)).id]; return {officer:v(/reporting officer/i),caseNo:v(/case/i),date:v(/^date of incident$/i)}});
    expect(r.officer).toBe("Det. T. Test"); expect(r.caseNo).toBe("C-1"); expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const fid=await page.evaluate(()=>document.querySelector("textarea[data-fv]").dataset.fv);
    await page.click(`[data-snip="${fid}"]`); await page.click("#sheet [data-snipins]");
    const val=await page.evaluate(fid=>(S.fills||[]).find(x=>x.id===curFill).values[fid],fid);
    expect(val.length).toBeGreaterThan(40);
  });

  test("Word export produces a docx",async({page})=>{
    await page.evaluate(()=>{const inc=newIncident(); inc.caseNo="C-2"; save(); curInc=inc.id; go("incident")});
    await page.click("[data-plan=report]");
    const r=await page.evaluate(async()=>{let bytes=null; const od=dlBlob; dlBlob=(b)=>{b.arrayBuffer().then(a=>bytes=new Uint8Array(a))};
      Object.defineProperty(navigator,"canShare",{value:undefined,configurable:true});
      await exportFillDocx((S.fills||[]).find(x=>x.id===curFill)); await new Promise(r=>setTimeout(r,800)); dlBlob=od;
      return {n:bytes&&bytes.length, pk:bytes&&String.fromCharCode(bytes[0],bytes[1])}});
    expect(r.pk).toBe("PK"); expect(r.n).toBeGreaterThan(1500);
  });

  test("photo points feed the photograph log",async({page})=>{
    const r=await page.evaluate(()=>{const inc=newIncident(); inc.caseNo="C-3"; save(); const sk=newSketch(); sk.incidentId=inc.id; curSketch=sk.id; go("sketch");
      addObj("photopoint"); const p=objAt(selObj); p.label="Kitchen, looking east"; p.r=90; syncPhoto(sk,p);
      const pl=(S.fills||[]).find(x=>x.incidentId===inc.id&&x.formName==="Photograph log"); const f=S.forms.find(x=>x.id===pl.formId); const t=f.fields.find(x=>x.type==="table");
      return pl.values[t.id]});
    expect(r.length).toBe(1); expect(r[0]["What it shows"]).toBe("Kitchen, looking east"); expect(r[0]["Facing"]).toBe("E");
  });

  test("vector sketch PDF",async({page})=>{
    await quickSketch(page);
    const r=await page.evaluate(async()=>{addObj("wall"); addObj("marker"); const J=await loadPDF(); EXPORTOPT.vector=true; window.__vecOK=null;
      const d=new J({unit:"pt",format:"letter",orientation:"landscape"}); await exportSketch(curSk(),d); EXPORTOPT.vector=false; return {ok:window.__vecOK,bytes:d.output("arraybuffer").byteLength}});
    expect(r.ok).toBe(true); expect(r.bytes).toBeGreaterThan(5000);
  });

  test("vehicle check, handover and service record",async({page})=>{
    await page.click("[data-vehcheck]");
    await page.fill("#vmil","1200");
    const n=await page.locator("[data-vpass]").count();
    for(let i=0;i<n;i++)await page.click(`[data-vpass="${i}"]`);
    await page.click('[data-vfail="0"]'); await page.fill('[data-vnote="0"]',"Nearside brake light out");
    await page.click("#vsave");
    let r=await page.evaluate(()=>({who:lastVeh().who,fails:lastVeh().items.filter(i=>i.ok===false).length,row:[...document.querySelectorAll(".todo .act span")].some(s=>/Vehicle: 1 item failed/.test(s.textContent))}));
    expect(r.who).toBe("TT"); expect(r.fails).toBe(1); expect(r.row).toBe(true);
    await page.click("[data-handover]");
    const auto=await page.inputValue("#hotext"); expect(auto).toContain("Vehicle faults");
    await page.click("#hook");
    r=await page.evaluate(()=>({n:handovers().length,shown:!!document.querySelector(".htext")}));
    expect(r.n).toBe(1); expect(r.shown).toBe(true);
    await page.evaluate(()=>{const i=live()[0]; i.cls="Durable"; save(); curItem=i.id; prevView="inventory"; view="itemdetail"; render()});
    await page.click("[data-editsvc]"); await page.click("#svtoday"); await page.click("#svok");
    const svc=await page.evaluate(()=>live()[0].lastService); expect(svc).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("version stamp reaches the exports",async({page})=>{
    const r=await page.evaluate(async()=>{const pkg=await casePackage("all"); let dxf=null; const od=dlBlob; dlBlob=(b)=>{b.text().then(t=>dxf=t)};
      document.querySelector("[data-quicksketch]").click(); await new Promise(r=>setTimeout(r,200)); addObj("wall"); exportDXF(curSk()); await new Promise(r=>setTimeout(r,300)); dlBlob=od;
      return {pkg:pkg.version, dxf:dxf.includes(APP_VERSION), help:!!document.querySelector("[data-help]")||true}});
    expect(r.pkg).toBe(await page.evaluate(()=>APP_VERSION)); expect(r.dxf).toBe(true);
  });
});
