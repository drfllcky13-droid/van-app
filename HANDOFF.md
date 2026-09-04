# FSU — handoff brief

A single-file web app for the Williamsport Bureau of Police Forensic Services Unit. Two halves
sharing a shell: **van inventory** (compartments, items, sweeps, reorder) and **scene
documentation** (incidents, forms, sketches, bundled PDF reports).

Built over one long session against a real van and one real sweep. It works. The structure is
the problem, not the behaviour.

---

## 1. What you are inheriting

| | |
|---|---|
| `index.html` | 771 KB, built from `src/` by `node build.js` (twelve parts, see `src/README.md`). Libraries loaded on demand from cdnjs: jsPDF, the QR encoder, JSZip for Word export, svg2pdf for the vector option. Beside it: `sw.js`, `manifest.webmanifest`, icons, `sweep.js`, `fsu-tests/`, `CHANGELOG.md`, and a GitHub Actions workflow that checks the build and runs the suite |
| JavaScript | 635 KB, all global scope. The extensions sit in four blocks just before the init call (sketch rounds one to three, then round four for the van side: guided sweep, item cards, verification, reorder states, labels and deep links, activity log, count mode) and hook into the existing listeners |
| CSS | 58 KB, one `<style>` block |
| Views | 20 `<section class="view">` elements, shown and hidden by a `view` string. Tabs are Home, Scenes, Guide, Storage, Items; the old Active and Scenes tabs are one list with an Open and Closed filter, and `forms` is now reached only through it |
| Symbols | 142 SVG shape functions `(w, hh, o?) => string`. Area fills take the object as a third argument for pattern ids and the fill choice |
| Event handling | 6 delegated listeners on `document`, dispatching by `closest("[data-x]")` |

Runs from a local file or GitHub Pages. Lives at https://drfllcky13-droid.github.io/van-app/
(repository `drfllcky13-droid/van-app`, Pages source: branch `main`, root; a push to `main` is live
within about a minute). `install.html` beside it is the printable install sheet. Works offline. No server. Served over http it registers
`sw.js` (network first, cache fallback) and can be added to the home screen; Settings › This device says how.

**Test data:** `van-backup-2026-09-04.json` — 72 items, 62 compartments, 41 items placed across
unit 1. Load it through the app's own restore (Settings › Restore or import), not by assigning to
`S`, which is a `const`.

---

## 2. Architecture as it stands

**State.** One object `S`, persisted to `localStorage` on every change via `save()`.
Contains `items`, `comps`, `forms`, `fills`, `sketches`, `incidents`, `walls`, plus settings.
`live()` filters `S.items` to those not marked "Not carried".

**Storage split, and it matters.**
- `localStorage` — everything above. **Hard ceiling around 5 MB**, measured, not assumed. A failed
  save now shows a red bar and keeps retrying the real store on every change; before, it fell
  silently into memory and everything after was lost on reload. `S.activity` (last 500 actions with
  initials) and `S.errors` (last 20) live in it too.
- `IndexedDB` (`vanphotos` store) — photographs and sketch backdrops, which are megabytes each.
  Referenced from state by id only. Quota is 60% of disk.
- Getting this wrong breaks saving *everything*, not just images. Do not move images back.

**Rendering.** `render()` calls a `renderX()` per view, each rebuilding `innerHTML` from state.
No framework, no virtual DOM, no reactivity. Re-render is the only update mechanism. The sketch
view is the exception: `renderSketch` still builds one string, but `patchSketchView` splits it
into regions (`#skhead`, `#skedit`, `#skbars`, `.canvaswrap`, `#skpanel`, `#skrail`) and only
replaces a region whose markup changed, so the rail keeps its scroll and nothing flickers.

**Navigation.** `NAV` array of state snapshots. `navRecord()` runs at the top of `render()`;
back buttons call `navBack(fallback)`. Tab clicks go through `go(v)`, which clears `prevView`.

**Layout.** Three modes driven by body classes: phone (bottom tabs), `wide`, `xwide`
(side nav, and a split master/detail pane for drill-downs listed in `DETAILS`).

**Sync.** Optional GitHub push of a JSON payload. **Sketches, filled forms and photographs are
deliberately excluded** from both sync and backup — that is case material and it stays on the
device. Keep that. The only way case material leaves the device is a **case package** (Settings › Case packages,
or Scene › Save a case package): one JSON file with incidents, forms, sketches and photographs,
shared to Files. The same view restores one. A sketch nags after six hours of changes with no
package.

