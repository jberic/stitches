import { describe, expect, it } from 'vitest'
import { REQUIRED_CHARACTERS, type AlphabetSizeId } from './alphabet'
import { ALPHABETS } from '.'

const cases = Object.values(ALPHABETS).flatMap((alphabet) =>
  (['regular', 'small'] as AlphabetSizeId[]).map((sizeId) => [alphabet.name, sizeId, alphabet] as const),
)

describe.each(cases)('%s %s', (_name, sizeId, alphabet) => {
  const size = alphabet.sizes[sizeId]
  const height = size.capRows + size.descRows

  // A capitals-only alphabet draws everything but the lowercase.
  // A capitals-only alphabet draws everything but the lowercase; an initial alphabet only A–Z.
  const required = alphabet.initial
    ? [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
    : alphabet.lowercase
      ? REQUIRED_CHARACTERS
      : REQUIRED_CHARACTERS.filter((c) => !/[a-z]/.test(c))

  it('draws every required character', () => {
    const missing = required.filter((c) => !size.glyphs.has(c))
    expect(missing).toEqual([])
  })

  it.each(required)('%s is the full height, rectangular, and only stitches or gaps', (char) => {
    const glyph = size.glyphs.get(char)!
    expect(glyph.rows).toHaveLength(height)
    for (const row of glyph.rows) {
      expect(row).toHaveLength(glyph.width)
      expect(row).toMatch(alphabet.ornamented ? /^[#+.]+$/ : /^[#.]+$/)
    }
    expect(glyph.rows.some((row) => row.includes('#'))).toBe(true)
  })

  it('keeps capitals inside the cap height, unless the alphabet has tails', () => {
    for (const char of alphabet.tails ? '' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const glyph = size.glyphs.get(char)!
      for (const row of glyph.rows.slice(size.capRows)) expect(row).not.toContain('#')
    }
  })

  it('drops descenders below the baseline and nothing else', () => {
    const descending = new Set(['g', 'j', 'p', 'q', 'y', ','])
    for (const char of alphabet.initial ? '' : alphabet.lowercase ? 'abcdefghijklmnopqrstuvwxyz,' : ',') {
      const below = size.glyphs
        .get(char)!
        .rows.slice(size.capRows)
        .some((row) => row.includes('#'))
      expect([char, below]).toEqual([char, descending.has(char)])
    }
  })
})
