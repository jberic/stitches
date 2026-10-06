import type { DisplayFont } from '../../fonts'
import { context2d, createCanvas } from '../canvas'
import { drawGlyph, measureWord, MEASURE_SIZE, type LetterBox, type Word } from './stackedBlock'

export interface WavyOptions {
  /** Pattern width in stitches. */
  width: number
  /** Mask pixels per stitch. */
  scale: number
  font: DisplayFont
  /** Letter height as a multiple of letter width, as in stacked block. */
  letterAspect: number
  /** Clear columns between letters before the warp. */
  letterGap: number
  /** Empty rows between lines before the warp. */
  lineGap: number
  /** How far the warp can move a stitch, in stitches, so rows can be left for it. */
  reach: { x: number; y: number }
  /** Share of the width the widest line may fill. */
  fill?: number
  minCapRows?: number
  maxCapRows?: number
}

export interface WavyResult {
  canvas: HTMLCanvasElement
  rows: number
  /** Letter boxes grown by the warp's reach, so per-letter checks still cover the bent letter. */
  letters: LetterBox[]
}

/**
 * Wavy: one word per line at one type size, centred, with room left around
 * the text for the warp (applied afterwards to the mask). Unlike stacked
 * block, short words stay short instead of stretching to the full width.
 */
export function renderWavy(lines: string[], options: WavyOptions): WavyResult {
  const { width, scale, font, letterAspect, letterGap, lineGap, reach, fill = 0.92, minCapRows = 11 } = options
  const maxCapRows = options.maxCapRows ?? Math.round(width * 0.32)
  const words = lines.map((line) => measureWord(line, font)).filter((w): w is Word => w !== null)
  const cap = drawGlyph('H', font)?.box ?? { y: 0, height: MEASURE_SIZE * 0.7 }

  // One horizontal scale for every line, set by the widest line.
  const gapPx = letterGap * scale
  const inkWidth = (w: Word) => w.glyphs.reduce((sum, g) => sum + g.box.width, 0)
  const available = width * scale * fill
  const kx = Math.min(...words.map((w) => (available - gapPx * (w.glyphs.length - 1)) / inkWidth(w)))

  // One cap height for every line, from the widest line's average letter width.
  const widest = words.reduce((a, b) => (inkWidth(a) * kx > inkWidth(b) * kx ? a : b))
  const letters = widest.glyphs.filter((g) => g.source).length
  const perLetter = (inkWidth(widest) * kx) / scale / Math.max(1, letters)
  const capRows = Math.round(Math.min(maxCapRows, Math.max(minCapRows, perLetter * letterAspect)))
  const ky = (capRows * scale) / cap.height

  const lineLayouts = words.map((word) => {
    const above = Math.max(0, Math.round(((cap.y - word.top) * ky) / scale))
    const below = Math.max(0, Math.round(((word.bottom - (cap.y + cap.height)) * ky) / scale))
    const lineWidth = inkWidth(word) * kx + gapPx * (word.glyphs.length - 1)
    return { word, top: cap.y - (above * scale) / ky, rows: above + capRows + below, lineWidth }
  })

  const padRows = Math.ceil(reach.y) + 1
  const textRows = lineLayouts.reduce((sum, l) => sum + l.rows, 0) + lineGap * Math.max(0, lineLayouts.length - 1)
  const rows = textRows + padRows * 2
  const canvas = createCanvas(width * scale, rows * scale)
  const ctx = context2d(canvas)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  const boxes: LetterBox[] = []
  const growX = Math.ceil(reach.x)
  const growY = Math.ceil(reach.y)
  let y = padRows * scale
  for (const { word, top, rows: lineRows, lineWidth } of lineLayouts) {
    let x = (width * scale - lineWidth) / 2
    for (const glyph of word.glyphs) {
      const w = glyph.box.width * kx
      if (glyph.source) {
        const { box } = glyph
        ctx.drawImage(glyph.source, box.x, box.y, box.width, box.height, x, y + (box.y - top) * ky, w, box.height * ky)
        const left = Math.max(0, Math.floor(x / scale) - growX)
        const right = Math.min(width, Math.ceil((x + w) / scale) + growX)
        const boxTop = Math.max(0, y / scale - growY)
        boxes.push({ x: left, y: boxTop, width: right - left, height: Math.min(rows - boxTop, lineRows + growY * 2) })
      }
      x += w + gapPx
    }
    y += (lineRows + lineGap) * scale
  }

  return { canvas, rows, letters: boxes }
}
