import { describe, expect, it } from 'vitest'
import { holes } from '../pattern/legibility'
import { ICONS, ICON_SIZES, iconCells, type IconName } from './icons'

const names = Object.keys(ICONS) as IconName[]
const all = names.flatMap((name) => ICON_SIZES.map((size) => ({ name, size })))

describe('icons', () => {
  it.each(all)('$name $size is $size stitches wide, rectangular and mirror-symmetric', ({ name, size }) => {
    const rows = ICONS[name][size]
    for (const row of rows) {
      expect(row).toHaveLength(size)
      expect(row).toMatch(/^[#.]+$/)
      expect(row).toBe([...row].reverse().join(''))
    }
    expect(rows.length).toBeLessThanOrEqual(size)
  })

  it.each(all)('$name $size has no empty edge rows or columns', ({ name, size }) => {
    const rows = ICONS[name][size]
    expect(rows[0]).toContain('#')
    expect(rows[rows.length - 1]).toContain('#')
    expect(rows.some((r) => r[0] === '#')).toBe(true)
  })

  // The openings that make a shape read must be real enclosed holes.
  it.each(ICON_SIZES)('smiley %i keeps both eyes and a mouth', (size) => {
    expect(holes(iconCells('smiley', size), 1).length).toBeGreaterThanOrEqual(3)
  })

  it.each(ICON_SIZES)('flower %i keeps an open centre', (size) => {
    const largest = Math.max(...holes(iconCells('flower', size), 1).map((h) => h.length))
    expect(largest).toBeGreaterThanOrEqual(5)
  })

  it('peace sign 11 and 15 have their three segments inside the ring', () => {
    expect(holes(iconCells('peace', 11), 1).length).toBeGreaterThanOrEqual(3)
    expect(holes(iconCells('peace', 15), 1).length).toBeGreaterThanOrEqual(3)
  })
})
