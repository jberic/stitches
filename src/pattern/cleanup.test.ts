import { describe, expect, it } from 'vitest'
import { fillPinholes, removeStrays, thickenStrokes, type Grid } from './cleanup'

function grid(rows: string[]): Grid {
  const width = rows[0].length
  const cells = new Uint8Array(rows.join('').split('').map((c) => (c === '#' ? 1 : 0)))
  return { width, height: rows.length, cells }
}

function show(g: Grid, cells: Uint8Array): string[] {
  return Array.from({ length: g.height }, (_, y) =>
    [...cells.subarray(y * g.width, (y + 1) * g.width)].map((c) => (c ? '#' : '.')).join(''),
  )
}

function cover(rows: string[]): Float32Array {
  // Digits are tenths of coverage; '.' is 0.
  return new Float32Array(rows.join('').split('').map((c) => (c === '.' ? 0 : Number(c) / 10)))
}

describe('removeStrays', () => {
  it('drops lone stitches and keeps diagonal neighbours', () => {
    const g = grid(['#...', '...#', '..#.'])
    expect(show(g, removeStrays(g))).toEqual(['....', '...#', '..#.'])
  })
})

describe('fillPinholes', () => {
  const g = grid(['.#.', '#.#', '.#.'])

  it('fills a boxed-in gap where the drawing had ink', () => {
    expect(show(g, fillPinholes(g, cover(['...', '.4.', '...'])))[1]).toBe('###')
  })

  it('keeps a real one-stitch counter open', () => {
    expect(show(g, fillPinholes(g, cover(['...', '.1.', '...'])))[1]).toBe('#.#')
  })
})

describe('thickenStrokes', () => {
  it('widens a one-stitch stroke towards the side with more ink', () => {
    const g = grid(['.#..', '.#..', '.#..'])
    const c = cover(['.93.', '.93.', '.93.'])
    expect(show(g, thickenStrokes(g, c))).toEqual(['.##.', '.##.', '.##.'])
  })

  it('never grows into cells the drawing left empty, like a letter gap', () => {
    const g = grid(['.#.', '.#.', '.#.'])
    const c = cover(['.9.', '.9.', '.9.'])
    expect(show(g, thickenStrokes(g, c))).toEqual(['.#.', '.#.', '.#.'])
  })
})
