import { useEffect, useRef } from 'react'
import { ICONS, ICON_SIZES, iconCells, type IconName, type IconSize } from '../data/icons'
import { paletteById, patternColours } from '../data/palettes'
import { prepareStitches } from '../components/stitchArt'
import type { Pattern } from '../pattern/types'
import './dev.css'

/** Dev-only gallery for reviewing the icons as real stitches, in each palette's heart thread. */

const CELL = 7
const PALETTES_SHOWN = ['01', '04', '08', '11']

function StitchedIcon({ name, size, paletteId }: { name: IconName; size: IconSize; paletteId: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const { heart } = patternColours(paletteById(paletteId))
    // Stitch drawing only reads the grid, so a bare grid stands in for a pattern.
    const grid = iconCells(name, size) as unknown as Pattern
    prepareStitches(canvas, grid, CELL, { under: heart.hex, over: heart.hex }).drawUpTo(Infinity)
  }, [name, size, paletteId])
  return <canvas ref={ref} role="img" aria-label={`${name}, ${size} stitches`} />
}

export function IconGallery() {
  return (
    <main className="dev">
      <header>
        <h1>Icons</h1>
        <p>Dev only. Each icon at 7, 11 and 15 stitches wide, stitched in the heart thread of four palettes.</p>
      </header>
      {PALETTES_SHOWN.map((id) => {
        const palette = paletteById(id)
        const { fabric, heart } = patternColours(palette)
        return (
          <section key={id} className="icon-sheet">
            <h2>
              {palette.name} <span>heart thread {heart.code} {heart.name}</span>
            </h2>
            <div className="icon-grid" style={{ background: fabric }}>
              {(Object.keys(ICONS) as IconName[]).map((name) => (
                <figure key={name} className="icon-cell">
                  <div className="icon-sizes">
                    {ICON_SIZES.map((size) => (
                      <StitchedIcon key={size} name={name} size={size} paletteId={id} />
                    ))}
                  </div>
                  <figcaption style={{ color: patternColours(palette).lettering.hex }}>{name}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )
      })}
    </main>
  )
}
