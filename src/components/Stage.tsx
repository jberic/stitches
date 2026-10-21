import { useEffect, useMemo, useRef, useState } from 'react'
import type { LetterBox } from '../pattern/layouts/stackedBlock'
import type { Pattern } from '../pattern/types'
import { caretBox, indexAt } from './caret'
import { drawSymbol, type ChartColours } from './chartPaint'
import './Stage.css'

interface Props {
  pattern: Pattern | null
  colours: ChartColours
  label: string
  /** Show only this colour index at full strength (from the thread key), or null for all. */
  highlight: number | null
  /** Sew the pattern in when this changes (a new style), not on every keystroke. */
  sewKey: string
  /** Kept clear of the stage: the header above, the toolbar below. Selectors, measured live. */
  above: string
  below: string
  /** Under the words: the typing hint, or a note about the pattern. */
  children?: React.ReactNode
  /** The text field: the stage is what you type on. */
  input: React.ReactNode
  focused: boolean
  /** The text as typed, where each pattern letter sits, and where the text cursor is. */
  text: string
  letters: LetterBox[]
  caretIndex: number
  /** A click or tap on the words: the text index it lands nearest. */
  onPick: (index: number) => void
}

const SEW_MS = 520
/** Largest and smallest stitch on screen, in CSS pixels. */
const MAX_CELL = 26
const MIN_CELL = 3

function sewingOrder(pattern: Pattern): Float32Array {
  const rank = new Float32Array(pattern.cells.length)
  let max = 0
  for (let i = 0; i < rank.length; i++) {
    const x = i % pattern.width
    const y = Math.floor(i / pattern.width)
    rank[i] = x + y * 0.5 + ((x * 31 + y * 17) % 7) * 0.45
    if (rank[i] > max) max = rank[i]
  }
  for (let i = 0; i < rank.length; i++) rank[i] /= max || 1
  return rank
}

interface Layout {
  cell: number
  /** The pattern's top-left corner in CSS pixels; the fabric grid lines up with it. */
  x: number
  y: number
}

/**
 * The page is the fabric: one canvas behind everything draws the cream Aida
 * grid edge to edge, and the words stitched on it, as large as the space
 * between the header and the toolbar allows.
 */
export function Stage({
  pattern,
  colours,
  label,
  highlight,
  sewKey,
  above,
  below,
  children,
  input,
  focused,
  text,
  letters,
  caretIndex,
  onPick,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [viewport, setViewport] = useState({ w: 0, h: 0, top: 0, bottom: 0 })
  const sewn = useRef<string | null>(null)
  const order = useMemo(() => pattern && sewingOrder(pattern), [pattern])

  useEffect(() => {
    const measure = () => {
      const top = document.querySelector(above)?.getBoundingClientRect().bottom ?? 0
      const bottom = document.querySelector(below)?.getBoundingClientRect().top ?? window.innerHeight
      setViewport({ w: window.innerWidth, h: window.innerHeight, top, bottom })
    }
    measure()
    const observer = new ResizeObserver(measure)
    for (const selector of [above, below]) {
      const el = document.querySelector(selector)
      if (el) observer.observe(el)
    }
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [above, below])

  const layout = useMemo<Layout | null>(() => {
    if (!pattern || viewport.w === 0) return null
    const side = viewport.w < 600 ? 0.92 : 0.8
    const areaTop = viewport.top + 24
    // Room under the words for the hint.
    const areaBottom = viewport.bottom - 72
    const fit = Math.min((viewport.w * side) / pattern.width, (areaBottom - areaTop) / pattern.height)
    const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(fit)))
    return {
      cell,
      x: Math.round((viewport.w - pattern.width * cell) / 2),
      y: Math.round(areaTop + (areaBottom - areaTop - pattern.height * cell) / 2),
    }
  }, [pattern, viewport])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || viewport.w === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(viewport.w * dpr)
    canvas.height = Math.round(viewport.h * dpr)
    canvas.style.width = `${viewport.w}px`
    canvas.style.height = `${viewport.h}px`

    const cell = layout?.cell ?? 14
    const ox = layout?.x ?? 0
    const oy = layout?.y ?? 0
    const inks = ['', colours.lettering, colours.accent]
    const hair = 1 / dpr
    const snap = (v: number) => Math.round(v * dpr) / dpr + hair / 2

    const paint = (progress: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = colours.fabric
      ctx.fillRect(0, 0, viewport.w, viewport.h)
      if (pattern) {
        for (let y = 0; y < pattern.height; y++) {
          for (let x = 0; x < pattern.width; x++) {
            const i = y * pattern.width + x
            const index = pattern.cells[i]
            if (!index || (order && order[i] > progress)) continue
            const px = ox + x * cell
            const py = oy + y * cell
            const dimmed = highlight !== null && index !== highlight
            ctx.globalAlpha = dimmed ? 0.16 : 1
            ctx.fillStyle = inks[index]
            ctx.fillRect(px, py, cell, cell)
            ctx.globalAlpha = 1
            if (cell >= 7 && !dimmed) drawSymbol(ctx, index, px, py, cell, inks[index])
          }
        }
      }
      // The Aida grid, edge to edge, in step with the stitches.
      if (cell >= 5) {
        ctx.strokeStyle = 'rgb(0 0 0 / 0.09)'
        ctx.lineWidth = hair
        ctx.beginPath()
        for (let x = ox % cell; x <= viewport.w; x += cell) {
          ctx.moveTo(snap(x), 0)
          ctx.lineTo(snap(x), viewport.h)
        }
        for (let y = oy % cell; y <= viewport.h; y += cell) {
          ctx.moveTo(0, snap(y))
          ctx.lineTo(viewport.w, snap(y))
        }
        ctx.stroke()
      }
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sew = pattern && sewn.current !== sewKey && !reduced
    if (pattern) sewn.current = sewKey
    if (!sew) {
      paint(1)
      return
    }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / SEW_MS)
      paint(1 - Math.pow(1 - t, 3))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [pattern, colours, layout, viewport, order, highlight, sewKey])

  // The stitched cursor: at the text cursor's letter, or alone in the middle when there are no words.
  const box = pattern && layout ? caretBox(text, letters, caretIndex) : null
  const middle = (viewport.top + viewport.bottom) / 2
  const caret =
    box && layout
      ? {
          // On the boundary between letters, centred on it.
          left: layout.x + box.x * layout.cell - Math.max(1, Math.round(layout.cell / 6)),
          top: layout.y + box.top * layout.cell,
          width: Math.max(2, Math.round(layout.cell / 3)),
          height: box.height * layout.cell,
        }
      : !pattern && viewport.w > 0
        ? { left: viewport.w / 2 - 2, top: middle - 40, width: 4, height: 80 }
        : null

  // Where a click lands among the letters, so you can add or delete right there.
  const pick = (e: React.PointerEvent) => {
    if (!pattern || !layout || e.button !== 0) return
    const x = (e.clientX - layout.x) / layout.cell
    const y = (e.clientY - layout.y) / layout.cell
    onPick(indexAt(text, letters, x, y))
  }

  return (
    <div className="stage" onPointerUp={pick}>
      <canvas ref={canvasRef} className="stage-fabric" role="img" aria-label={label} />
      {input}
      {caret && focused && <span className="stage-caret" aria-hidden="true" style={caret} />}
      <div
        className="stage-note"
        style={
          layout && pattern
            ? { top: layout.y + pattern.height * layout.cell + Math.max(16, layout.cell * 1.5) }
            : { top: middle + 64 }
        }
      >
        {children}
      </div>
    </div>
  )
}