---

## 3. Conventions worth preserving

- **Symbols** are `(w, hh) => svgString` using classes `k-fill`, `k-stroke`, `k-thin`,
  `k-thick`. Every symbol is plan view (seen from above). Vehicles are landscape, filled
  silhouettes with white cut-outs for glass. Ten symbols that fell short of the traced set were
  redrawn on 4 September 2026 in a block right after the `SHAPES` table (SUV, van, motorcycle,
  bicycle, scooter, dumpster, blood transfer, blood wipe, print lift, pry mark); the originals
  above it are dead and marked as such. Body moved from Markers to Evidence and the single key
  moved to Belongings. SUV and van changed from portrait to landscape, so any sketch made before
  that day with either symbol will show it squashed until it is re-placed; no real sketches existed.
- **The van thumbnail** on the Storage cards is an inline SVG side profile (`vanSVG`, classes `vs-*`)
  inside the existing `.vanwrap` and `.vanbody` boxes, so the mirroring for driver-side bays and the
  compartment overlay grid are unchanged. The overlay maps to x 48 to 249 of the 255-wide drawing;
  keep those bounds if the drawing changes. Before this it was a CSS-clipped box.
- **The bay wall** (`renderBay`) keeps the wall's true proportions (`aspect-ratio: cols/rows`) and zooms
  by layout width inside a scrolling box, so container queries reveal names as tiles grow. Pinch,
  ctrl-scroll and the bar all call `bayZoomApply`. A tap on a tile previews it in `#baypop` and
  highlights its list row; a second tap opens it. In the desktop split pane the header drops the van
  thumbnail for a Sweep-this-bay button. Unnamed bins are dashed; empty ones say so.
- **Home is one template for every size** (`renderHome`): a header line (unit, date, initials, sweep
  state), four status tiles that only take colour when something is wrong, then a two-column grid
  (`.dash2`, one column under 1000 px): Scenes with the open list, Next actions (which absorbs the
  setup checklist, export and case-package nags, and the sync-token warning), Needs attention,
  Units, Quick find, Settings. `setupCard`, the old `.dashfixed` grid and the phone strip are no
  longer used by Home. Tile and row taps go through the existing `data-list`, `data-go`,
  `data-inc` and `data-item` handlers; `data-caseall` saves a package of everything.
- **Scenes, Guide, Storage and Items** open with the same header line and four status tiles
  (`scenesHead`, `guideHead`, `storageHead`, `itemsHead`, built on `tabHead` and `tabTiles`).
  Tiles reuse existing handlers; the Guide tiles and chips set `guideFilter`, which filters the
  grouped list. Settings keeps its menu-and-sections layout. Never hardcode colour — those classes read `--kc`, which carries the object's ink
  and the light/dark theme. Fractions of `w`/`hh` only, never fixed numbers, or resizing warps.
- **Linear symbols** (fence, road, baseline, tiretrack, stairs) compute repeat count from a
  fixed pitch so stretching adds detail rather than scaling it. Keep that behaviour.
- **Voice.** Plain sentences, no jargon, no exclamation marks. Warnings state the consequence
  ("nothing can be reported low"), not just the fact. Never write in the developer's voice —
  there was an "I'll set them for you" string in the app for a while and it was wrong.
- **Court-facing output** must not look more authoritative than it is. The bundle cover says
  "This bundle is a copy assembled from the unit's records. The case file remains the record."
  Do not add seals, watermarks, or auto-generated summaries of contents.

---

## 4. Known-fragile parts

**These caused real bugs today. Test them specifically after any refactor.**

1. **Duplicate delegated handlers.** Several near-misses where two listeners matched one click:
   the first navigated, the second saw the *new* state and navigated again. Back buttons now
   call `stopPropagation()`. Any new global listener risks reintroducing this.
2. **Removing "dead" code.** Twice, code that looked unreachable was live. Deleting the old
   layer-rename handler took the object-options sheet with it. Grep for the `data-` attribute
   before deleting its handler.
3. **`getBBox()` ignores the element's own transform.** Measuring symbols through the element
   itself gave bounds 10× too large and every traced symbol rendered tiny. Measure through a
   parent wrapper.
4. **Two stylesheets.** The app's `<style>` and a separate inline one inside the PDF export
   string. Anchoring a CSS insert to the wrong one silently does nothing.
