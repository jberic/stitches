import type { AlphabetSize, AlphabetSizeId, StitchAlphabet } from '../../data/alphabets/alphabet'
import type { Mask } from '../downsample'
import type { LetterBox } from './stackedBlock'

export interface AlphabetLayoutOptions {
  width: number
  /** Mask pixels per stitch. */
  scale: number
  alphabet: StitchAlphabet
  /** Clear columns between letters, before any whole-number scaling. */
  letterGap: number
  /** Empty rows between lines, before scaling. */
  lineGap: number
  /** Largest whole-number enlargement allowed when short words leave room. */
  maxScale?: number
  /** Centre each line (the default), or start every line at the left edge. */
  align?: 'center' | 'left'
  /** Sizes to try, largest first. Defaults to regular, then small. */
  sizes?: AlphabetSizeId[]
}

export type AlphabetLayoutResult =
  | {
      ok: true
      mask: Mask
      rows: number
      letters: LetterBox[]
      size: AlphabetSizeId
      enlarge: number
      /** Ornament stitches ('+' in a glyph), one cell per stitch, width × rows. Not in the mask. */
      accent: Uint8Array
      /** Width of the widest line, in stitches. */
      contentWidth: number
    }
  | { ok: false; reason: 'missing'; char: string }
  | { ok: false; reason: 'too-wide' }

interface SetLine {
  rows: string[]
  /** Column ranges of each glyph, for the legibility check. */
  glyphs: { x: number; width: number }[]
  descends: boolean
}

/**
 * Sets one line of glyphs. With `joined`, two lowercase letters in a row are
 * bridged by a stitch on the baseline in the gap between them, like a pen
 * stroke carrying on.
 */
function setLine(size: AlphabetSize, line: string, gap: number, joined = false): SetLine | string {
  const height = size.capRows + size.descRows
  const rows = Array.from({ length: height }, () => '')
  const glyphs: SetLine['glyphs'] = []
  let x = 0
  for (const [i, char] of [...line].entries()) {
    if (i > 0) {
      const bridge = joined && /[a-z]/.test(char) && /[a-z]/.test(line[i - 1])
      rows.forEach((_, y) => (rows[y] += (bridge && y === size.capRows - 1 ? '#' : '.').repeat(gap)))
      x += gap
    }
    if (char === ' ') {
      rows.forEach((_, y) => (rows[y] += '.'.repeat(size.space)))
      x += size.space
      continue
    }
    const glyph = size.glyphs.get(char)
    if (!glyph) return char
    rows.forEach((_, y) => (rows[y] += glyph.rows[y]))
    glyphs.push({ x, width: glyph.width })
    x += glyph.width
  }
  const descends = rows.slice(size.capRows).some((row) => row.includes('#'))
  return { rows: descends ? rows : rows.slice(0, size.capRows), glyphs, descends }
}

/**
 * Sets lines of a stitch alphabet on the grid, centred, at the largest size
 * that fits: the regular size if the longest line fits, else the small one.
 * Short words may be enlarged by a whole number so they fill the width; the
 * glyphs themselves are never stretched or redrawn.
 */
export function renderAlphabet(lines: string[], options: AlphabetLayoutOptions): AlphabetLayoutResult {
  const { width, scale, alphabet, lineGap, maxScale = 3, align = 'center', sizes = ['regular', 'small'] } = options
  // Joined letters sit one stitch apart, bridged on the baseline; others keep at least the alphabet's minimum gap.
  const letterGap = alphabet.joined ? 1 : Math.max(options.letterGap, alphabet.minLetterGap ?? 0)

  for (const sizeId of sizes) {
    const size = alphabet.sizes[sizeId]
    const set: SetLine[] = []
    for (const line of lines) {
      const result = setLine(size, line, letterGap, alphabet.joined)
      if (typeof result === 'string') return { ok: false, reason: 'missing', char: result }
      set.push(result)
    }
    const widest = Math.max(...set.map((l) => l.rows[0].length))
    if (widest > width) continue

    const enlarge = Math.max(1, Math.min(maxScale, alphabet.maxEnlarge ?? maxScale, Math.floor(width / widest)))
    const textRows = set.reduce((sum, l) => sum + l.rows.length, 0) * enlarge + lineGap * enlarge * (set.length - 1)
    const rows = textRows
    const mask: Mask = { width: width * scale, height: rows * scale, data: new Uint8Array(width * scale * rows * scale) }
    const letters: LetterBox[] = []
    const accent = new Uint8Array(width * rows)

    let top = 0
    for (const line of set) {
      const left = align === 'left' ? 0 : Math.floor((width - line.rows[0].length * enlarge) / 2)
      for (const glyph of line.glyphs) {
        const x0 = left + glyph.x * enlarge
        const gw = glyph.width * enlarge
        const glyphTop = top
        line.rows.forEach((row, y) => {
          for (let x = glyph.x; x < glyph.x + glyph.width; x++) {
            if (row[x] === '+') {
              for (let dy = 0; dy < enlarge; dy++) {
                accent.fill(
                  1,
                  (glyphTop + y * enlarge + dy) * width + left + x * enlarge,
                  (glyphTop + y * enlarge + dy) * width + left + (x + 1) * enlarge,
                )
              }
              continue
            }
            if (row[x] !== '#') continue
            // Each stitch becomes an enlarge × enlarge block of solid mask pixels.
            const sx = left + x * enlarge
            for (let py = (glyphTop + y * enlarge) * scale; py < (glyphTop + (y + 1) * enlarge) * scale; py++) {
              const offset = py * mask.width
              mask.data.fill(255, offset + sx * scale, offset + (sx + enlarge) * scale)
            }
          }
        })
        letters.push({ x: x0, y: glyphTop, width: gw, height: line.rows.length * enlarge })
      }
      top += (line.rows.length + lineGap) * enlarge
    }
    return { ok: true, mask, rows, letters, size: sizeId, enlarge, accent, contentWidth: widest * enlarge }
  }
  return { ok: false, reason: 'too-wide' }
}
