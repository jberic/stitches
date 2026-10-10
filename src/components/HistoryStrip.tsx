import { useEffect, useRef } from 'react'
import { pairPalette, patternColours } from '../data/palettes'
import { decodeCells, entryKey, type HistoryEntry } from '../state/history'
import './HistoryStrip.css'

interface Props {
  entries: HistoryEntry[]
  currentKey: string | null
  onSelect: (entry: HistoryEntry) => void
}

const THUMB_PX = 76

function Thumbnail({ entry }: { entry: HistoryEntry }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const { width, height, cells } = entry.grid
    const { fabric, lettering, accent } = patternColours(pairPalette(entry.state.lettering, entry.state.accent))
    const cell = THUMB_PX / (width + 4)
    const dpr = window.devicePixelRatio || 1
    const w = THUMB_PX
    const h = Math.round((height + 4) * cell)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = fabric
    ctx.fillRect(0, 0, w, h)
    const inks = ['', lettering.hex, accent.hex]
    const grid = decodeCells(cells)
    for (let i = 0; i < grid.length; i++) {
      if (!grid[i]) continue
      ctx.fillStyle = inks[grid[i]] ?? lettering.hex
      ctx.fillRect(((i % width) + 2) * cell, (Math.floor(i / width) + 2) * cell, cell + 0.2, cell + 0.2)
    }
  }, [entry])
  return <canvas ref={ref} aria-hidden="true" />
}

/** The last results as thumbnails; picking one brings it back exactly. */
export function HistoryStrip({ entries, currentKey, onSelect }: Props) {
  if (entries.length < 2) return null
  return (
    <section className="history" aria-label="Recent patterns">
      <h2 className="eyebrow">Recent</h2>
      <ul className="history-list">
        {entries.map((entry) => {
          const key = entryKey(entry)
          const current = key === currentKey
          return (
            <li key={key}>
              <button
                type="button"
                className="history-item"
                aria-current={current || undefined}
                aria-label={current ? `${entry.label} (showing now)` : `Bring back ${entry.label}`}
                title={entry.label}
                onClick={() => onSelect(entry)}
              >
                <Thumbnail entry={entry} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
