import { describe, expect, it } from 'vitest'
import type { Grid } from './cleanup'
import { coverage, type Mask } from './downsample'
import { checkLegibility, countShapes, holes } from './legibility'

const SCALE = 4

function grid(rows: string[]): Grid {
  return {
    width: rows[0].length,
    height: rows.length,
    cells: new Uint8Array(
      rows
        .join('')
        .split('')
        .map((c) => (c === '#' ? 1 : 0)),
    ),
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

describe('open counters', () => {
  it('fails an N whose notches filled in, even with no closed hole to lose', () => {
    const N = ['#..#', '##.#', '#.##', '#..#']
    const mask = maskOf(N)
    const solid = grid(['####', '####', '####', '####'])
    const box = { x: 0, y: 0, width: 4, height: 4 }
    const result = checkLegibility(mask, SCALE, solid, coverage(mask, SCALE), [box])
    expect(result.reasons).toContain('The open space in a letter filled in')
    expect(checkLegibility(mask, SCALE, grid(N), coverage(mask, SCALE), [box]).ok).toBe(true)
  })
})

describe('solid letters', () => {
  it('fails a letter stitched as a block when the drawing had shape', () => {
    // Notches thinner than a stitch: no open patch to protect, but not solid either.
    const mask: Mask = { width: 16, height: 16, data: new Uint8Array(256).map((_, i) => ((i % 16) % 5 === 2 ? 0 : 255)) }
    const box = { x: 0, y: 0, width: 4, height: 4 }
    const solid = grid(['####', '####', '####', '####'])
    expect(checkLegibility(mask, SCALE, solid, coverage(mask, SCALE), [box]).reasons).toContain(
      'A letter turned into a solid block',
    )
  })

  it('accepts a letter that really is solid, like a plain I', () => {
    const mask = maskOf(['####', '####', '####', '####'])
    const box = { x: 0, y: 0, width: 4, height: 4 }
    expect(checkLegibility(mask, SCALE, grid(['####', '####', '####', '####']), coverage(mask, SCALE), [box]).ok).toBe(true)
  })
})
