// FSU render sweep. Paste into the browser console with the app open, or run through
// a headless browser at 1500 / 1194 / 393 / 320 px wide in both colour schemes.
// Fails loudly on any thrown error, NaN or undefined in a symbol, horizontal overflow,
// duplicate ids, or a data- attribute with no handler.
(function sweep(){
  const out={viewErrors:[],symbolErrors:[],dupIds:[],overflow:{},noHandler:[]};
  const V=[...document.querySelectorAll("section.view")].map(s=>s.id.slice(2));
  const was=view;
  for(const v of V){
    try{ view=v; document.querySelectorAll(".view").forEach(s=>s.classList.toggle("on",s.id==="v-"+v)); render();
      const ov=document.documentElement.scrollWidth-window.innerWidth; if(ov>0)out.overflow[v]=ov;
    }catch(e){out.viewErrors.push(v+": "+e.message)}
  }
  view=was; document.querySelectorAll(".view").forEach(s=>s.classList.toggle("on",s.id==="v-"+was)); render();
  for(const t in SHAPES){
    for(const [w,h] of [[16,12],[40,30],[120,80],[300,40],[600,400]]){
      let s; try{ s=SHAPES[t](w,h,{id:"sw",t,w,h,pts:[[0,0],[1,0],[.5,1]]}) }catch(e){out.symbolErrors.push(t+" threw "+e.message);continue}
      if(!s||/NaN|undefined/.test(s))out.symbolErrors.push(t+" @"+w+"x"+h)
    }
  }
  const ids=[...document.querySelectorAll("[id]")].map(e=>e.id);
  out.dupIds=ids.filter((x,i)=>ids.indexOf(x)!==i);
  const html=document.documentElement.outerHTML+[...document.scripts].map(s=>s.textContent).join("");
  const attrs=new Set((html.match(/data-[a-z0-9]+=/g)||[]).map(a=>a.slice(5,-1)));
  attrs.forEach(a=>{ if(!new RegExp("\[data-"+a+"\]|dataset\."+a+"\b").test(html))out.noHandler.push(a) });
  out.symbols=Object.keys(SHAPES).length; out.views=V.length;
  out.ok=!out.viewErrors.length&&!out.symbolErrors.length&&!out.dupIds.length&&!Object.keys(out.overflow).length&&!out.noHandler.length;
  console.log(JSON.stringify(out,null,1)); return out;
})();
