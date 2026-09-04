// Builds index.html from the parts in src/. Run `node build.js` after editing anything in src/,
// or `node build.js --check` (CI) to fail if index.html is out of date.
const fs=require("fs"),path=require("path");
const ORDER=["head.html","app.css","body.html","app.js","ext-sketch-1.js","ext-sketch-2.js","ext-sketch-3.js","ext-van.js","ext-tabs.js","ext-reports.js","init.js","tail.html"];
const out=ORDER.map(f=>fs.readFileSync(path.join(__dirname,"src",f),"utf8")).join("");
const target=path.join(__dirname,"index.html");
if(process.argv.includes("--check")){
  const cur=fs.existsSync(target)?fs.readFileSync(target,"utf8"):"";
  if(cur!==out){console.error("index.html does not match src/. Run: node build.js");process.exit(1)}
  console.log("index.html matches src/ ("+out.length+" chars)");
}else{
  fs.writeFileSync(target,out);
  console.log("built index.html ("+out.length+" chars) from "+ORDER.length+" parts");
}
