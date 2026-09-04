/* ---------- tab headers, in the style of the home dashboard ---------- */
function tabHead(name,facts){
  return `<div class="hhead"><b>${esc(name)}</b>${facts.filter(Boolean).map(f=>`<span>${f}</span>`).join("")}</div>`;
}
function tabTiles(t){
  return `<div class="stiles">${t.map(([cls,k,v,s,attr])=>`<button class="stile ${cls}" ${attr||""}><span class="sk">${k}</span><span class="sv">${v}</span><span class="ss">${s}</span></button>`).join("")}</div>`;
}
function scenesHead(){
  const o=openIncidents().length, c=closedIncidents().length, l=openDocs().length, p=unsent().length;
  return tabHead("Scenes",[o+" open",c+" closed",p?p+" not exported":""])+tabTiles([
    ["t-plain","Open",String(o),o?"incident"+(o===1?"":"s")+" in progress":"nothing in progress",'data-scenestab="open"'],
    ["t-plain","Closed",String(c),c?"finished, kept for the record":"none finished yet",'data-scenestab="closed"'],
    [l?"t-amber":"t-calm","Not filed",l?String(l):"None",l?"document"+(l===1?"":"s")+" outside an incident":"everything is filed",'data-scenestab="open"'],
    [p?"t-red":"t-calm","Not exported",p?String(p):"None",p?"only on this device so far":"all exported",'data-scenestab="open"']]);
}
let guideFilter="all";
function guideHead(){
  const L=live(), withS=L.concat(requests()).filter(i=>(i.steps||[]).length);
  const ok=withS.filter(i=>i.verified&&!isStale(i)).length, unver=withS.filter(i=>!i.verified).length,
        stale=withS.filter(i=>isStale(i)).length, none=L.filter(i=>!(i.steps||[]).length).length;
  const chip=(k,l)=>`<button data-gfilter="${k}" class="${guideFilter===k?"sel":""}">${l}</button>`;
  return tabHead("Guide",[withS.length+" set"+(withS.length===1?"":"s")+" of instructions",ok+" verified"])+tabTiles([
    ["t-plain","Verified",String(ok),ok?"checked within the year":"none yet",'data-gfilter="ok"'],
    [unver?"t-amber":"t-calm","Unverified",unver?String(unver):"None",unver?"never checked against a sheet":"all have a date",'data-gfilter="unver"'],
    [stale?"t-red":"t-calm","Re-check",stale?String(stale):"None",stale?"last checked over a year ago":"nothing overdue",'data-gfilter="stale"'],
    [none?"t-dark":"t-calm","No instructions",none?String(none):"None",none?"item"+(none===1?"":"s")+" with nothing written":"every item covered",'data-gfilter="none"']])
    +`<div class="filters">${chip("all","All")}${chip("ok","Verified")}${chip("unver","Unverified")}${chip("stale","Re-check")}${chip("none","No instructions")}</div>`;
}
function storageHead(){
  const cs=comps(), st=cs.map(c=>compState(c.code));
  const bays=new Set(cs.map(c=>bayOf(c.code))).size, unchk=st.filter(s=>s.k==="unchecked").length;
  const act=st.filter(s=>s.k==="action").length, att=st.filter(s=>s.k==="attn").length;
  const unnamed=cs.filter(c=>!(c.desc||"").trim()), lastMark=cs.map(c=>c.checked).filter(Boolean).sort().pop();
  return tabHead("Storage",[cs.length+" compartments in "+bays+" bay"+(bays===1?"":"s"),lastMark?"last sweep mark "+esc(lastMark):"no sweep yet"])+tabTiles([
    [unchk?"t-amber":"t-calm","Sweep",unchk?unchk+" left":"Done",unchk?(cs.length-unchk)+" of "+cs.length+" checked":"every compartment checked",'data-go="sweep"'],
    [act?"t-red":"t-calm","Need action",act?String(act):"None",act?"with something out or expired":"nothing out or expired",'data-list="low"'],
    [att?"t-amber":"t-calm","Attention",att?String(att):"None",att?"low, expiring or due for service":"nothing to watch",'data-list="expiring"'],
    [unnamed.length?"t-dark":"t-calm","Unnamed",unnamed.length?String(unnamed.length):"None",unnamed.length?"open the bay and name them":"every compartment named",unnamed.length?'data-bay="'+esc(bayOf(unnamed[0].code))+'"':'data-go="compartments"']]);
}
function itemsHead(){
  const L=live(), short=L.filter(i=>isOut(i)||isLow(i)).length, soon=L.filter(i=>isExpiring(i)||isExpired(i)||isService(i)).length;
  const un=L.filter(i=>!placed(i)).length, cats=new Set(L.map(i=>i.cat)).size;
  return tabHead("Items",[L.length+" carried",cats+" categor"+(cats===1?"y":"ies")])+tabTiles([
    ["t-plain","Items",String(L.length),"in the van",'data-invg="az"'],
    [short?"t-red":"t-calm","Short",short?String(short):"None",short?"low or out, tap to see":"nothing low or out",'data-invg="status"'],
    [soon?"t-amber":"t-calm","Expiring",soon?String(soon):"None",soon?"within 90 days or service due":"all dates clear",'data-list="expiring"'],
    [un?"t-dark":"t-calm","Not placed",un?String(un):"None",un?"no compartment yet":"everything has a home",'data-invg="loc"']]);
}
function appExtraClick9(e){
  const g=e.target.closest("[data-gfilter]"); if(g){guideFilter=g.dataset.gfilter; if(view!=="guide")go("guide"); else renderGuide(); window.scrollTo&&window.scrollTo(0,0); return true}
  return false;
}


