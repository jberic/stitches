import { luminance } from '../data/colour'
import type { Pattern } from '../pattern/types'

/** Screen colours for a pattern: the fabric, then one per colour index. */
export interface ChartColours {
  fabric: string
  /** Index 1. */
  lettering: string
  /** Index 2: icon and shadow. */
  accent: string
}

/** Unstitched fabric around the design, in stitches. */
export const CHART_MARGIN = 2

/** Smallest cell, in CSS pixels, at which colour symbols are still legible. */
const SYMBOL_MIN_CELL = 7

/**
 * One symbol per colour, so a black-and-white print still tells them apart.
 * Drawn in black or white, whichever contrasts with the stitch colour.
 */
export function drawSymbol(ctx: CanvasRenderingContext2D, index: number, x: number, y: number, cell: number, fill: string) {
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

export interface ChartLayout {
  cell: number
  /** Room for the stitch numbers above and to the left, or 0 for none. */
  gutter: number
}

/** Outer size of a chart in CSS pixels, gutter included. */
export function chartSize(pattern: Pattern, { cell, gutter }: ChartLayout) {
  const gridW = (pattern.width + CHART_MARGIN * 2) * cell
  const gridH = (pattern.height + CHART_MARGIN * 2) * cell
  return { gridW, gridH, width: gridW + gutter, height: gridH + gutter }
}

export interface ChartPaint extends ChartLayout {
  colours: ChartColours
  /** Device pixels per CSS pixel, so hairlines land on whole pixels. */
  dpr: number
  numberColour: string
  monoFont: string
  /** Show only this colour index at full strength, or null for all. */
  highlight?: number | null
  /** Sew-in: each stitch's turn from 0 to 1, and how far along the sewing is. */
  order?: Float32Array
  progress?: number
}

/**
 * Paints the chart with its top-left corner at the current origin, which
 * must sit on a whole device pixel. Shared by the screen and the download.
 */
export function paintChart(ctx: CanvasRenderingContext2D, pattern: Pattern, paint: ChartPaint) {
  const { cell, gutter, colours, dpr, highlight = null, order, progress = 1 } = paint
  const cols = pattern.width + CHART_MARGIN * 2
  const rows = pattern.height + CHART_MARGIN * 2
  const { gridW, gridH } = chartSize(pattern, paint)

  // Grid lines are a wash of black on light fabric, white on dark fabric.
  const darkFabric = luminance(colours.fabric) < 0.18
  const wash = darkFabric ? '255 255 255' : '0 0 0'
  const line = `rgb(${wash} / ${darkFabric ? 0.12 : 0.1})`
  const guide = `rgb(${wash} / ${darkFabric ? 0.42 : 0.38})`
  const inks = ['', colours.lettering, colours.accent]
  const symbols = cell >= SYMBOL_MIN_CELL

  ctx.save()
  ctx.translate(gutter, gutter)
  ctx.fillStyle = colours.fabric
  ctx.fillRect(0, 0, gridW, gridH)

  for (let y = 0; y < pattern.height; y++) {
    for (let x = 0; x < pattern.width; x++) {
      const i = y * pattern.width + x
      const index = pattern.cells[i]
      if (!index || (order && order[i] > progress)) continue
      const px = (x + CHART_MARGIN) * cell
      const py = (y + CHART_MARGIN) * cell
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
      if ((x - CHART_MARGIN) % every !== 0) continue
      ctx.moveTo(snap(x * cell), 0)
      ctx.lineTo(snap(x * cell), gridH)
    }
    for (let y = 0; y <= rows; y++) {
      if ((y - CHART_MARGIN) % every !== 0) continue
      ctx.moveTo(0, snap(y * cell))
      ctx.lineTo(gridW, snap(y * cell))
    }
    ctx.stroke()
  }
  if (cell >= 5) drawLines(1, line, hair)
  drawLines(10, guide, Math.max(hair, 1))
  ctx.restore()

  if (gutter > 0) {
    ctx.fillStyle = paint.numberColour
    ctx.font = `500 ${Math.round(Math.max(10, gutter * 0.45))}px ${paint.monoFont}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let x = 10; x <= pattern.width; x += 10) {
      ctx.fillText(String(x), gutter + (x + CHART_MARGIN) * cell, gutter / 2)
    }
    ctx.textAlign = 'right'
    for (let y = 10; y <= pattern.height; y += 10) {
      ctx.fillText(String(y), gutter - gutter * 0.23, gutter + (y + CHART_MARGIN) * cell)
    }
  }
}
