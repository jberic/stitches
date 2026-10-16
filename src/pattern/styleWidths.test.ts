import { describe, expect, it } from 'vitest'
import { ALPHABET_IDS } from '../data/alphabets'
import { PATTERN_FONTS } from '../fonts'
import { MAX_WIDTH, MIN_WIDTH } from './generate'
import { STYLE_WIDTHS, styleWidth } from './styleWidths'

describe('style widths', () => {
  it('has a width for every alphabet and pattern font, inside the Width control', () => {
    for (const style of [...ALPHABET_IDS, ...PATTERN_FONTS]) {
      const w = (STYLE_WIDTHS as Record<string, number | undefined>)[style]
      expect([style, typeof w]).toEqual([style, 'number'])
      expect(w).toBeGreaterThanOrEqual(MIN_WIDTH)
      expect(w).toBeLessThanOrEqual(MAX_WIDTH)
    }
  })

  it('falls back for a style not in the list', () => {
    expect(styleWidth('Chango', 57)).toBe(57)
    expect(styleWidth('assisi', 57)).toBe(40)
  })
})
