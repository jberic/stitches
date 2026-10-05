import { loadDisplayFont, type DisplayFont } from '../fonts'
import { maskFromCanvas } from './canvas'
import { downsample, trimRows } from './downsample'
import { renderStackedBlock } from './layouts/stackedBlock'
import type { Pattern } from './types'

export const MIN_WIDTH = 40
export const MAX_WIDTH = 80
export const DEFAULT_WIDTH = 50

/** Mask pixels per stitch. */
const SCALE = 8
/** Narrower than this per letter (gap excluded) and the strokes can't hold their shape. */
const MIN_STITCHES_PER_LETTER = 4
const LETTER_GAP = 1

export interface GenerateInput {
  lines: string[]
  width: number
  font: DisplayFont
}

export interface GenerateResult {
  pattern: Pattern
  /** Set when the longest word is too long for this width to stay readable. */
  tooNarrow?: { word: string; suggestedWidth: number | null }
}

export async function generatePattern({ lines, width, font }: GenerateInput): Promise<GenerateResult> {
  await loadDisplayFont(font)
  const upper = lines.map((line) => line.toLocaleUpperCase())
  const { canvas } = renderStackedBlock(upper, { width, scale: SCALE, font, letterGap: LETTER_GAP })
  const { cells, height } = trimRows(downsample(maskFromCanvas(canvas), SCALE), width)

  const pattern: Pattern = {
    width,
    height,
    cells,
    meta: { text: lines.join(' '), lines: upper, layout: 'stacked-block', font },
  }

  const longest = lines.reduce((a, b) => ([...b].length > [...a].length ? b : a), '')
  const letters = [...longest].length
  const perLetter = (width - LETTER_GAP * (letters - 1)) / letters
  if (perLetter < MIN_STITCHES_PER_LETTER) {
    const needed = Math.ceil(letters * MIN_STITCHES_PER_LETTER + LETTER_GAP * (letters - 1))
    return { pattern, tooNarrow: { word: longest, suggestedWidth: needed <= MAX_WIDTH ? needed : null } }
  }
  return { pattern }
}
