# Say It With Stitches

Type a phrase straight onto the page and it is stitched live as a two-color cross-stitch pattern. Pick the lettering style, colors, case, width and fabric in the toolbar at the bottom, then download the chart.

Everything runs in the browser; there is no backend.

## What it does

- **Type on the fabric.** The whole page is a cream Aida grid. Click anywhere and type up to four words (30 letters); the pattern is stitched as you go, with a stitched cursor that follows the text. A first visit opens on today's day of the week; a returning visitor carries on where they left off.
- **37 lettering styles.** 34 stitch alphabets drawn on the grid, from Block and Sampler to Delft, Fraktur and Copperplate, and three open-license display fonts. Typography previews every style with your own words.
- **Your own colors.** A color wheel that snaps to the closest real thread. The second thread is only offered for styles that stitch part of the pattern in it.
- **Width on Auto.** Letters at their natural size and the pattern as wide as the words, shown at one letter height on screen so typing never makes them jump. Dragging Width makes the pattern bigger, up to 180 stitches.
- **Thread key.** Codes, names, stitch counts, total and finished size for the chosen fabric (11, 14, 16 or 18 count).
- **Download.** A PNG of the chart with symbols, 10-stitch guide lines, row and column numbers, and the thread key.
- **Links.** The words, style, threads, width, fabric and case are in the address, so a link always opens the same pattern.

## How a pattern is made

1. **Recipe.** The style and a seed fix the settings: for a font, its coverage threshold and spacing; for a stitch alphabet, its letter and line gaps. A seeded random generator means the same words and seed always give the same pattern.
2. **Letters.** A stitch alphabet sets its glyphs straight onto the grid. A font is drawn on an offscreen canvas at 8 times the grid size, then each cell becomes a stitch if enough of it is inked.
3. **Cleanup.** Stray single stitches go, single-stitch gaps close.
4. **Legibility check.** The result is compared with the high-resolution drawing: did ink disappear, did the hole in an O fill in, did two letters run together, did a letter turn into a block? If it fails, it is tried again in the same style (a different threshold or spacing), up to 5 times. If it still fails, the tool keeps the style and says so, with a width that works if there is one.
5. **Chart.** The grid is drawn on canvas with a distinct symbol per color, so it also works in black and white.

A stitch alphabet stitches a character it hasn't got as its plain version (É as E, ’ as '). Anything with no plain version, like an emoji, is named in a message.

The pattern data (a grid of color indexes plus metadata) is kept apart from the drawing, so a PDF export can be added later.

## Run it locally

```bash
npm install
npm run dev
```

| Command          | What it does                                  |
| ---------------- | --------------------------------------------- |
| `npm run dev`    | Dev server at http://localhost:5173           |
| `npm test`       | Unit tests (Vitest)                           |
| `npm run lint`   | Lint (oxlint)                                 |
| `npm run format` | Format (Prettier); run before committing      |
| `npm run build`  | Type-check and build a static site in `dist/` |

The build makes two pages: `index.html`, the tool, and `404.html`, which hosts serve for any address that doesn't exist.

Pages for checking the work, in the dev server only: `/dev.html` (the 30 test phrases through the generator), `/styles.html` (every style side by side), `/alphabets.html` (every glyph of every stitch alphabet), `/fonts.html` and `/icons.html`.

## Deploy

The site is hosted on GitHub Pages. Every push to `main` runs `.github/workflows/deploy.yml`: install, test, build, publish `dist/`. GitHub serves `404.html` for any address that doesn't exist.

It lives at https://sayitwithstitches.com. Visits are counted with [Plausible](https://plausible.io), which uses no cookies; its script is in the head of `index.html` and `404.html`. Two custom events are sent from `src/analytics.ts`: **Style** (`style`), when someone picks a lettering style, and **Download** (`style`, `fabric`, `width`, `threads`), when a chart is saved. The words someone types are never sent. Each needs a goal in Plausible to show on the dashboard.

