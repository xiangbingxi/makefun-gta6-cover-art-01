# Vice Cover Studio — GTA 6-style cover art maker

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/xiangbingxi/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/xiangbingxi/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Turn your photo and a caption into a multi-panel cover in the Vice City
sunset style, right in the browser. Photos never leave your machine.
Built for the [make.fun](https://make.fun/c/gta6-cover-art-01) bounty
`gta6-cover-art-01`.

## What it does

- **Any photo, several panels** — upload up to three photos (hero plus
  two more) or fill every panel with a single photo. Panels without a
  photo become hand-drawn sunset scenes (striped sun, skyline, palms),
  so the cover always looks finished.
- **Face-aware crops** — Chrome's built-in FaceDetector centres each
  panel on a face when it finds one; zoom and focus sliders frame it
  by hand when it doesn't.
- **Three layouts** — Vice Grid (staggered comic-page grid), Leonida
  Four (2×2), Sunset Hero (one big hero plus a strip).
- **Five grades** — Vice Sunset, Neon Nights, Golden Mile, Palm Noir,
  Cotton Candy, plus halftone print dots and film grain.
- **Lettering** — a big stacked title that breaks the grid, a subtitle,
  two callouts with leader lines, a round seal stamp, and an editable
  billing block.
- **Export** — PNG in 1080×1080, 1080×1350 and 1920×1080, one at a
  time or all three at once.

## Run it

```sh
node serve.ts            # http://localhost:8080
```

No build step, no network requests: `app/` is plain static files.

## Screenshots

`dev/shots.mjs` (Playwright) re-takes `screenshots/` from `shots.json`.

## Entry

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` to `/output` and writes `dossier.json` with the kit's
vendored library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Everything drawn here is original: no Rockstar logo, artwork or font.
Sample photos are the kit's own free-to-use samples.
