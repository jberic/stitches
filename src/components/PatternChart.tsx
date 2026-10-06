import { useEffect, useMemo, useRef, useState } from 'react'
import { luminance } from '../data/colour'
import type { Pattern } from '../pattern/types'

/** Screen colours for a pattern: the fabric, then one per colour index. */
export interface ChartColours {
  fabric: string
  /** Index 1. */
  lettering: string
  /** Index 2. */
  heart: string
}

interface Props {
  pattern: Pattern
  colours: ChartColours
  label: string
  /** Show only this colour index at full strength (from the legend), or null for all. */
  highlight?: number | null
}

/** Smallest cell, in CSS pixels, at which colour symbols are still legible. */
const SYMBOL_MIN_CELL = 7

/**
 * One symbol per colour, so a black-and-white print still tells them apart.
 * Drawn in black or white, whichever contrasts with the stitch colour.
 */
function drawSymbol(ctx: CanvasRenderingContext2D, index: number, x: number, y: number, cell: number, fill: string) {
  ctx.strokeStyle = ctx.fillStyle = luminance(fill) > 0.25 ? 'rgb(0 0 0 / 0.55)' : 'rgb(255 255 255 / 0.8)'
  const c = cell / 2
  if (index === 1) {
    const r = cell * 0.22
    ctx.lineWidth = Math.max(1, cell * 0.11)
    ctx.beginPath()
    ctx.moveTo(x + c - r, y + c - r)
    ctx.lineTo(x + c + r, y + c + r)
    ctx.moveTo(x + c + r, y + c - r)
    ctx.lineTo(x + c - r, y + c + r)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.arc(x + c, y + c, cell * 0.2, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Unstitched fabric around the design, in stitches. */
const MARGIN = 2
const SEW_MS = 480

/**
 * When each stitch appears during the sew-in, from 0 to 1: a loose
 * left-to-right sweep with a little irregularity, like the wordmark.
 */
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

function cssVar(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim()
}

export function PatternChart({ pattern, colours, label, highlight = null }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [available, setAvailable] = useState(0)
  const sewnRef = useRef<Pattern | null>(null)
  const order = useMemo(() => sewingOrder(pattern), [pattern])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width))
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || available === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const cols = pattern.width + MARGIN * 2
    const rows = pattern.height + MARGIN * 2
    const gutter = available < 480 ? 0 : 22
    const cell = Math.max(4, Math.floor(((available - gutter) / cols) * 4) / 4)
    const gridW = cols * cell
    const gridH = rows * cell
    const cssW = gridW + gutter
    const cssH = gridH + gutter
    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`

    // Grid lines are a wash of black on light fabric, white on dark fabric.
    const darkFabric = luminance(colours.fabric) < 0.18
    const wash = darkFabric ? '255 255 255' : '0 0 0'
    const line = `rgb(${wash} / ${darkFabric ? 0.12 : 0.1})`
    const guide = `rgb(${wash} / ${darkFabric ? 0.42 : 0.38})`
    const inks = ['', colours.lettering, colours.heart]
    const symbols = cell >= SYMBOL_MIN_CELL
    const numbers = cssVar(canvas, '--chart-number')
    const mono = cssVar(canvas, '--font-mono')

    const paint = (progress: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)
      ctx.save()
      ctx.translate(gutter, gutter)
      ctx.fillStyle = colours.fabric
      ctx.fillRect(0, 0, gridW, gridH)

      for (let y = 0; y < pattern.height; y++) {
        for (let x = 0; x < pattern.width; x++) {
          const i = y * pattern.width + x
          const index = pattern.cells[i]
          if (!index || order[i] > progress) continue
          const px = (x + MARGIN) * cell
          const py = (y + MARGIN) * cell
          const dimmed = highlight !== null && index !== highlight
          ctx.globalAlpha = dimmed ? 0.16 : 1
          ctx.fillStyle = inks[index]
          ctx.fillRect(px, py, cell, cell)
          ctx.globalAlpha = 1
          if (symbols && !dimmed) drawSymbol(ctx, index, px, py, cell, inks[index])
        }
      }

      // Hairlines on device pixels so they stay crisp at any zoom.
      const hair = 1 / dpr
      const snap = (v: number) => Math.round(v * dpr) / dpr + hair / 2
      const drawLines = (every: number, colour: string, weight: number) => {
        ctx.strokeStyle = colour
        ctx.lineWidth = weight
        ctx.beginPath()
        for (let x = 0; x <= cols; x++) {
          if ((x - MARGIN) % every !== 0) continue
          ctx.moveTo(snap(x * cell), 0)
          ctx.lineTo(snap(x * cell), gridH)
        }
        for (let y = 0; y <= rows; y++) {
          if ((y - MARGIN) % every !== 0) continue
          ctx.moveTo(0, snap(y * cell))
          ctx.lineTo(gridW, snap(y * cell))
        }
        ctx.stroke()
      }
      if (cell >= 5) drawLines(1, line, hair)
      drawLines(10, guide, Math.max(hair, 1))
      ctx.restore()

      if (gutter > 0) {
        ctx.fillStyle = numbers
        ctx.font = `500 10px ${mono}`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        for (let x = 10; x <= pattern.width; x += 10) {
          ctx.fillText(String(x), gutter + (x + MARGIN) * cell, gutter / 2)
        }
        ctx.textAlign = 'right'
        for (let y = 10; y <= pattern.height; y += 10) {
          ctx.fillText(String(y), gutter - 5, gutter + (y + MARGIN) * cell)
        }
      }
    }

    // Sew in a new pattern; a resize of the same pattern just redraws.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const sew = sewnRef.current !== pattern && !reduced
    sewnRef.current = pattern
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
  }, [pattern, colours, available, order, highlight])

  return (
    <div ref={wrapRef} className="chart">
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  )
}
