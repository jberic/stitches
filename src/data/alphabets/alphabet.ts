/**
 * Stitch alphabets: letters drawn directly on the grid ('#' = stitch), each
 * in two sizes. Glyphs keep their drawn shape; they are never stretched.
 */

export type AlphabetSizeId = 'regular' | 'small'

export interface AlphabetSizeSource {
  /** Rows from the cap line to the baseline. */
  capRows: number
  /** Rows below the baseline for descenders (g, j, p, q, y and the comma). */
  descRows: number
  /** Stroke width in stitches, for reference and tests. */
  stroke: number
  /** Width of a space, in stitches. */
  space: number
  /** Capitals, digits and punctuation: capRows tall, or taller if they hang below the baseline. */
  upper: Record<string, string[]>
  /** Lowercase: the full height, capRows + descRows. */
  lower: Record<string, string[]>
}

export interface Glyph {
  width: number
  /** Always capRows + descRows tall, baseline after row capRows - 1. */
  rows: string[]
}

export interface AlphabetSize {
  capRows: number
  descRows: number
  stroke: number
  space: number
  glyphs: Map<string, Glyph>
}

export interface StitchAlphabet {
  name: string
  sizes: Record<AlphabetSizeId, AlphabetSize>
}

function buildSize(source: AlphabetSizeSource): AlphabetSize {
  const height = source.capRows + source.descRows
  const glyphs = new Map<string, Glyph>()
  const add = (char: string, rows: string[]) => {
    const width = rows[0].length
    const padded = [...rows]
    while (padded.length < height) padded.push('.'.repeat(width))
    glyphs.set(char, { width, rows: padded })
  }
  for (const [char, rows] of Object.entries(source.upper)) add(char, rows)
  for (const [char, rows] of Object.entries(source.lower)) add(char, rows)
  return { capRows: source.capRows, descRows: source.descRows, stroke: source.stroke, space: source.space, glyphs }
}

export function defineAlphabet(source: { name: string; regular: AlphabetSizeSource; small: AlphabetSizeSource }): StitchAlphabet {
  return { name: source.name, sizes: { regular: buildSize(source.regular), small: buildSize(source.small) } }
}

/** The characters every alphabet must draw, in both sizes. */
export const REQUIRED_CHARACTERS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'abcdefghijklmnopqrstuvwxyz',
  ...'0123456789',
  ...".,!?'&-",
]
