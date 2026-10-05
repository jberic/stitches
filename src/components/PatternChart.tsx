import { useEffect, useRef, useState } from 'react'
import type { Pattern } from '../pattern/types'

interface Props {
  pattern: Pattern
  ink: string
  label: string
}

/** Unstitched fabric around the design, in stitches. */
const MARGIN = 2

function cssVar(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim()
}

export function PatternChart({ pattern, ink, label }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [available, setAvailable] = useState(0)

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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    const fabric = cssVar(canvas, '--chart-fabric')
    const line = cssVar(canvas, '--chart-line')
    const guide = cssVar(canvas, '--chart-guide')
    const numbers = cssVar(canvas, '--chart-number')

    ctx.save()
    ctx.translate(gutter, gutter)
    ctx.fillStyle = fabric
    ctx.fillRect(0, 0, gridW, gridH)

    ctx.fillStyle = ink
    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        if (pattern.cells[y * pattern.width + x]) {
          ctx.fillRect((x + MARGIN) * cell, (y + MARGIN) * cell, cell, cell)
        }
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
      ctx.font = `500 10px ${cssVar(canvas, '--font-mono')}`
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
  }, [pattern, ink, available])

  return (
    <div ref={wrapRef} className="chart">
      <canvas ref={canvasRef} role="img" aria-label={label} />
    </div>
  )
}
