# FSU change log

## 2026.09.04.16
iPad round. A bay from Storage opens as its own page instead of a pane beside the list. Picking a
symbol or any other tool ends freehand drawing, and the Done button in the freehand bar is now blue.
Full screen is on the sketch toolbar as well as in View. The object panel moved from under the
canvas to the top of the rail, so on any wide layout (iPad landscape included) it sits on the right
beside the drawing. Every object has Lock rotation: the rotate handle and buttons go away until it
is unlocked, so a placed object cannot be turned by accident.

## 2026.09.04.15
Sketch symbol previews (palette, symbols sheet, layer list) were near-black on the dark card when
dark mode was chosen under Settings, and black-ink objects in the layer list were dark in every dark
mode. Previews now take their ink from the theme; named inks use the theme tint. The drawing itself
is unchanged: it is white paper with black ink in both modes, as it prints.

## 2026.09.04.14
Scan a label works on every device. Chrome and Android use the built-in barcode reader; iPad and
iPhone load a QR reader (jsQR) the first time and scan live from the camera. Every device also gets
a Use the camera app button that takes a photo of the label and reads the code from it, which is
the route when the browser will not open the camera.

## 2026.09.04.13
Settings is a button at the top of Home and the last entry in the side navigation. The old Data
view is now a settings menu: grouped rows that each show their state (initials set, sync connected
and when it last synced, last backup, storage kept or clearable, errors recorded) and open on their
own page with a way back. The Display, Form templates, Report wording and Help entries moved here
from the bottom of Home. The bottom tab bar fills its width.

## 2026.09.04.12
Hosted at https://drfllcky13-droid.github.io/van-app/ straight from the `main` branch. An install
sheet, `install.html`, carries the address as a QR code, the home-screen steps for iPad, Android and
desktop, and how to connect a device to the van data. Van icon on the home screen. The Actions
deploy workflow is gone; Pages serves the branch directly.

## 2026.09.04.11
Bundle order is report, entry log, evidence log, sketch, photo log. The photograph index page is
gone; the photo log carries each photograph on its row at 240 by 180 points, two to a page. Measurement table rows no
longer overlap or split across pages, captions stay upright on rotated photo points, long report
fields keep their line breaks.

## 2026.09.04.10
Reports: standard wording inserted with one tap on any narrative field, edited under Data.
Forms fill from the incident, including officer name and rank, date, and the photograph count.
A photograph log fed by the sketch's photo points. Word export of any form. A vector option for
the sketch in the PDF. Upkeep: a weekly vehicle check with failures on Next actions, part
numbers on items and the reorder list, a shift handover note on Home, service and calibration
dates with a certificate link on durable kit. A help page with this change log, and the version
on every PDF, DXF and case package. The source is split into `src/` with a build and CI check.

## 2026.09.04.9
Home, Scenes, Guide, Storage and Items redesigned around a header line and status tiles.
The bay wall keeps true proportions, zooms, previews a bin on tap and marks unnamed bins.
Illustrated van on the Storage cards. Ten symbols redrawn in plan view; Body and Key moved.

## 2026.09.04.8
One vocabulary (Home, Scenes, Guide, Storage, Items). Guided sweep by bay with names.
Item cards with tap counts. Guide verification pass. Ordered and received on the reorder
list. Lot and count fields on reagents and regulated stock. QR labels with deep links and an
in-app scanner. Initials and an activity log. Count mode. Folded data view.

## 2026.09.04.7
Sketch: render split, error log, home-screen install, rotation snap, freehand ink with
Pencil-only palm rejection, camera from a photo point, live distances, select several, saved
tick, undo across reloads, a first-sketch guide.

## 2026.09.04.6
Sketch: pinch zoom and pan, tap to place, marker mode, grouped toolbar, symbols sheet,
measure by tapping, distance and bearing, layer move, save-failure bar, render guard and
repair, case packages, rough or finished in the title block.

## 2026.09.04.5
Sketch: baseline and triangulation entry, walls by dimension, typed sizes, 24 line types,
area fills and outlined areas, templates, DXF export, fixed-ratio printing, favourites, grid.
Playwright suite.
