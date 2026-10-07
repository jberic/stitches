import { describe, expect, it } from 'vitest'
import { fillPinholes, removeStrays, smoothEdges, thickenStrokes, type Grid } from './cleanup'

function grid(rows: string[]): Grid {
  const width = rows[0].length
  const cells = new Uint8Array(
    rows
      .join('')
      .split('')
      .map((c) => (c === '#' ? 1 : 0)),
  )
  return { width, height: rows.length, cells }
}

function show(g: Grid, cells: Uint8Array): string[] {
  return Array.from({ length: g.height }, (_, y) =>
    [...cells.subarray(y * g.width, (y + 1) * g.width)].map((c) => (c ? '#' : '.')).join(''),
  )
}

function cover(rows: string[]): Float32Array {
  // Digits are tenths of coverage; '.' is 0.
  return new Float32Array(
    rows
      .join('')
      .split('')
      .map((c) => (c === '.' ? 0 : Number(c) / 10)),
  )
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
    const c = cover(['.94.', '.94.', '.94.'])
    expect(show(g, thickenStrokes(g, c))).toEqual(['.##.', '.##.', '.##.'])
  })

  it('never grows into cells the drawing left empty, like a letter gap', () => {
    const g = grid(['.#.', '.#.', '.#.'])
    const c = cover(['.9.', '.9.', '.9.'])
    expect(show(g, thickenStrokes(g, c))).toEqual(['.#.', '.#.', '.#.'])
  })
})

describe('smoothEdges', () => {
  const grid = (rows: string[]) => ({
    width: rows[0].length,
    height: rows.length,
    cells: Uint8Array.from(rows.join(''), (c) => (c === '#' ? 1 : 0)),
  })
  const show = (g: { width: number; cells: Uint8Array }) =>
    Array.from({ length: g.cells.length / g.width }, (_, y) =>
      [...g.cells.subarray(y * g.width, (y + 1) * g.width)].map((c) => (c ? '#' : '.')).join(''),
    )
  const half = (g: { cells: Uint8Array }) => new Float32Array(g.cells.length).fill(0.5)

  it('drops a one-stitch spur and fills a one-stitch notch', () => {
    const spur = grid(['......', '.####.', '.####.', '.####.', '..#...', '......'])
    expect(show(smoothEdges(spur, half(spur)))).toEqual(['......', '.####.', '.####.', '.####.', '......', '......'])
    const notch = grid(['......', '.####.', '..###.', '.####.', '......'])
    expect(show(smoothEdges(notch, half(notch)))[2]).toBe('.####.')
  })

  it('leaves an enclosed one-stitch hole to the pinhole rule', () => {
    const hole = grid(['......', '.####.', '.#.##.', '.####.', '......'])
    expect(show(smoothEdges(hole, half(hole)))[2]).toBe('.#.##.')
  })

  it('leaves cells the drawing is sure about', () => {
    const g = grid(['.###.', '.#.#.', '.###.'])
    const hole = new Float32Array(g.cells.length).fill(1)
    hole[1 * 5 + 2] = 0
    expect(show(smoothEdges(g, hole))).toEqual(['.###.', '.#.#.', '.###.'])
  })
})
