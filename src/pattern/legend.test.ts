import { describe, expect, it } from 'vitest'
import { PALETTES, paletteById } from '../data/palettes'
import { legendFor } from './legend'
import { WORDMARK_RECIPE, type Recipe } from './recipe'
import type { Pattern } from './types'

const pattern = (cells: number[], recipe: Partial<Recipe> = {}): Pattern => ({
  width: cells.length,
  height: 1,
  cells: new Uint8Array(cells),
  meta: {
    text: 'x',
    lines: ['X'],
    layout: 'stacked-block',
    font: 'Chango',
    seed: 's',
    recipe: { ...WORDMARK_RECIPE, ...recipe },
  },
})

describe('legendFor', () => {
  it('counts each colour, and the counts add up to the grid total', () => {
    const p = pattern([1, 1, 0, 2, 1, 2, 0], { icon: 'mushroom' })
    const legend = legendFor(p, paletteById('01'))
    expect(legend.rows.map((r) => [r.use, r.stitches])).toEqual([
      ['Lettering', 3],
      ['Mushroom', 2],
    ])
    expect(legend.total).toBe([...p.cells].filter(Boolean).length)
  })

  it('lists only threads that are used', () => {
    expect(legendFor(pattern([1, 1, 0]), paletteById('01')).rows).toHaveLength(1)
  })

  it('names the accent by what it stitches', () => {
    const both = pattern([1, 2], { icon: 'lemon', shadow: true })
    expect(legendFor(both, paletteById('01')).rows[1].use).toBe('Lemon slice and shadow')
    expect(legendFor(pattern([1, 2], { shadow: true }), paletteById('01')).rows[1].use).toBe('Shadow')
  })

  it.each(PALETTES)('$id: no two rows share a thread code', (palette) => {
    const codes = legendFor(pattern([1, 2]), palette).rows.map((r) => r.thread.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
