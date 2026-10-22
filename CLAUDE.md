# Say It With Stitches

The site is called "Say It With Stitches". Use that name in the page title, header, README and metadata. Do not use any thread brand name in the product name.

Web tool: type a phrase straight onto the page and it is stitched live as a two-colour cross-stitch pattern; the lettering style, colours, case, width and fabric are picked in a floating toolbar. See `embroidery-build-brief.md` (kept locally, not in the repo) for scope and build order.

## Rules

- Everything runs in the browser. No backend.
- v1 has one export: Download saves a PNG of the chart and thread key (`src/export/patternImage.ts`). No PDF yet and no image upload. Keep the pattern data model (a grid of colour indexes plus metadata) separate from rendering so a PDF can be added later.
- Stack: Vite, React, TypeScript, plain canvas or SVG. Keep dependencies few; ask before adding one.
- Generation is deterministic: the same text and seed always give the same pattern. Use a seeded random generator, never `Math.random()` in the generator.
- Put the text, seed and style in the URL so a result can be shared.
- Every result goes through the legibility check. If it fails, retry inside the chosen style (a font's threshold, an alphabet's spacing; max 5 attempts), never by switching style. If it still fails, keep the style and say so, with a width that works if there is one.
- Fonts must be open-licence and self-hosted. Wait for fonts to load before drawing.
- Icons are drawn for this project as small bitmaps. Do not copy patterns, icons or artwork from reference images or other sites.
- Colours: no suggested pairs. Everyone starts in Navy and mustard (939 and 729) and builds their own with the colour wheel (`src/components/ThreadPicker.tsx`), which snaps to the closest thread by CIEDE2000. The second thread is only offered for styles that stitch part of the pattern in it. Warn, don't block, when a pair is hard to read. Thread data lives in `src/data/threads.json` as `{ code, name, hex }`. Never hand-type it. Record the source and licence in the README.
- No brand logos. Thread codes appear as plain text only.

## Design

- Header (from Figma, "Warm craft editorial"): the deep red stitch mark on the left, About on the right, and a running-stitch rule underneath. Assets in `src/assets/`. The maker credit and the colour data credit (required by its CC BY 4.0 licence) live in the About panel and on the downloaded image.
- Wordmark: "Say it with stitches", as written, in the Serif stitch alphabet, drawn by the tool's own engine, in deep red, in the page-load intro only.
- Page load: the wordmark sews itself in large in the middle of the screen, a short line appears word by word, then both drift away while the tool fades in (pattern from ol.studio; do not copy its fonts, imagery or layout). First keystroke or click skips ahead. Plays once per session. Respect `prefers-reduced-motion`.
- The page (`src/components/Tool.tsx`): one screen, no footer. The whole background is the fabric, a cream Aida grid (`Stage.tsx`), with the words stitched large in the middle; click anywhere and type, and the first keystroke replaces the example. A first visit opens on today's day of the week ("Thursday") in Delft; a returning visitor carries on where they left off. Width starts on Auto: the letters at their natural size (a stitch alphabet as drawn, a font 20 rows tall) and the pattern as wide as the words, shown at one set letter height on screen so typing never makes the letters jump; dragging Width makes them bigger. A floating toolbar at the bottom (`Toolbar.tsx`) holds Typography (every style, previewed with your own words), Colours, Fabric, Width, Letters and Download. The thread key (codes, names, stitch counts, total, finished size) sits in a corner card on screens 1440px and wider, and in a Threads toolbar item on smaller ones.
- Colours: text #392D28 on the fabric #FBF3EC (12.1:1), muted #6B5D55 (5.8:1); deep red #5F051C (12.5:1) for the Download button, focus, the stitch mark, the running-stitch rule and the wordmark. Tokens in `src/index.css`. Check contrast for any new colour.

- Fraunces for headings, IBM Plex Sans for UI, IBM Plex Mono for codes and counts.
- Every colour has a distinct symbol that works in black and white.
- Keyboard accessible, visible focus, labelled controls, respect `prefers-reduced-motion`.
- Must work at phone width.

## Working style

- Small commits with clear messages.
- Run `npm run format` before committing. Hand-drawn bitmaps (alphabets, icons) are excluded in `.prettierignore` so each glyph stays on one line.
- Before a big step, show a short plan and wait for my go-ahead.
- Write plain, direct UI copy. No jargon.
- Tell me when something is a guess (for example, screen colours vs real thread colours).
