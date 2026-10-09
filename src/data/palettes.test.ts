import { describe, expect, it } from 'vitest'
import { contrast } from './colour'
import { FABRIC, PALETTES, paletteById, patternColours } from './palettes'

describe('palettes', () => {
  it('has 11 palettes with unique ids, all on the one fabric', () => {
    expect(PALETTES).toHaveLength(11)
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(11)
    for (const p of PALETTES) expect(patternColours(p).fabric).toBe(FABRIC.hex)
  })

  it.each(PALETTES)('$id $name: every thread code exists', (palette) => {
    expect(() => patternColours(palette)).not.toThrow()
  })

  it.each(PALETTES)('$id $name: lettering is at least 4.5:1 on the fabric', (palette) => {
    const { fabric, lettering } = patternColours(palette)
    expect(contrast(lettering.hex, fabric)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(PALETTES)('$id $name: the accent is visible on the fabric and apart from the lettering', (palette) => {
    const { fabric, lettering, accent } = patternColours(palette)
    expect(contrast(accent.hex, fabric)).toBeGreaterThanOrEqual(2)
    expect(contrast(accent.hex, lettering.hex)).toBeGreaterThanOrEqual(1.5)
    expect(accent.code).not.toBe(lettering.code)
  })

  it('falls back to the first palette for an unknown id', () => {
    expect(paletteById('99').id).toBe('01')
    expect(paletteById(null).id).toBe('01')
  })
})

describe('removed palettes', () => {
  it('no longer offers Garnet and raspberry (03), and an old link to it falls back to the default', () => {
    expect(PALETTES.map((p) => p.id)).not.toContain('03')
    expect(paletteById('03').id).toBe('01')
  })
})
