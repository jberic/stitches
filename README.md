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

The Flourish stitch alphabet is drawn from Cinzel Decorative Bold (© 2012 Natanael Gama, Reserved Font Name "Cinzel", OFL 1.1). The capitals were turned into stitches once and stored as grids in `src/data/alphabets/flourish.ts`, so the font itself isn't shipped; the file and its `OFL.txt` are kept in `design/fonts/cinzeldecorative/`. The hooks, swashes and knots on the letters are drawn for this project.

## Thread colours

Every pattern sits on one fabric, cream #FBF3EC, and uses two threads: one for the lettering, one for the accent (shadow, ornaments, and in v2 the icons).

- **Colour wheel.** Pick either thread with a saturation and brightness square and a hue slider, or type a hex value or a thread code. Wherever you point, the pattern uses the closest thread in `threads.json`, measured with CIEDE2000 (how alike two colours look, not raw RGB), and the five closest are offered to choose between. Links store the two thread codes (`l` and `a`).
- **Suggested pairs.** Six pairs in `src/data/palettes.ts` to start from, built from the hues of the design handoff ("Cross Stitch Design System"). Each code is the closest thread to the handoff colour that passes on the fabric: lettering at least 4.5:1, accent at least 2:1. Tests check every pair. Links from before the colour wheel (`p=07`) still open in their exact threads.
- **Warnings, not rules.** Any two threads can be used. The picker says so in plain words when the lettering is pale on the fabric (under 3:1), when the two threads are hard to tell apart (under 1.8:1), or when the accent barely shows (under 1.25:1).
- The fabric's screen colour is a design choice, not thread data. Screen colours are approximate for every thread, so "closest thread" means closest on screen. Check against a physical thread card.

## Thread colour data

`src/data/threads.json` lists 489 DMC stranded cotton colours as `{ code, name, hex }`.

- Source: [craft-color-codes](https://github.com/makebead/craft-color-codes) by MakeBead, file `data/json/dmc-floss.json` (fetched 2026-10-05). Only `code`, `name` and `hex` were kept. Nothing was typed by hand.
- Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit: "Color data: craft-color-codes by MakeBead (https://makebead.com)". The site shows this credit in the About panel and on every downloaded image.
- Provenance (from the source's `SOURCES.md`): cross-checked against floss.maxxmint.com, adrianj/CrossStitchCreator and xstitchify.com.

DMC does not publish screen colours for its threads. Every hex value here is an approximation. Check against your physical thread card.

DMC is a trademark of its owner. This project is not affiliated with DMC. Thread codes are used as plain text only, to identify colours.
