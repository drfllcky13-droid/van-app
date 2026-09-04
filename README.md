# FSU

Scene documentation and van upkeep for the Williamsport Bureau of Police Forensic Services Unit.
One HTML file, no server, runs offline on an iPad, a phone or a desktop.

## Where it runs

The app is live at **https://drfllcky13-droid.github.io/van-app/**

GitHub Pages serves this repository's `main` branch directly. A push to `main` is live within about
a minute. Nothing needs to be enabled or deployed by hand.

**Install sheet:** https://drfllcky13-droid.github.io/van-app/install.html — one printable page with
the address as a QR code, the home-screen steps for iPad, Android and desktop, and how to connect a
device to the van data. Print it and pin it in the van.

## Getting a device going

1. Open the address above in Safari (iPad or iPhone) or Chrome (Android, desktop).
2. Add it to the home screen: Safari → Share → Add to Home Screen; Chrome → menu → Install app or
   Add to Home screen; desktop Chrome or Edge → the install icon at the right of the address bar.
3. Open it from its icon once while online. From then on it works without a connection.
4. To share the van list with the other devices, open **Data** in the app. Owner and repository are
   already filled in (`drfllcky13-droid` / `van-data`). Paste the unit's access token, set the
   token's expiry date, tap **Connect**. The list pulls straight away and every change after that
   saves itself a couple of seconds later. This is done once per device.

## The access token (whoever administers the GitHub account)

The van data lives in the private repository `drfllcky13-droid/van-data` as one file, `data.json`.
Devices read and write it with a fine-grained personal access token:

GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
Repository access: **only `van-data`**. Permissions: **Contents: Read and write**, nothing else.
Expiration: the longest offered. Copy the token once, hand it to the devices, and enter the expiry
date in the app so it warns before the token lapses. When it lapses, generate a new one and paste it
on each device under Data.

The token is stored in the browser on each device only. It is left out of backup files.

## What stays on the device

Case material (incidents, forms, sketches, photographs) never syncs and never reaches GitHub. It
leaves a device only as an exported PDF, Word, DXF or case package. Keep it that way. The app
repository is public; nothing in it is case material.

## For whoever maintains it

- `index.html` is the app. It is built from `src/` by `node build.js`; edit the parts, not the file.
- `sw.js`, `manifest.webmanifest` and the icons make it installable from a web address.
- `fsu-tests/` is the Playwright suite (`npm install`, `npm run install-browser`, `npm test`).
- `HANDOFF.md` explains the structure and the things that bite. `CHANGELOG.md` is the version history.
- `.github/workflows/fsu.yml` checks the build and runs the suite on every push.

To ship a change: edit under `src/`, run `node build.js`, run the suite, commit `src/` and
`index.html` together, push to `main`.
