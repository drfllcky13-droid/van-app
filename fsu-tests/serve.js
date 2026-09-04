// Tiny static server for the tests: serves the parent folder, no caching.
const http=require("http"), fs=require("fs"), path=require("path");
const root=path.join(__dirname,".."), port=+(process.argv[2]||8766);
const types={".html":"text/html; charset=utf-8",".js":"text/javascript",".json":"application/json",".webmanifest":"application/manifest+json",".png":"image/png",".md":"text/plain"};
http.createServer((q,r)=>{
  const p=decodeURIComponent(q.url.split("?")[0]); const fp=path.join(root,p==="/"?"index.html":p);
  fs.readFile(fp,(e,d)=>{ if(e){r.writeHead(404);r.end();return}
    r.writeHead(200,{"Content-Type":types[path.extname(fp)]||"application/octet-stream","Cache-Control":"no-store"}); r.end(d) });
}).listen(port,"127.0.0.1",()=>console.log("serving "+root+" on "+port));
