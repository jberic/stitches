import { useEffect, useRef } from 'react'
import { ICON_LABELS, ICON_SETS, iconCells, iconSizes, type IconName, type IconSize } from '../data/icons'
import { paletteById, patternColours } from '../data/palettes'
import { prepareStitches } from '../components/stitchArt'
import type { Pattern } from '../pattern/types'
import './dev.css'

/** Dev-only gallery for reviewing the icons as real stitches, in each palette's accent thread. */

const CELL = 7
const PALETTES_SHOWN = ['01', '04', '08', '11']

function StitchedIcon({ name, size, paletteId }: { name: IconName; size: IconSize; paletteId: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const { accent } = patternColours(paletteById(paletteId))
    // Stitch drawing only reads the grid, so a bare grid stands in for a pattern.
    const grid = iconCells(name, size) as unknown as Pattern
    prepareStitches(canvas, grid, CELL, { under: accent.hex, over: accent.hex }).drawUpTo(Infinity)
  }, [name, size, paletteId])
  return <canvas ref={ref} role="img" aria-label={`${ICON_LABELS[name]}, ${size} stitches`} />
}

export function IconGallery() {
  return (
    <main className="dev">
      <header>
        <h1>Icons</h1>
        <p>
          Dev only. The nature and food sets at every size they come in (7, 11, 15 stitches), stitched in the accent thread of
          four palettes.
        </p>
      </header>
      {PALETTES_SHOWN.map((id) => {
        const palette = paletteById(id)
        const { fabric, accent } = patternColours(palette)
        return (
          <section key={id} className="icon-sheet">
            <h2>
              {palette.name}{' '}
              <span>
                accent thread {accent.code} {accent.name}
              </span>
            </h2>
            {(Object.keys(ICON_SETS) as (keyof typeof ICON_SETS)[]).map((set) => (
              <div key={set}>
                <h3 className="icon-set-name">{set}</h3>
                <div className="icon-grid" style={{ background: fabric }}>
                  {(ICON_SETS[set] as readonly IconName[]).map((name) => (
                    <figure key={name} className="icon-cell">
                      <div className="icon-sizes">
                        {iconSizes(name).map((size) => (
                          <StitchedIcon key={size} name={name} size={size} paletteId={id} />
                        ))}
                      </div>
                      <figcaption style={{ color: patternColours(palette).lettering.hex }}>{ICON_LABELS[name]}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )
      })}
    </main>
  )
}
