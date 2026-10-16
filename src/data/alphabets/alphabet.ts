/**
 * Stitch alphabets: letters drawn directly on the grid ('#' = stitch), each
 * in two sizes. Glyphs keep their drawn shape; they are never stretched.
 * An ornamented alphabet also marks its decoration ('+'), stitched in the
 * accent thread and left out of the legibility check.
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

/** Accent effects (see pattern/compose.ts) that suit an alphabet's letterforms. */
export type AlphabetEffect = 'shadow' | 'block3d' | 'outline'

export interface StitchAlphabet {
  name: string
  sizes: Record<AlphabetSizeId, AlphabetSize>
  /** Effects that read well on these letters at the regular size. The small size only takes a shadow. */
  effects: AlphabetEffect[]
  /** False for a capitals-only alphabet: it sets any phrase in capitals, and says so. */
  lowercase: boolean
  /** Its letters carry their own decoration in the accent thread, so a pattern gets no icon or effect. */
  ornamented: boolean
  /** What the ornament stitches are, for the thread key ("Leaves"). */
  ornament?: string
  /** Largest whole-number enlargement for short words. 1 keeps a fine alphabet fine. */
  maxEnlarge?: number
  /** Fewest clear columns between letters, for letterforms that run together when set tight. */
  minLetterGap?: number
  /**
   * A drop-cap alphabet: it draws only the phrase's first letter, large, and
   * the rest is set beside it in Sampler. Capitals A–Z only.
   */
  initial?: boolean
  /** Assisi work: the letters are left bare on a stitched panel (see compose.ts). */
  reversed?: boolean
  /** Lowercase letters join: one stitch apart, bridged by a stitch on the baseline. */
  joined?: boolean
  /** Only the regular size counts: a phrase too wide for it goes to another style. */
  largeOnly?: boolean
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

export function defineAlphabet(source: {
  name: string
  regular: AlphabetSizeSource
  small: AlphabetSizeSource
  effects: AlphabetEffect[]
  lowercase?: boolean
  ornamented?: boolean
  ornament?: string
  maxEnlarge?: number
  minLetterGap?: number
  initial?: boolean
  reversed?: boolean
  joined?: boolean
  largeOnly?: boolean
}): StitchAlphabet {
  return {
    name: source.name,
    sizes: { regular: buildSize(source.regular), small: buildSize(source.small) },
    effects: source.effects,
    lowercase: source.lowercase ?? true,
    ornamented: source.ornamented ?? false,
    ornament: source.ornament,
    maxEnlarge: source.maxEnlarge,
    minLetterGap: source.minLetterGap,
    initial: source.initial,
    reversed: source.reversed,
    joined: source.joined,
    largeOnly: source.largeOnly,
  }
}

/** The characters every alphabet must draw, in both sizes. */
export const REQUIRED_CHARACTERS = [
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  ...'abcdefghijklmnopqrstuvwxyz',
  ...'0123456789',
  ...".,!?'&-",
]
