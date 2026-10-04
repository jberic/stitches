# Say It In Stitches

The site is called "Say It In Stitches". Use that name in the page title, header, README and metadata. Do not use any thread brand name in the product name.

Web tool: type a phrase, get a two-colour cross-stitch pattern in a retro lettering style; "Generate again" gives the same words in a new style. See `embroidery-build-brief.md` (kept locally, not in the repo) for scope and build order.

## Rules

- Everything runs in the browser. No backend.
- v1 has no PDF or file export and no image upload. Keep the pattern data model (a grid of colour indexes plus metadata) separate from rendering so export can be added later.
- Stack: Vite, React, TypeScript, plain canvas or SVG. Keep dependencies few; ask before adding one.
- Generation is deterministic: the same text and seed always give the same pattern. Use a seeded random generator, never `Math.random()` in the generator.
- Put the text and seed in the URL so a result can be shared.
- Every result goes through the legibility check. If it fails, derive a new recipe from the same seed and retry (max 5 attempts).
- Fonts must be open-licence, self-hosted, and include å, ä and ö. Wait for fonts to load before drawing.
- Icons are drawn for this project as small bitmaps. Do not copy patterns, icons or artwork from reference images or other sites.
- Colours come from a curated list of pairs. Thread data lives in `src/data/threads.json` as `{ code, name, hex }`. Never hand-type it. Record the source and licence in the README.
- No brand logos. Thread codes appear as plain text only.

## Design

- Page load: the "Say It In Stitches" wordmark fills the full screen width first, then shrinks into a small header as the tool appears (first keystroke or about 2 seconds). Respect `prefers-reduced-motion`. See the "Page load" section of the brief.

- Fraunces for headings, IBM Plex Sans for UI, IBM Plex Mono for codes and counts.
- Every colour has a distinct symbol that works in black and white.
- Keyboard accessible, visible focus, labelled controls, respect `prefers-reduced-motion`.
- Must work at phone width.

## Working style

- Small commits with clear messages.
- Before a big step, show a short plan and wait for my go-ahead.
- Write plain, direct UI copy. No jargon.
- Tell me when something is a guess (for example, screen colours vs real thread colours).
