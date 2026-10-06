import { describe, expect, it } from 'vitest'
import { BLOCK } from '../../data/alphabets/block'
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

  it('enlarges short words by a whole number to fill the width', () => {
    const result = renderAlphabet(['HI'], options)
    expect(result.ok && result.enlarge).toBe(3)
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

describe('renderAlphabet on a wave', () => {
  it('steps whole letters up and down without changing them', () => {
    const flat = renderAlphabet(['WAVY'], options)
    const wavy = renderAlphabet(['WAVY'], { ...options, wave: { amplitude: 2, length: 20, phase: 0 } })
    if (!flat.ok || !wavy.ok) throw new Error('expected layouts')
    expect(wavy.rows).toBe(flat.rows + 4)
    const count = (r: typeof flat) => stitchesFrom(coverage(r.mask, options.scale)).reduce((a, b) => a + b, 0)
    expect(count(wavy)).toBe(count(flat))
    expect(new Set(wavy.letters.map((l) => l.y)).size).toBeGreaterThan(1)
  })
})
