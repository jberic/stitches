import { useEffect, useMemo, useRef, useState } from 'react'
import type { Pattern } from '../pattern/types'
import { CHART_MARGIN, chartSize, paintChart, type ChartColours } from './chartPaint'

export type { ChartColours } from './chartPaint'

interface Props {
  pattern: Pattern
  colours: ChartColours
  label: string
  /** Show only this colour index at full strength (from the legend), or null for all. */
  highlight?: number | null
}

const SEW_MS = 480
const CHART_COLS_EXTRA = CHART_MARGIN * 2

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

    const gutter = available < 480 ? 0 : 22
    const cols = pattern.width + CHART_COLS_EXTRA
    const cell = Math.max(4, Math.floor(((available - gutter) / cols) * 4) / 4)
    const { width: cssW, height: cssH } = chartSize(pattern, { cell, gutter })
    const dpr = window.devicePixelRatio || 1

    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`

    const look = {
      cell,
      gutter,
      colours,
      dpr,
      highlight,
      order,
      numberColour: cssVar(canvas, '--chart-number'),
      monoFont: cssVar(canvas, '--font-mono'),
    }
    const paint = (progress: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)
      paintChart(ctx, pattern, { ...look, progress })
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
