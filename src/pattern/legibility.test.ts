import { describe, expect, it } from 'vitest'
import type { Grid } from './cleanup'
import { coverage, type Mask } from './downsample'
import { checkLegibility, countShapes, holes } from './legibility'

const SCALE = 4

function grid(rows: string[]): Grid {
  return {
    width: rows[0].length,
    height: rows.length,
    cells: new Uint8Array(rows.join('').split('').map((c) => (c === '#' ? 1 : 0))),
  }
}

/** A drawing where each '#' is a fully inked stitch-sized block. */
function maskOf(rows: string[]): Mask {
  const g = grid(rows)
  const width = g.width * SCALE
  const data = new Uint8Array(width * g.height * SCALE)
  for (let y = 0; y < g.height * SCALE; y++)
    for (let x = 0; x < width; x++) data[y * width + x] = g.cells[Math.floor(y / SCALE) * g.width + Math.floor(x / SCALE)] * 255
  return { width, height: g.height * SCALE, data }
}

const O = ['.....', '.###.', '.#.#.', '.###.', '.....']

describe('regions', () => {
  it('finds the hole in an O, sealed even with diagonal corners', () => {
    expect(holes(grid(O), 1)).toHaveLength(1)
    expect(holes(grid(['......', '..##..', '.#..#.', '..##..', '......']), 1)).toHaveLength(1)
  })

  it('joins stitches that touch at corners into one shape', () => {
    expect(countShapes(grid(['#..', '.#.', '..#']), 1)).toBe(1)
    expect(countShapes(grid(['#.#']), 1)).toBe(2)
  })
})

describe('checkLegibility', () => {
  const check = (drawing: string[], stitched: string[]) => {
    const mask = maskOf(drawing)
    return checkLegibility(mask, SCALE, grid(stitched), coverage(mask, SCALE))
  }

  it('passes a faithful copy', () => {
    expect(check(O, O).ok).toBe(true)
  })

  it('fails when the hole in a letter fills in', () => {
    const result = check(O, ['.....', '.###.', '.###.', '.###.', '.....'])
    expect(result.ok).toBe(false)
    expect(result.reasons).toContain('1 hole in letters filled in')
  })

  it('fails when two marks run together', () => {
    const result = check(['#.#', '#.#'], ['###', '#.#'])
    expect(result.reasons).toContain('Two marks ran together')
  })

  it('is not fooled by an extra sealed notch elsewhere', () => {
    const drawing = ['.......', '.###.#.', '.#.#.#.', '.###.#.', '.......']
    // The O fills in, but a notch elsewhere happens to close off: one hole
    // either way, so a count alone would pass this.
    const stitched = ['.......', '.#####.', '.####.#', '.#####.', '.......']
    expect(check(drawing, stitched).reasons).toContain('1 hole in letters filled in')
  })
})