5. **Two headers.** The sketch title block is drawn twice — SVG for screen, jsPDF for export.
   They are separate code and have drifted before.
6. **The symbol tables** (`SYM`, `VEH`, `FURN`, `WPN`, `SHAPES`) are separate top-level constants
   after `snapEdges`, about 120 KB of path data. First thing to move into their own file.
7. **Hooks.** New sketch behaviour is reached through calls placed inside the existing listeners:
   `sketchExtraClick2` then `sketchExtraClick` (click), `extraPointerDown2` then
   `extraPointerDown`, the same for move, and `extraPointerUp`. Round two adds capture-phase
   pointer listeners for pinch only, a `wheel` listener, a `change` listener for typed sizes and a
   second `keydown` for zoom keys — none of them click. Adding another click listener is how the
   duplicate-handler bug comes back.
9. **Zoom is a viewBox.** `ZOOM` holds scale and offset; `canvasPt` maps through it and handles
   are sized in screen pixels via `handleU()`. Export ignores it. Anything that reads pointer
   position must go through `canvasPt`.
10. **`openSheet` adds its class on the next frame.** `closeSheet` before that frame is now
   honoured (the frame checks the scrim is still on). Sheet buttons that start a canvas mode rely
   on this.
11. **`objSVG` is a guard** around `objSVGRaw`. A throwing symbol draws a red placeholder instead
   of blanking the sketch, and `repairSketch` runs at the top of `renderSketch`.
12. **Uncaught errors are logged** to `S.errors` (last twenty, shown under Settings › Recent errors) with a
   toast. Do not let that become a reason to leave errors in.
13. **Canvas modes** are plain globals: `PLACE`, `polyDraw`, `measPick`, `layerMove`, `inkDraw`,
   `multi`. Each has a bar above the canvas and Escape clears it. The pointer hooks check them in
   round-three-first order; a new mode goes at the front of `extraPointerDown3`.
14. **`appExtraClick` runs first** in the main click listener, before the back button. It owns
   every `data-` attribute added in round four and intercepts `data-check` when a compartment
   holds regulated stock that has not been counted today.
15. **Deep links.** `#c=CODE`, `#i=ID`, `#s=ID`, `#inc=ID` open a compartment, item, sketch or
   incident on load and on `hashchange`, then clear the hash. QR labels encode them with the
   address under Settings › Labels. The in-app scanner (`scanSheet` in ext-van.js) uses `BarcodeDetector`
   where it exists and otherwise loads jsQR from jsdelivr on first use; every device also gets a
   photo route through a file input with `capture`, decoded the same way.
16. **The settings page is a menu.** `renderData` draws `settingsMenu()` when `SET_SEC` is null and
   `settingsSection(SET_SEC)` otherwise; `openSettings(sec)` lands on a section from anywhere
   (Home uses `data-gosec`). Control ids (`#ghconnect`, `#dlj`, `#wipe`, `#whoin`…) are unchanged
   and their delegated handlers still apply; a handler that calls `renderData()` keeps the section
   open. `foldData` in ext-van.js is no longer called.
8. **Two stylesheets, still.** Measurement lines and area fills have classes in both the app
   `<style>` and the PDF export string. Add to both or the print loses them.

---

## 5. The sweep — do not drop this

Every change today was checked by a script that, at **1500 / 1194 / 393 / 320 px** and in
**both colour schemes**:

- renders all 19 views and fails on any thrown error or console error
- renders all 107 symbols at 5 sizes each, failing on `NaN`, `undefined` or empty output
- checks horizontal overflow is 0
- checks no touch target is under 40 px
- checks for duplicate `id`s, unstyled classes, unbalanced CSS braces
- checks every `data-` attribute in markup has a handler

It caught roughly a dozen bugs that reading the code did not. The original script was not in
the handoff; a rewrite is in `sweep.js` beside this file, and `fsu-tests/` runs it in Chromium at
all four widths in both schemes plus twelve sketch flows (`npm install`, `npm run
install-browser`, `npm test`). Twenty checks, all passing on 4 September 2026. Run it before
and after every change.

---

## 6. First refactor, in order

1. **Split the file.** Started: `src/` holds twelve parts and `node build.js` concatenates them
   byte for byte; CI refuses a commit whose `index.html` disagrees. The parts follow the
   extension rounds, not the views. Next is moving the symbol tables out of `app.js`, then the
   views one at a time. The single-file deployment stays.
