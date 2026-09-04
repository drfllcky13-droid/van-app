// Serves the folder above (where index.html lives) and runs the checks in Chromium.
const {defineConfig}=require("@playwright/test");
module.exports=defineConfig({
  testDir:"./tests",
  timeout:60000,
  retries:0,
  reporter:[["list"]],
  use:{baseURL:"http://127.0.0.1:8766",headless:true},
  webServer:{command:"node serve.js 8766",url:"http://127.0.0.1:8766/index.html",reuseExistingServer:true,timeout:20000},
  projects:[{name:"chromium",use:{browserName:"chromium"}}]
});