The site expects to be served from the root of its domain (`/fonts/…`, `/favicon.svg`), so it needs a custom domain, set under Settings → Pages. At `jberic.github.io/stitches/` the fonts and links would break.

## Search engines and AI assistants

- `src/content/site.ts` holds what the site says about itself: the title, the description, the features and the questions and answers. The About panel shows the questions; the build (`seo()` in `vite.config.ts`) puts the same words into `index.html` as plain text and structured data (WebSite, WebApplication, FAQPage), and writes `llms.txt`. Change the words there, and everything follows.
- `public/` has `robots.txt` (search engines and AI assistants are all allowed), `sitemap.xml`, the share image `og-image.png` (drawn with the tool's own stitches), the app icons and `site.webmanifest`.
- Shared pattern links all point search engines at the home page (`<link rel="canonical">`), so they count as one page.

## Where things are

| Path                         | What's there                                                        |
| ---------------------------- | ------------------------------------------------------------------- |
| `src/components/Tool.tsx`    | The page: state, generation, messages, toolbar items                |
| `src/components/Stage.tsx`   | The fabric, the stitched words and the cursor                       |
| `src/components/Toolbar.tsx` | The floating toolbar, its panels, and the bottom sheet on phones    |
| `src/pattern/`               | Recipes, rendering, cleanup, legibility check, legend, sizes        |
| `src/data/alphabets/`        | The stitch alphabets, one file each, glyphs as rows of `#` and `.`  |
| `src/data/threads.json`      | Thread colors (see below)                                           |
| `src/export/patternImage.ts` | The downloaded PNG                                                  |
| `src/state/url.ts`           | Links, and the last pattern kept in this browser                    |
| `src/content/site.ts`        | Title, description, features and questions, for the page and search |
| `design/fonts/`              | Fonts the stitch alphabets were drawn from; not shipped             |

## Accessibility

- Everything works with the keyboard. Tab goes from the header to your words to the toolbar. Each toolbar panel takes focus when it opens, and Escape closes it and puts you back. In Typography, the arrow keys move around the styles and Enter picks one. On phones, the settings open as a sheet that keeps focus inside it.
- Every control is labelled; the pattern has a text description for screen readers.
- Text contrast is at least 5.8:1 on the fabric. Every thread color has its own symbol.
- With reduced motion on, the intro, the sewing animation and the panel transitions are switched off.
- It works from 320px wide, with finger-sized touch targets on phones.

## Fonts

All fonts are under the [SIL Open Font License 1.1](https://openfontlicense.org), self-hosted from `public/fonts/`, with each font's `OFL.txt` next to it. Fraunces and the pattern fonts come from the [Google Fonts repository](https://github.com/google/fonts); IBM Plex from [IBM](https://github.com/IBM/plex). Fraunces and the three pattern fonts are served as WOFF2, cut down to Latin characters by `scripts/webfonts.sh` from the TTF files in `design/fonts/web/` (1.5 MB of fonts became 200 KB; the letters are unchanged). IBM Plex reserves its name under the OFL, so it is served exactly as IBM publishes it: the official WOFF2 files from the `@ibm/plex-sans-variable` (0.2.0) and `@ibm/plex-mono` (2.5.0) packages, split by alphabet with IBM's own character ranges, so a browser downloads only the parts a page uses (67 KB for Plex Sans instead of 537 KB).

| Font           | Use                               | Copyright                                  |
| -------------- | --------------------------------- | ------------------------------------------ |
| Shrikhand      | Pattern lettering                 | © 2015 Jonny Pinhorn                       |
| Bagel Fat One  | Pattern lettering                 | © 2022 The Bagel Fat Project Authors       |
| Rubik Mono One | Pattern lettering (capitals only) | © 2015 The Rubik Project Authors           |
| Fraunces       | Headings                          | © 2018 The Fraunces Project Authors        |
| IBM Plex Sans  | Interface                         | © 2017 IBM Corp. Reserved Font Name "Plex" |
| IBM Plex Mono  | Codes and counts                  | © 2017 IBM Corp. Reserved Font Name "Plex" |

Twenty of the stitch alphabets were drawn stitch by stitch on the grid for this project, with no font behind them: Block, Serif, Slab, Sampler, Sprig, Daisy, Beaded, Checker, Gothic, Art Deco, Swash, Tuscan, Botanical, Typewriter, Stencil, Hollow, Balloon, Western, Assisi and Cursive. The rest were drawn from open-license fonts, as below.

The Flourish stitch alphabet (in the repo, not offered in the tool yet) is drawn from Cinzel Decorative Bold (© 2012 Natanael Gama, Reserved Font Name "Cinzel", OFL 1.1). The capitals were turned into stitches once and stored as grids in `src/data/alphabets/flourish.ts`, so the font itself isn't shipped; the file and its `OFL.txt` are kept in `design/fonts/cinzeldecorative/`. The hooks, swashes and knots on the letters are drawn for this project.

The Delft stitch alphabet is drawn from Cinzel Bold (© 2020 The Cinzel Project Authors, Reserved Font Name "Cinzel", OFL 1.1) in the same way; the font file and its `OFL.txt` are in `design/fonts/cinzel/`. Its rosettes and sampler frame follow style 2a of the Claude Design handoff "Stitch Alphabets".

Three more stitch alphabets come from that handoff the same way, each turned into stitches once at 20 rows, so their fonts aren't shipped: Inline from Bodoni Moda Black (style 2h), Holbein from Abril Fatface (© 2011 TypeTogether, Reserved Font Names "Abril" and "Abril Fatface"; style 2d) and Shadow Slab from Alfa Slab One (© 2016 The Alfa Slab One Project Authors, Reserved Font Name "Alfa Slab"; style 2f). The Abril Fatface and Alfa Slab One files and their `OFL.txt` are in `design/fonts/`.

Ten more come from the same handoff, made the same way at 20 rows:

| Stitch alphabet | Drawn from                                                                                                    | Handoff style                             |
| --------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Counted         | Playfair Display SC Black, © 2017 The Playfair Display Project Authors, Reserved Font Name "Playfair Display" | 2b Counted Chart                          |
| Blackwork       | Ultra, © 2010 Astigmatic, Apache 2.0                                                                          | 2c Blackwork                              |
| Forest          | Spectral SC ExtraBold, © 2017 The Spectral Project Authors                                                    | 2g Forest Sampler                         |
| Fraktur         | UnifrakturCook Bold, © 2010 j. 'mach' wust, Reserved Font Name "UnifrakturCook"                               | 2i Gold on Black Aida                     |
| Assisi Roman    | Cinzel Bold, © 2020 The Cinzel Project Authors, Reserved Font Name "Cinzel"                                   | 2j Assisi Work                            |
| Blackletter     | UnifrakturMaguntia, © 2010 j. 'mach' wust, Reserved Font Name "UnifrakturMaguntia"                            | 1b Blackletter                            |
| Copperplate     | Pinyon Script, © 2024 The Pinyon Project Authors                                                              | 1c Copperplate Script                     |
| Wood Type       | Rye, © 2011 Sorkin Type Co, Reserved Font Name "Rye"                                                          | 1d Wood Type                              |
| Didone          | Bodoni Moda Black, © 2020 The Bodoni Moda Project Authors                                                     | 1e Didone                                 |
| Variegated      | Grenze Gotisch ExtraBold, © 2020 The Grenze Gotisch Project Authors                                           | 2e Variegated Thread, as a two-tone split |

All are OFL 1.1 except Ultra (Apache 2.0). The font files and their licenses are in `design/fonts/`; none are shipped. Bodoni Moda's file is renamed from `BodoniModa[opsz,wght].ttf` but otherwise unchanged.

## Thread colors

Every pattern sits on one fabric, cream #FBF3EC, and uses up to two threads: one for the lettering, and a second one for styles that stitch part of the pattern in it (shadows, ornaments, a two-tone split).

- **Color wheel.** Pick either thread with a saturation and brightness square and a hue slider, or type a hex value or a thread code. Wherever you point, the pattern uses the closest thread in `threads.json`, measured with CIEDE2000 (how alike two colors look, not raw RGB), and the five closest are offered to choose between. Links store the two thread codes (`l` and `a`).
- **Starting pair.** Everyone starts in Navy and mustard (939 and 729); there are no suggested pairs in the interface. The six pairs in `src/data/palettes.ts` remain so older links (`p=07`) still open in their exact threads and a chosen pair keeps its name.
- **Warnings, not rules.** Any two threads can be used. The picker says so in plain words when the lettering is pale on the fabric (under 3:1), when the two threads are hard to tell apart (under 1.8:1), or when the second thread barely shows (under 1.25:1).
- The fabric's screen color is a design choice, not thread data. Screen colors are approximate for every thread, so "closest thread" means closest on screen. Check against a physical thread card.

## Thread color data

`src/data/threads.json` lists 489 DMC stranded cotton colors as `{ code, name, hex }`.

- Source: [craft-color-codes](https://github.com/makebead/craft-color-codes) by MakeBead, file `data/json/dmc-floss.json` (fetched 2026-10-05). Only `code`, `name` and `hex` were kept. Nothing was typed by hand.
- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit: "Color data: craft-color-codes by MakeBead (https://makebead.com)". The site shows this credit in the About panel and on every downloaded image.
- Provenance (from the source's `SOURCES.md`): cross-checked against floss.maxxmint.com, adrianj/CrossStitchCreator and xstitchify.com.

DMC does not publish screen colors for its threads. Every hex value here is an approximation. Check against your physical thread card.

DMC is a trademark of its owner. This project is not affiliated with DMC. Thread codes are used as plain text only, to identify colors.

## How I built this with Claude Code

<!-- Draft written from the project's history. Rewrite it in your own words before publishing. -->

I wrote a one-page brief and a `CLAUDE.md` with the rules: browser only, deterministic patterns, open-license fonts, no brand logos, plain copy, a short plan before every big step. Claude Code wrote the code; I set the direction, reviewed every step in the browser and decided what stayed. It took about two and a half weeks of evenings, from 4 to 22 October 2026, in about 120 small commits.

**What I asked for.** A tool that turns a phrase into a readable cross-stitch pattern in a retro lettering style, with a legibility check so it never hands you an unreadable result, real thread colors from a licensed data set, and a link that always opens the same pattern.

**Where I steered.**

- **From random styles to choosing one.** The brief had a Generate button that gave a new style on every press, and a history strip to get back to ones you liked. I wanted people to choose a look, not draw one at random. Generate and the history went; Typography now previews every style with your own words.
- **From a form to typing on the fabric.** I mocked up a new layout: the words stitched large on a full-screen Aida grid, and every setting in one floating toolbar. Claude rebuilt the page around it.
- **From curated color pairs to a color wheel.** The brief asked for 10 to 15 good pairs. I wanted everyone to build their own instead, so the wheel snaps to the closest real thread (CIEDE2000), with plain warnings instead of rules.
- **Fonts versus stitch alphabets.** Fonts shrunk onto a grid lose their character, so most styles became alphabets drawn stitch by stitch. Fifteen were made from a Claude Design exploration, each turned into stitches once from an open-license font.
- **Dropped what didn't read.** The wavy layout, two fonts (Chango, and a first set of handoff fonts used live), motif rows and one color pair were built, looked at and removed.
- **Details.** Letters jumped in size while typing, so the on-screen letter height is now fixed and Width starts on Auto. The toolbar's corners follow outer radius = inner radius + padding. The cursor is as tall as the letters. A first visit opens on today's weekday.

**What I fixed by hand.** <!-- Fill in: anything you changed yourself, outside Claude Code. If nothing, say so; that is part of the story. -->

**What someone who stitches said.** <!-- Fill in: one quote from a stitcher who tried it. -->

**Live:** https://sayitwithstitches.com