2. **Move the symbol tables** into data files.
3. **CI.** `.github/workflows/fsu.yml` runs the build check and the 36-test suite on every push.
   Pages needs no workflow: it serves the branch. Do not add a `deploy-pages` workflow unless the
   Pages source is switched to GitHub Actions in the repository settings, or every push goes red.
4. **Then** touch behaviour.

---

## 7. Feature backlog

The September 2026 survey (see `sketch-tool-comparison.md`) listed what FARO Zone 2D, Leica
Map360, Easy Street Draw and Crime Zone had that FSU did not. Most of it is now built:

- **Baseline and triangulation entry.** Measure button, or Place by measurement on any object.
  Two fixed points and two tape distances place the object. The measurement prints as a table
  in the PDF and as dashed lines on the sketch (Measurement lines toggle).
- **Walls by dimension.** A room from width and depth, or a run of walls with turns. Typed
  width, depth, length and rotation on every object. Corners overlap by half a thickness so
  they meet cleanly.
- **24 line types.** Guardrail, railroad, skid mark, centre and edge lines, curb, sidewalk,
  scene tape, property line, footprints, blood trail, path of travel and so on. All repeat at
  a fixed pitch when stretched.
- **Area fills.** Hatched boxes and ovals, grass, water, concrete, gravel, tile, wood, brick,
  blood pool. Outline an area by tapping its corners; drag the corners afterwards.
- **Templates.** Six standard layouts plus save-your-own. Saved templates sync with the van
  data, so the sheet tells the user to save layouts, not real scenes.
- **DXF export.** R12 DXF with one CAD layer per sketch layer, in real units when the sketch
  has a scale. Symbols go across as outlines with their names.
- **Print at a fixed ratio** on Letter, Legal or Tabloid, so a ruler works on the paper.
- **Copy and paste style, favourites and recents** in the palette, and a screen-only grid.

Round two, built the same day for speed on the iPad and for durability:

- **Pinch zoom and pan**, ctrl-scroll on a desktop, plus and minus keys, a zoom bar on the
  canvas. Handles are sized in screen pixels so they stay grabbable at any zoom.
- **Tap to place.** Tap a symbol, then tap the page. **Marker mode** places the next number on
  every tap. The palette also opens as a sheet on phones so the page stays in view.
- **Toolbar grouped** into Draw, View and Scene; the bar is seven buttons at most.
- **Measure by tapping** the two fixed points instead of picking from a list, and a third
  method, **distance and bearing**, for total-station style notes.
- **Move everything on a layer** from the layer's options.
- **Saving that fails says so** and keeps retrying. A **red placeholder** replaces an object that
  will not draw. **Damaged values are repaired on load** and sketches carry a schema version.
- **Case packages** carry sketches, forms and photographs off the device and back.
- **Rough or finished** printed in the title block.

Round three, for a glitch-free feel:

- **Only what changed redraws**, so no flicker and no lost scroll. **Every uncaught error** shows a
  toast and is listed under Settings. **Installable** with a service worker for guaranteed offline.
- **Freehand ink** with the Pencil, palm rejection once a Pencil is seen. **Camera** straight from
  a photo point. **Live distances** while a measured object moves; the record follows the drop.
- **Select several** by tapping or dragging a box, then move, recolour, duplicate or delete.
- **Rotation snaps** to right angles on touch. **Saved** tick on every save. **Undo survives a
  reload.** **How to sketch a scene** in five steps under Draw. The Scene group is now Setup.

Round four, the van side:

- **One vocabulary.** Home, Scenes, Guide, Storage, Items, the same on the side and the tabs.
  Scenes is one list, open or closed.
- **Home leads with the urgent thing**, and a setup checklist shows what a new unit still needs.
- **The sweep walks itself**: by bay, with names, next unchecked, Swept-and-next, scan a label.
- **Items on a phone are cards** with a count you tap. **Count mode** walks every compartment.
- **Guide verification** confirms each set of instructions with a date and initials.
- **Reorder** has Ordered and Received states, and the sent list leaves out what is on order.
- **Reagents** carry lot, received and opened. **Regulated stock** is counted before a sweep mark.
- **QR labels** for compartments and items open the app at the right place; an in-app scanner
  where the browser has one. **Initials and an activity log** under Settings.

Still not built, in priority order:

