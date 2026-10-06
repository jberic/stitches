import { describe, expect, it } from 'vitest'
import { contrast, luminance } from './colour'
import { PALETTES, paletteById, patternColours } from './palettes'

describe('palettes', () => {
  it('has the 12 palettes from the handoff with unique ids', () => {
    expect(PALETTES).toHaveLength(12)
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(12)
  })

  it.each(PALETTES)('$id $name: every thread code exists', (palette) => {
    expect(() => patternColours(palette)).not.toThrow()
  })

  it.each(PALETTES)('$id $name: lettering is at least 4.5:1 on the fabric', (palette) => {
    const { fabric, lettering } = patternColours(palette)
    expect(contrast(lettering.hex, fabric)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(PALETTES)('$id $name: the heart is a 2:1 tone of the fabric, in its direction', (palette) => {
    const { fabric, heart, lettering } = patternColours(palette)
    expect(contrast(heart.hex, fabric)).toBeGreaterThanOrEqual(2)
    expect(luminance(heart.hex) > luminance(fabric)).toBe(palette.heart.tone === 'light')
    expect(contrast(heart.hex, lettering.hex)).toBeGreaterThanOrEqual(1.5)
  })

  it('falls back to the first palette for an unknown id', () => {
    expect(paletteById('99').id).toBe('01')
    expect(paletteById(null).id).toBe('01')
  })
})
