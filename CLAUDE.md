# Say It With Stitches

The site is called "Say It With Stitches". Use that name in the page title, header, README and metadata. Do not use any thread brand name in the product name.

Web tool: type a phrase, get a two-colour cross-stitch pattern in a retro lettering style; "Generate again" gives the same words in a new style. See `embroidery-build-brief.md` (kept locally, not in the repo) for scope and build order.

## Rules

- Everything runs in the browser. No backend.
- v1 has one export: Download saves a PNG of the chart and thread key (`src/export/patternImage.ts`). No PDF yet and no image upload. Keep the pattern data model (a grid of colour indexes plus metadata) separate from rendering so a PDF can be added later.
- Stack: Vite, React, TypeScript, plain canvas or SVG. Keep dependencies few; ask before adding one.
- Generation is deterministic: the same text and seed always give the same pattern. Use a seeded random generator, never `Math.random()` in the generator.
- Put the text and seed in the URL so a result can be shared.
- Every result goes through the legibility check. If it fails, derive a new recipe from the same seed and retry (max 5 attempts).
- Fonts must be open-licence and self-hosted. Wait for fonts to load before drawing.
- Icons are drawn for this project as small bitmaps. Do not copy patterns, icons or artwork from reference images or other sites.
- Colours come from a curated list of pairs. Thread data lives in `src/data/threads.json` as `{ code, name, hex }`. Never hand-type it. Record the source and licence in the README.
- No brand logos. Thread codes appear as plain text only.

## Design

- Header (from Figma, "Warm craft editorial"): the rust stitch mark on the left, About on the right, and a running-stitch rule underneath. Assets in `src/assets/`. The maker credit and the colour data credit (required by its CC BY 4.0 licence) live in the About panel and on the downloaded image.
- Wordmark: "SAY IT WITH STITCHES" in capitals, drawn as a stitch pattern by the tool's own engine. Rust in the page-load intro; cream across a full-width #801C2A footer, with the tagline "Type a phrase, get a cross-stitch pattern." in #FFCFC5.
- Page load: the wordmark sews itself in large in the middle of the screen, a short line appears word by word, then both drift away while the tool rises in (pattern from ol.studio; do not copy its fonts, imagery or layout). First keystroke or click skips ahead. Plays once per session. Respect `prefers-reduced-motion`.
- Colours: text #392D28 on background #F3EEE4 (11.5:1); rust #93452E (5.8:1) for the primary button, focus and the wordmark. Tokens in `src/index.css`. The pattern sheet stays light, with a hairline border. Check contrast for any new colour.

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
