import type { DisplayFont } from '../../fonts'
import { context2d, createCanvas, inkBounds, type InkBox } from '../canvas'

export interface StackedBlockOptions {
  /** Pattern width in stitches. */
  width: number
  /** Mask pixels per stitch. */
  scale: number
  font: DisplayFont
  /** Empty stitch rows between lines. */
  lineGap?: number
  /** Empty stitch columns between letters. */
  letterGap?: number
  /** Letter height as a multiple of letter width. Higher is taller and chunkier. */
  letterAspect?: number
  /** Shortest a line may be, in stitches. Below this, letters lose their shape. */
  minLineRows?: number
  /** Tallest a line may be, as a share of the width. Stops one short word from towering. */
  maxLineRatio?: number
}

export interface StackedBlockResult {
  canvas: HTMLCanvasElement
  rows: number
  lineRows: number[]
}

const MEASURE_SIZE = 200

interface Glyph {
  source: HTMLCanvasElement
  box: InkBox
}

interface Word {
  glyphs: Glyph[]
  /** Shared vertical ink extent, so every letter in the word keeps the same baseline. */
  top: number
  bottom: number
}

function drawGlyph(char: string, font: DisplayFont): Glyph | null {
  const size = MEASURE_SIZE
  const source = createCanvas(size * 2, size * 2.4)
  const ctx = context2d(source)
  ctx.font = `${size}px "${font}"`
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#000'
  ctx.fillText(char, size * 0.5, size * 1.6)
  const box = inkBounds(source)
  return box ? { source, box } : null
}

function measureWord(word: string, font: DisplayFont): Word | null {
  const glyphs = [...word].map((char) => drawGlyph(char, font)).filter((g): g is Glyph => g !== null)
  if (glyphs.length === 0) return null
  const top = Math.min(...glyphs.map((g) => g.box.y))
  const bottom = Math.max(...glyphs.map((g) => g.box.y + g.box.height))
  return { glyphs, top, bottom }
}

/** Splits `total` whole columns in proportion to `weights` (largest remainder), each at least 1. */
export function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  const exact = weights.map((w) => (w / sum) * total)
  const cols = exact.map((e) => Math.max(1, Math.floor(e)))
  let left = total - cols.reduce((a, b) => a + b, 0)
  const order = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r || a.i - b.i)
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) cols[order[k].i]++
  // Flooring to at least 1 can overshoot; take columns back from the widest letters.
  while (left < 0) {
    const widest = cols.indexOf(Math.max(...cols))
    if (cols[widest] <= 1) break
    cols[widest]--
    left++
  }
  return cols
}

/**
 * Stacked block: one word per line, stretched to the full width. Letters are
 * placed on the stitch grid itself: each gets whole columns in proportion to
 * its width, with clear columns between, so letters never run together.
 */
export function renderStackedBlock(lines: string[], options: StackedBlockOptions): StackedBlockResult {
  const {
    width,
    scale,
    font,
    lineGap = 1,
    letterGap = 1,
    letterAspect = 1.5,
    minLineRows = 11,
    maxLineRatio = 0.4,
  } = options
  const words = lines.map((line) => measureWord(line, font)).filter((w): w is Word => w !== null)
  const maxRows = Math.max(minLineRows, Math.round(width * maxLineRatio))
  // Lines are sized by cap height, so accents add rows above instead of
  // shrinking the letters of words that contain them.
  const cap = drawGlyph('H', font)?.box ?? { y: 0, height: MEASURE_SIZE * 0.7 }

  const layouts = words.map((word) => {
    const gaps = letterGap * (word.glyphs.length - 1)
    const cols = apportion(
      width - gaps,
      word.glyphs.map((g) => g.box.width),
    )
    const perLetter = (width - gaps) / word.glyphs.length
    const capRows = Math.round(Math.min(maxRows, Math.max(minLineRows, perLetter * letterAspect)))
    const ky = (capRows * scale) / cap.height
    // Round letters overshoot the cap line and baseline slightly; only accents and
    // descenders that need a real row get one.
    const above = Math.max(0, Math.round(((cap.y - word.top) * ky) / scale))
    const below = Math.max(0, Math.round(((word.bottom - (cap.y + cap.height)) * ky) / scale))
    return { word, cols, ky, top: cap.y - (above * scale) / ky, rows: above + capRows + below }
  })

  const rows = layouts.reduce((sum, l) => sum + l.rows, 0) + lineGap * Math.max(0, layouts.length - 1)
  const canvas = createCanvas(width * scale, rows * scale)
  const ctx = context2d(canvas)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  let y = 0
  for (const { word, cols, ky, top, rows: lineRows } of layouts) {
    const lineH = lineRows * scale
    let x = 0
    word.glyphs.forEach((glyph, i) => {
      const { box } = glyph
      const w = cols[i] * scale
      const dy = y + (box.y - top) * ky
      ctx.drawImage(glyph.source, box.x, box.y, box.width, box.height, x, dy, w, box.height * ky)
      x += w + letterGap * scale
    })
    y += lineH + lineGap * scale
  }

  return { canvas, rows, lineRows: layouts.map((l) => l.rows) }
}
