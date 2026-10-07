import { describe, expect, it } from 'vitest'
import type { Grid } from './cleanup'
import { addShadow, iconSizeFor, placeIconBelow } from './compose'

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

describe('addShadow', () => {
  it('casts one stitch down-right, never over lettering, and adds a row', () => {
    expect(show(addShadow(grid(['##..', '.#..'])))).toEqual(['##..', '.#+.', '..+.'])
  })

  it('stops at the right edge instead of wrapping', () => {
    expect(show(addShadow(grid(['...#'])))).toEqual(['...#', '....'])
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
