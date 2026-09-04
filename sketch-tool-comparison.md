# What the commercial scene-sketching tools do

Surveyed September 2026. The products worth comparing against are FARO Zone 2D and 3D,
Leica Map360 (Sketch / Standard / Pro), Trancite Easy Street Draw and ScenePD, CAD Zone's
Crime Zone, and the generic tools some agencies use instead (SmartDraw, EdrawMax, CAD Pro).

---

## Where FSU already matches them

| Feature | Them | FSU |
|---|---|---|
| Symbol library with search | Thousands (FARO Zone 2D), 800+ (Easy Street Draw) | 108, searchable |
| Layers | Standard | Yes, with locking |
| Auto legend from markers | Standard | Yes |
| Title block: case, date, location, preparer | Standard, and expected in court | Yes, plus separate scene/prepared/printed dates |
| Undo / redo | Unlimited (Crime Zone) | 40 steps |
| Autosave | Automatic save and incremental backups | Yes, plus GitHub sync |
| Aerial map to scale | Google / Bing import | County GIS at up to 4096 px, plus FARO and Pix4D ortho import |
| Scale bar and "not to scale" statement | Standard | Yes |
| Photographs attached to the diagram | Photos and hyperlinks (FARO), pop-up images and audio (CAD Pro) | Photo points with images, and a photograph index in the bundle |
| Export to PDF | Standard | Yes, plus the whole-incident bundle |

---

## What they have that FSU does not

Ordered by how much it would matter to a forensic services officer working a scene.
**Update, 4 September 2026:** items 1 to 6 and most of 9 are now built. See the note under each.

### 1. Measurement entry — baseline and triangulation
FARO Zone 2D lets you "enter hand measurements in baseline or triangulation format" and merge
that with total station data. **This is the biggest single gap.** FSU has baseline and
triangulation *symbols* but no way to type in the measurements and have the object placed.
This is how a scene is actually measured with a tape, and it is what makes a sketch defensible.

*Built.* Measure button, or Place by measurement on any object. Triangulation from two fixed
points, or distance along a baseline plus an offset. Fixed points are reference points,
baseline ends, markers and the corners of any named wall or room. The measurement prints in a
table on the PDF and, optionally, as dashed lines on the sketch.

### 2. Drawing tools that work from dimensions
Wizards for roads, walls, stairs, doors and windows drawn "to exact dimensions", plus automatic
snapping that creates "perfect corners between lines and walls". FSU places symbols and resizes
them by dragging; you cannot say "this wall is 12 ft 4 in".

*Built.* Walls by dimension draws a room from width and depth, or a run of walls with left and
right turns, in feet and inches or metres. Every object now takes a typed width, depth, length
and rotation. Doors, windows and stairs are still placed by hand.

### 3. Line types
40+ in FARO Zone 2D, 100+ in Crime Zone — fences, guardrails, railroad track, skid marks,
centre lines, footprints — applied to any line or curve. FSU has five shapes that repeat
correctly when stretched, which is the same idea at a much smaller scale.

*Built, in part.* A Lines category with 24 types, all repeating at a fixed pitch. Not yet
applicable to curves, and no user-defined types.

### 4. Hatch and fill patterns
Crime Zone ships 50+ for grass, concrete, water and blood, used to show spatter on walls,
fluid spills and terrain. FSU has no area fill at all.

*Built.* Twelve fills (hatch, cross-hatch, dots, tint, grass, water, concrete, gravel, tile,
brick, wood, blood) on boxes, ovals and outlined areas drawn corner by corner.

### 5. Templates
Agency-wide intersection templates and custom report templates, so a common scene layout is
not redrawn each time. FSU starts every sketch blank.

*Built.* Six standard layouts (intersections, two-lane road, room, parking bay, vehicle stop)
and save-your-own from any sketch.

### 6. CAD import and export
DXF/DWG both ways. Matters if a scene ever goes to a reconstructionist or an outside expert —
they will ask for a CAD file, not a PDF.

*Export built.* R12 DXF, one CAD layer per sketch layer, real units when to scale. Import is
not built.

### 7. RMS integration
Trancite claims 60+ records-management integrations so a diagram attaches straight to the report.

### 8. Reconstruction and 3D
Map360 Pro and FARO Zone 3D do point-cloud work, bloodstain pattern area-of-origin, bullet
trajectory with error cones, body posing, witness views and animation. This is a different
class of product and not somewhere a browser tool should try to go.

### 9. Smaller things
Match and clone object properties; favourites toolbars; AI removal of parked cars from satellite
imagery; multi-language; a double-precision CAD engine; print at any scale on any paper size.

*Built:* copy and paste style, favourites and recents in the palette, print at a fixed ratio on
Letter, Legal or Tabloid, a grid at the snap pitch, pinch zoom and pan, tap to place, and a
marker mode, freehand ink with the Apple Pencil, marquee selection, and live distances while an
object moves. *Not built:* car removal, languages, a CAD engine.

---

## What FSU has that none of them do

- **The van.** Inventory, par levels, compartment map, sweep, reorder list. No sketching product
  touches this.
- **Incident bundling.** One packet with a cover page, contents with page ranges, continuous
  numbering and gaps listed. The others export a diagram; the report is assembled by hand.
- **Markers writing themselves into the evidence log**, so the numbers cannot disagree.
- **Case packages.** Sketches, forms and photographs leave the device only as one file the
  officer chooses to share, and come back the same way.
- **Runs on an iPad in a browser, offline, with no licence.** Map360 and FARO Zone are Windows
  desktop software with per-seat pricing.

---

## What is left

The three things named here in the original survey (measurement entry, walls by dimension,
area fill) and DXF export are built. The remaining gaps that matter are wall joining when
dragging by hand, user-defined line types and hatches, and DXF import.
