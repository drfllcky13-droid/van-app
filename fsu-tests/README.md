# FSU checks

Runs the render sweep (`../sweep.js`) at 1500, 1194, 393 and 320 px wide in light and dark, then
drives the sketch flows in Chromium: measurement maths, walls by dimension, tap to place, marker
mode, outlining an area, freehand ink, marquee selection, layer move, DXF and PDF export, the
save-failure bar, the render guard and repair, case package round trip, and undo after a reload.

```
cd fsu-tests
npm install
npm run install-browser
npm test
```

Run it before and after any change to `index.html`. A failing sweep names the view, symbol or
attribute; a failing flow names the step.
