applyTheme();applyMode();render();fitHeader();
if(typeof requestAnimationFrame==='function')requestAnimationFrame(fitHeader);
claimStorage();
if(ghOn())ghPull(true).then(()=>renderSyncPill());
