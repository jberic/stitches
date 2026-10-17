import { describe, expect, it } from 'vitest'
import { BLOCK } from '../../data/alphabets/block'
import { FLOURISH } from '../../data/alphabets/flourish'
import { coverage, stitchesFrom } from '../downsample'
import { renderAlphabet } from './alphabet'

const options = { width: 50, scale: 2, alphabet: BLOCK, letterGap: 1, lineGap: 2 }

describe('renderAlphabet', () => {
  it('uses the regular size when the words fit', () => {
    const result = renderAlphabet(['LOVE'], options)
    expect(result.ok && result.size).toBe('regular')
  })

  it('drops to the small size for a long word', () => {
    const result = renderAlphabet(['SUNSHINE'], options)
    expect(result.ok && result.size).toBe('small')
  })

  it('turns a phrase away rather than drop a large-only alphabet to its small size', () => {
    expect(FLOURISH.largeOnly).toBe(true)
    const large = { ...options, width: 100, alphabet: FLOURISH, sizes: ['regular' as const] }
    expect(renderAlphabet(['LOVE'], large).ok).toBe(true)
    expect(renderAlphabet(['SUNSHINE'], large).ok).toBe(false)
  })

  it('tucks a letter in over the tail of the one before, without touching it', () => {
    const tucked = { ...options, width: 100, maxScale: 1, alphabet: FLOURISH, sizes: ['regular' as const] }
    const result = renderAlphabet(['LO'], tucked)
    const size = FLOURISH.sizes.regular
    const apart = size.glyphs.get('L')!.width + 1 + size.glyphs.get('O')!.width
    expect(result.ok && result.letters[1].x - result.letters[0].x).toBeLessThan(size.glyphs.get('L')!.width)
    expect(result.ok && result.contentWidth).toBeLessThan(apart)
  })

  it('enlarges short words by a whole number to fill the width', () => {
    const result = renderAlphabet(['HI'], options)
    expect(result.ok && result.enlarge).toBe(3)
  })

  it("never enlarges past the alphabet's own limit", () => {
    const result = renderAlphabet(['HI'], { ...options, alphabet: { ...BLOCK, maxEnlarge: 1 } })
    expect(result.ok && result.enlarge).toBe(1)
  })

  it("keeps the alphabet's minimum letter gap", () => {
    const tight = renderAlphabet(['II'], { ...options, maxScale: 1 })
    const spaced = renderAlphabet(['II'], { ...options, maxScale: 1, alphabet: { ...BLOCK, minLetterGap: 3 } })
    if (!tight.ok || !spaced.ok) throw new Error('expected layouts')
    const gap = (r: typeof tight & { ok: true }) => r.letters[1].x - (r.letters[0].x + r.letters[0].width)
    expect([gap(tight), gap(spaced)]).toEqual([1, 3])
  })

  it('reports a character it has no glyph for, and words too wide for either size', () => {
    expect(renderAlphabet(['CAFÉ'], options)).toEqual({ ok: false, reason: 'missing', char: 'É' })
    expect(renderAlphabet(['ABCDEFGHIJKLMNOP'], { ...options, width: 40 })).toEqual({ ok: false, reason: 'too-wide' })
  })

  it('draws exactly the glyph stitches, centred', () => {
    const result = renderAlphabet(['I'], { ...options, width: 10, maxScale: 1 })
    if (!result.ok) throw new Error('expected a layout')
    const cells = stitchesFrom(coverage(result.mask, options.scale))
    // "I" is 2 wide; centred in 10 that's columns 4 and 5, every row.
    for (let y = 0; y < result.rows; y++) {
      expect([...cells.subarray(y * 10, y * 10 + 10)]).toEqual([0, 0, 0, 0, 1, 1, 0, 0, 0, 0])
    }
  })

  it('gives one letter box per glyph', () => {
    const result = renderAlphabet(['HELLO', 'YOU'], options)
    expect(result.ok && result.letters).toHaveLength(8)
  })
})

describe('renderAlphabet ornaments', () => {
  it('returns ornament stitches separately, outside the mask', () => {
    const ornamented = {
      ...BLOCK,
      ornamented: true,
      sizes: {
        ...BLOCK.sizes,
        regular: {
          ...BLOCK.sizes.regular,
          glyphs: new Map([
            [
              'I',
              {
                width: 3,
                rows: [
                  '##+',
                  ...BLOCK.sizes.regular.glyphs
                    .get('I')!
                    .rows.slice(1)
                    .map((r) => r + '.'),
                ],
              },
            ],
          ]),
        },
      },
    }
    const result = renderAlphabet(['I'], { ...options, width: 10, maxScale: 1, alphabet: ornamented })
    if (!result.ok) throw new Error('expected a layout')
    const cells = stitchesFrom(coverage(result.mask, options.scale))
    // "I" is 3 wide with its ornament: columns 3-5. The ornament is column 5 of the top row.
    expect([...result.accent.subarray(0, 10)]).toEqual([0, 0, 0, 0, 0, 1, 0, 0, 0, 0])
    expect(cells[5]).toBe(0)
    expect(result.accent.reduce((a, b) => a + b, 0)).toBe(1)
  })
})
