# Source parts

`index.html` is built from these files, in this order, by `node build.js` in the folder above:

| Part | What it holds |
|---|---|
| `head.html` | doctype, meta, icons, manifest, the opening `<style>` |
| `app.css` | every style rule, app and print |
| `body.html` | the closing `</style>`, the shell markup, the 20 views, the opening `<script>` |
| `app.js` | the original app: state, storage, van, forms, incidents, sketch engine, PDF, bundles |
| `ext-sketch-1.js` | measurement entry, walls by dimension, line types, areas, templates, DXF, favourites |
| `ext-sketch-2.js` | zoom and pan, tap to place, grouped toolbar, case packages, save-failure bar, repair |
| `ext-sketch-3.js` | render split, error log, ink, selection, live distances, undo persistence, guide |
| `ext-van.js` | one Scenes list, guided sweep, item cards, verification, reorder states, labels, activity, count mode |
| `ext-tabs.js` | header lines and status tiles for Scenes, Guide, Storage and Items |
| `ext-reports.js` | report wording, photo log, Word export, vector PDF, vehicle check, handover, service, help |
| `init.js` | the one line that starts the app |
| `tail.html` | the closing tags |

Edit the part, run `node build.js`, and commit both. CI runs `node build.js --check` and refuses a
commit whose `index.html` does not match `src/`.

The next step in the split is moving the symbol tables (`SYM`, `VEH`, `FURN`, `WPN`, `SHAPES`)
out of `app.js` into a data part of their own, then the views one at a time.
