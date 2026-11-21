# Vice Cover Studio

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/xiangbingxi/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/xiangbingxi/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01)

A browser cover maker in the Vice City neon-sunset style: drop in your
photos, pick a layout and a grade, letter it like a game cover, and export
the post sizes in one step. Built for the
[make.fun](https://make.fun/c/gta6-cover-art-01) bounty `gta6-cover-art-01`.

## What you get

- **Three photos, four panels** — a hero photo plus two more, or one photo
  stretched across every panel. Any panel left empty is filled with a
  hand-drawn sunset scene (striped sun, skyline, palms, birds, water), so
  the cover is never unfinished.
- **Face-aware framing** — where the browser offers FaceDetector, each
  panel centres on the face it finds. Zoom and focus sliders frame it by
  hand otherwise.
- **Three layouts** — Vice Grid (staggered comic page), Leonida Four (2×2),
  Sunset Hero (one big hero over a strip).
- **Five grades** — Vice Sunset, Neon Nights, Golden Mile, Palm Noir,
  Cotton Candy, with halftone print dots and film grain on top.
- **Genre lettering** — a stacked title that breaks the grid, a script
  subtitle, two callouts with leader lines, a round seal stamp, and a
  billing block, all editable.
- **Export** — PNG at 1080×1080, 1280×720, 1080×1350 and 1920×1080, one
  size at a time or all four together.

## Run it

```sh
node serve.ts            # http://localhost:8080
```

No build step and no network requests: `app/` is plain static files, and
your photos never leave your machine.

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
The two sample photos are the kit's own free-to-use samples.
