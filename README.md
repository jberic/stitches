# Say It With Stitches

Type a phrase, get a two-colour cross-stitch pattern in a retro lettering style. "Generate again" gives the same words in a new style.

## Run it locally

```bash
npm install
npm run dev
```

`npm run build` makes a static site in `dist/`. Everything runs in the browser; there is no backend.

## Fonts

All fonts are under the [SIL Open Font License 1.1](https://openfontlicense.org), self-hosted from `public/fonts/`, with each font's `OFL.txt` next to it. Files come from the [Google Fonts repository](https://github.com/google/fonts). Bagel Fat One is cut down to Latin characters (1.5 MB to 51 KB) with `scripts/subset-fonts.sh`; the others are unmodified. Fonts with a Reserved Font Name (Chango, IBM Plex) must stay unmodified under the OFL.

| Font           | Use                               | Copyright                                     |
| -------------- | --------------------------------- | --------------------------------------------- |
| Chango         | Wordmark                          | © 2011 Fontstage. Reserved Font Name "Chango" |
| Shrikhand      | Pattern lettering                 | © 2015 Jonny Pinhorn                          |
| Bagel Fat One  | Pattern lettering                 | © 2022 The Bagel Fat Project Authors          |
| Rubik Mono One | Pattern lettering (capitals only) | © 2015 The Rubik Project Authors              |
| Fraunces       | Headings                          | © 2018 The Fraunces Project Authors           |
| IBM Plex Sans  | Interface                         | © 2017 IBM Corp. Reserved Font Name "Plex"    |
| IBM Plex Mono  | Codes and counts                  | © 2017 IBM Corp. Reserved Font Name "Plex"    |

## Stitch palettes

Every pattern sits on one fabric, cream #FBF3EC, and uses two threads from one of 11 palettes in `src/data/palettes.ts`: one for the lettering, one for the accent (shadow, ornaments, and in v2 the icons).

- Built from the hues of the design handoff ("Cross Stitch Design System", stitch palettes): the darker colour of each handoff palette letters, the other hue becomes the accent.
- Threads are stored as codes only; names and screen colours come from `threads.json`. Each code is the closest thread (CIEDE2000) to the handoff colour that passes on the fabric: lettering at least 4.5:1, accent at least 2:1. Tests check every palette.
- Pale hues had to darken to stay visible on cream: blush became 21 Alizarin Light, straw 833 Golden Olive Light, ecru 3023 Brown Gray Light. The handoff's garnet (#5F051C) has no close thread; 814 Garnet Dark is a little lighter.
- The fabric's screen colour is a design choice, not thread data. Screen colours are approximate for every thread. Check against a physical thread card.

## Thread colour data

`src/data/threads.json` lists 489 DMC stranded cotton colours as `{ code, name, hex }`.

- Source: [craft-color-codes](https://github.com/makebead/craft-color-codes) by MakeBead, file `data/json/dmc-floss.json` (fetched 2026-10-05). Only `code`, `name` and `hex` were kept. Nothing was typed by hand.
- Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit: "Color data: craft-color-codes by MakeBead (https://makebead.com)". The site shows this credit in the About panel and on every downloaded image.
- Provenance (from the source's `SOURCES.md`): cross-checked against floss.maxxmint.com, adrianj/CrossStitchCreator and xstitchify.com.

DMC does not publish screen colours for its threads. Every hex value here is an approximation. Check against your physical thread card.

DMC is a trademark of its owner. This project is not affiliated with DMC. Thread codes are used as plain text only, to identify colours.