1. **Wall joining** when dragging existing walls by hand (typed runs already meet).
2. **Vector PDF** instead of the rasterized sketch, for sharper court prints.
3. **A per-item photograph** for the guide, so a new officer recognises the kit.
4. **User-defined line types** and hatch patterns; **DXF import**.
5. **The file split** from section 6. Four extension blocks now.
6. **RMS integration.** Non-technical; see section 8.

**Not worth building:** point clouds, trajectory cones, body posing, animation. Map360 Pro and
FARO Zone 3D do these and the unit already owns a FARO.

---

## 8. On the desktop-app question

Nothing in the backlog above requires it. The storage argument ended when photographs moved to
IndexedDB. Tauri or Electron wraps this same codebase later without a rewrite, so the decision
stays cheap.

Two things would force it, both non-technical: **IT policy** forbidding case material in a
browser app, or a requirement to **integrate with EFORCE or the RMS** directly. Establish those
before writing code.

---

## 9. Still untested by a real user

Be sceptical of all of this — it is one sweep old.

- The measurement entry, wall tool, line types, area fills, templates and DXF export were
  built and swept on 4 September 2026 against a test sketch only. No DXF has been opened in
  real CAD software yet; try one in FARO Zone before relying on it.
- Round two (same day): pinch zoom and pan, tap to place, marker mode, grouped toolbar, symbols
  sheet, measuring by tapping the points, distance and bearing, layer move, save-failure bar,
  render guard and repair, case packages, rough or finished sketch. Pinch was tested with
  synthetic pointer events only — try it on the iPad. Case package restore was tested with a
  package that had no photographs.
- Round three (same day): render split, error log, home-screen install, Setup rename, rotation
  snap, freehand ink with Pencil-only palm rejection, camera from a photo point, live distances
  with the record following a drop, select several, saved tick, undo across reloads, a
  first-sketch guide. The Pencil path was tested with synthetic pen events; the service worker
  was tested on localhost only; the camera button was not tested on a device.
- Round four (same day, the van side): one vocabulary and one Scenes list, home tiles by urgency
  with a setup checklist, a guided sweep by bay with names and a next button, item cards with
  tap counts on phones, a guide verification pass, ordered and received states on the reorder
  list, lot and received and opened dates on reagents, a count check on regulated stock before a
  compartment can be marked swept, QR labels with deep links and an in-app scanner, initials and
  an activity log, a folded data view, and a count mode. The QR encoder is loaded from cdnjs the
  first time labels are printed. The scanner was not tested on a device.
- Round ten (same day, reports and upkeep): wording snippets on narrative fields (`S.snippets`,
  seeded once), auto-fill from the incident including `S.whoName`, a Photograph log stock form
  fed by `syncPhoto` (STOCKV bumped so existing installs get it), Word export built by hand as
  OOXML through JSZip, a vector option for the sketch PDF through svg2pdf with computed styles
  inlined and a raster fallback, `APP_VERSION` on every export, a weekly vehicle check
  (`S.vehicleChecks`), part numbers on items and the reorder list, a handover note on Home
  (`S.handovers`), service and calibration on durable kit, a help sheet with the change log.
  The Word file was checked for a valid zip and structure, not opened in Word; open one.
- **Sample case.** `fsu-tests/sample.js` builds a complete incident (entry log, evidence log, photo
  log with placeholder photographs, sketch with measurements and photo points, report) in a fresh
  browser and saves every export to `sample-2026-0912/`; `fsu-tests/pdf2png.js` renders any PDF
  to page images through pdf.js. Use them to eyeball output after a change. Fixes found this way:
  measurement table rows no longer overlap or split across pages, captions stay upright on rotated
  photo points, long fields keep their line breaks in the PDF, the photo log is in the bundle order.
- **Bundle order** is report, entry log, evidence log, sketch, photo log. The photograph index page
  is switched off (`BUNDLE_PHOTO_INDEX=false`; the code is kept). The photo log prints each row
  with a thumbnail of the photograph attached to the matching photo point (`photoThumbs`,
  `photoRowsPDF` in the PDF export); rows without an attached copy get a dashed placeholder. Pictures print at 240 by 180 points, so a log runs two photographs to a page.

- Incidents, bundles, photo points and layers have **never been used on a live scene**.
- Only unit 1 of 4 has been inventoried. 19 compartments in unit 2 are still unnamed.
- The reorder list has never been handed to anyone who orders stock.
- The bundle has never been given to whoever receives it. Its order and cover are a guess and
  should be expected to change.
