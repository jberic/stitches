import { describe, expect, it } from 'vitest'
import { countShapes, holes } from '../pattern/legibility'
import { ICONS, ICON_SETS, SYMMETRIC, iconCells, iconPhrase, iconSizes, type IconName } from './icons'

const names = Object.keys(ICONS) as IconName[]
const all = names.flatMap((name) => iconSizes(name).map((size) => ({ name, size })))

describe('icons', () => {
  it('has a nature set of 6 and a food set of 12, every icon in exactly one', () => {
    expect(ICON_SETS.nature).toHaveLength(6)
    expect(ICON_SETS.food).toHaveLength(12)
    expect(new Set([...ICON_SETS.nature, ...ICON_SETS.food]).size).toBe(names.length)
  })

  it.each(names)('%s comes at 15 stitches, and at 11 unless too busy to read there', (name) => {
    expect(iconSizes(name)).toContain(15)
    if (name !== 'ladybird') expect(iconSizes(name)).toContain(11)
  })

  it.each(all)('$name $size: every row is $size wide, at most $size tall', ({ name, size }) => {
    const rows = ICONS[name][size]!
    for (const row of rows) {
      expect(row).toHaveLength(size)
      expect(row).toMatch(/^[#.]+$/)
    }
    expect(rows.length).toBeLessThanOrEqual(size)
  })

  it.each(all)('$name $size has no empty edge rows', ({ name, size }) => {
    const rows = ICONS[name][size]!
    expect(rows[0]).toContain('#')
    expect(rows[rows.length - 1]).toContain('#')
  })

  it.each(all.filter((i) => SYMMETRIC.includes(i.name)))('$name $size is mirror-symmetric', ({ name, size }) => {
    for (const row of ICONS[name][size]!) expect(row).toBe([...row].reverse().join(''))
  })

  // Details are gaps, so the gaps that make an icon read must be real.
  it.each([
    ['doughnut', 'a hole in the middle'],
    ['bagel', 'a hole in the middle'],
    ['egg', 'a ring around the yolk'],
    ['lemon', 'segments inside the rind'],
  ] as const)('%s has %s at every size', (name, _what) => {
    for (const size of iconSizes(name)) expect(holes(iconCells(name, size), 1).length).toBeGreaterThanOrEqual(1)
  })

  it('cherries stay joined to their stems, as one shape', () => {
    for (const size of iconSizes('cherry')) expect(countShapes(iconCells('cherry', size), 1)).toBe(1)
  })
})

describe('iconPhrase', () => {
  it('reads naturally in a caption', () => {
    expect(iconPhrase('leaf')).toBe('a leaf')
    expect(iconPhrase('icecream')).toBe('an ice cream')
    expect(iconPhrase('cherry')).toBe('cherries')
  })
})
