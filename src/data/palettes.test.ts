import { describe, expect, it } from 'vitest'
import { contrast, deltaE, hexToHsv, hexToLab, hsvToHex } from './colour'
import {
  ALL_THREADS,
  FABRIC,
  PALETTES,
  codesForPaletteId,
  nearestThreads,
  pairPalette,
  paletteById,
  patternColours,
} from './palettes'

describe('palettes', () => {
  it('recommends 6 pairs with unique ids, all on the one fabric', () => {
    expect(PALETTES).toHaveLength(6)
    expect(new Set(PALETTES.map((p) => p.id)).size).toBe(6)
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

describe('colour maths', () => {
  it('matches a published CIEDE2000 reference pair (Sharma et al. 2005, pair 1)', () => {
    expect(deltaE([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 3)
  })

  it('round-trips HSV and hex', () => {
    for (const hex of ['#93452e', '#fbf3ec', '#000000', '#2a7fff']) expect(hsvToHex(...hexToHsv(hex))).toBe(hex)
  })

  it('puts white at L 100 and black at L 0', () => {
    expect(hexToLab('#ffffff')[0]).toBeCloseTo(100, 1)
    expect(hexToLab('#000000')[0]).toBeCloseTo(0, 1)
  })
})

describe('the colour wheel', () => {
  it("snaps a thread's own screen colour to that thread", () => {
    for (const t of ALL_THREADS.slice(0, 60)) expect(nearestThreads(t.hex, 1)[0].hex).toBe(t.hex)
  })

  it('lists the closest threads first', () => {
    const [first, second] = nearestThreads('#93452e', 2)
    const target = hexToLab('#93452e')
    expect(deltaE(target, hexToLab(first.hex))).toBeLessThanOrEqual(deltaE(target, hexToLab(second.hex)))
  })

  it('names a custom pair after its threads, and keeps a recommended name', () => {
    expect(pairPalette('814', '729').name).toBe(PALETTES[0].name)
    expect(pairPalette('310', '729')).toMatchObject({ id: 'custom', lettering: { code: '310' }, accent: { code: '729' } })
  })

  it('opens old palette links in their exact threads', () => {
    expect(codesForPaletteId('02')).toEqual(['814', '470'])
    expect(codesForPaletteId('07')).toEqual(['939', '729'])
    expect(codesForPaletteId('03')).toBeNull()
  })
})
