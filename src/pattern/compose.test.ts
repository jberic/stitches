import { describe, expect, it } from 'vitest'
import type { Grid } from './cleanup'
import { EFFECTS, EFFECT_REACH, addEffect, iconSizeFor, padColumns, placeIconBelow, placeIconRow } from './compose'

const grid = (rows: string[]): Grid => ({
  width: rows[0].length,
  height: rows.length,
  cells: new Uint8Array(
    rows
      .join('')
      .split('')
      .map((c) => (c === '#' ? 1 : c === '+' ? 2 : 0)),
  ),
})
const show = (g: Grid) =>
  Array.from({ length: g.height }, (_, y) => [...g.cells.subarray(y * g.width, (y + 1) * g.width)].map((c) => '.#+'[c]).join(''))

describe('effects', () => {
  it('shadow: a solid side two stitches deep, down-right, never over lettering', () => {
    expect(show(addEffect(grid(['##...', '.#...']), 'shadow'))).toEqual(['##...', '.#+..', '..++.', '...+.'])
  })

  it('block3d: a solid side three stitches deep, down-left', () => {
    expect(show(addEffect(grid(['...#']), 'block3d'))).toEqual(['...#', '..+.', '.+..', '+...'])
  })

  it('stops at the edge instead of wrapping', () => {
    expect(show(addEffect(grid(['#...']), 'block3d'))).toEqual(['#...', '....', '....', '....'])
  })

  it('outline: letters take the accent, a contour in the lettering thread goes all round', () => {
    expect(show(addEffect(grid(['.....', '..#..', '.....']), 'outline'))).toEqual(['.....', '.###.', '.#+#.', '.###.', '.....'])
  })

  it('outline leaves the middle of a three-stitch counter open', () => {
    const o = grid(['.......', '.#####.', '.#...#.', '.#...#.', '.#...#.', '.#####.', '.......'])
    expect(show(addEffect(o, 'outline'))[4]).toBe('#+#.#+#')
  })

  it('leaves the grid alone for none', () => {
    const g = grid(['#.'])
    expect(addEffect(g, 'none')).toBe(g)
  })

  it('reaches no further than EFFECT_REACH says', () => {
    for (const effect of EFFECTS) {
      const reach = EFFECT_REACH[effect]
      const g = padColumns(grid(['#']), reach.left, reach.right)
      const out = addEffect(g, effect)
      expect(out.height).toBe(1 + reach.top + reach.bottom)
      expect(out.width).toBe(g.width)
    }
  })
})

describe('placeIconBelow', () => {
  it('centres the icon under the lettering after the gap', () => {
    const out = placeIconBelow(grid(['#####']), grid(['#.#']), 1)
    expect(show(out)).toEqual(['#####', '.....', '.+.+.'])
  })
})

describe('iconSizeFor', () => {
  it('picks the largest size that stays a modest share of the width', () => {
    expect(iconSizeFor([7, 11, 15], 50)).toBe(15)
    expect(iconSizeFor([7, 11, 15], 40)).toBe(11)
    expect(iconSizeFor([15], 40)).toBe(null)
  })
})

describe('placeIconRow', () => {
  const leaf = grid(['#.', '##'])

  it('centres an odd number of motifs, mirroring every other one', () => {
    const row = placeIconRow(grid(['...............']), leaf, 0)!
    expect(show(row).slice(1)).toEqual(['.+.....+...+...', '.++...++...++..'])
  })

  it('gives up when three do not fit', () => {
    expect(placeIconRow(grid(['......']), leaf)).toBeNull()
  })
})
