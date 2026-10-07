import { useEffect, useRef } from 'react'
import { REQUIRED_CHARACTERS, type AlphabetSize } from '../data/alphabets/alphabet'
import { ALPHABETS } from '../data/alphabets'
import { FABRIC, paletteById, patternColours } from '../data/palettes'
import { prepareStitches } from '../components/stitchArt'
import type { Pattern } from '../pattern/types'
import './dev.css'

/** Dev-only gallery: every glyph of each alphabet, as real stitches, plus a few set words. */

function setText(size: AlphabetSize, text: string, gap = 1) {
  const height = size.capRows + size.descRows
  const rows = Array.from({ length: height }, () => '')
  ;[...text].forEach((char, i) => {
    const glyph = char === ' ' ? { width: size.space, rows: rows.map(() => '.'.repeat(size.space)) } : size.glyphs.get(char)
    if (!glyph) return
    rows.forEach((_, y) => (rows[y] += (i ? '.'.repeat(gap) : '') + glyph.rows[y]))
  })
  return rows
}

function Stitched({ rows, cell, colour }: { rows: string[]; cell: number; colour: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const width = Math.max(1, ...rows.map((r) => r.length))
    const cells = new Uint8Array(rows.flatMap((r) => [...r.padEnd(width, '.')].map((c) => (c === '#' ? 1 : 0))))
    const grid = { width, height: rows.length, cells } as unknown as Pattern
    prepareStitches(ref.current, grid, cell, {
      under: colour,
      over: colour,
    }).drawUpTo(Infinity)
  }, [rows, cell, colour])
  return <canvas ref={ref} role="img" aria-label={rows.length ? 'stitched letters' : ''} />
}

const SAMPLES = ['HELLO SUNSHINE', 'hello sunshine', 'Stay cosy!', "What's up? 2026"]

export function AlphabetGallery() {
  const ink = patternColours(paletteById('07')).lettering.hex
  return (
    <main className="dev">
      <header>
        <h1>Alphabets</h1>
        <p>Dev only. Every glyph of each stitch alphabet, both sizes, on the {FABRIC.name.toLowerCase()} fabric.</p>
      </header>
      {Object.values(ALPHABETS).flatMap((alphabet) =>
        (['regular', 'small'] as const).map((sizeId) => {
          const size = alphabet.sizes[sizeId]
          const cell = sizeId === 'regular' ? 7 : 8
          return (
            <section key={alphabet.name + sizeId} id={`${alphabet.name}-${sizeId}`.toLowerCase()} className="icon-sheet">
              <h2>
                {alphabet.name} {sizeId}{' '}
                <span>
                  capitals {size.capRows} rows · {size.stroke}-stitch strokes
                </span>
              </h2>
              <div className="glyph-grid" style={{ background: FABRIC.hex }}>
                {REQUIRED_CHARACTERS.map((char) => (
                  <figure key={char} className="glyph-cell">
                    <Stitched rows={size.glyphs.get(char)!.rows} cell={cell} colour={ink} />
                    <figcaption>{char}</figcaption>
                  </figure>
                ))}
              </div>
              <div className="glyph-samples" style={{ background: FABRIC.hex }}>
                {SAMPLES.map((text) => (
                  <figure key={text} className="glyph-cell">
                    <Stitched rows={setText(size, text)} cell={cell} colour={ink} />
                    <figcaption>
                      {text} · {setText(size, text)[0].length} stitches wide
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )
        }),
      )}
    </main>
  )
}
