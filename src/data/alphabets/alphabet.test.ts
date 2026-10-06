import { describe, expect, it } from 'vitest'
import { REQUIRED_CHARACTERS, type AlphabetSizeId } from './alphabet'
import { BLOCK } from './block'

const sizes: AlphabetSizeId[] = ['regular', 'small']

describe.each(sizes)('Block %s', (sizeId) => {
  const size = BLOCK.sizes[sizeId]
  const height = size.capRows + size.descRows

  it('draws every required character', () => {
    const missing = REQUIRED_CHARACTERS.filter((c) => !size.glyphs.has(c))
    expect(missing).toEqual([])
  })

  it.each(REQUIRED_CHARACTERS)('%s is the full height, rectangular, and only stitches or gaps', (char) => {
    const glyph = size.glyphs.get(char)!
    expect(glyph.rows).toHaveLength(height)
    for (const row of glyph.rows) {
      expect(row).toHaveLength(glyph.width)
      expect(row).toMatch(/^[#.]+$/)
    }
    expect(glyph.rows.some((row) => row.includes('#'))).toBe(true)
  })

  it('keeps capitals inside the cap height', () => {
    for (const char of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const glyph = size.glyphs.get(char)!
      for (const row of glyph.rows.slice(size.capRows)) expect(row).not.toContain('#')
    }
  })

  it('drops descenders below the baseline and nothing else', () => {
    const descending = new Set(['g', 'j', 'p', 'q', 'y', ','])
    for (const char of 'abcdefghijklmnopqrstuvwxyz,') {
      const below = size.glyphs.get(char)!.rows.slice(size.capRows).some((row) => row.includes('#'))
      expect([char, below]).toEqual([char, descending.has(char)])
    }
  })
})
