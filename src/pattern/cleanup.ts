/**
 * Tidy-up passes on a stitch grid. Each one is guided by `cover`, the share of
 * ink the high-resolution drawing had in every cell, so a pass only ever moves
 * the grid closer to the drawing, never away from it.
 */

export interface Grid {
  width: number
  height: number
  cells: Uint8Array
}

/** A gap is filled only where the drawing was mostly ink: real counters stay open. */
const PINHOLE_MIN_COVER = 0.3
/**
 * A thin stroke is thickened only into cells the drawing inked at least this
 * much. Lower values fill the open notches of narrow letters like N.
 */
const THICKEN_MIN_COVER = 0.35

export function cleanup(grid: Grid, cover: Float32Array): Grid {
  let cells = removeStrays(grid)
  cells = fillPinholes({ ...grid, cells }, cover)
  cells = thickenStrokes({ ...grid, cells }, cover)
  return { ...grid, cells }
}

function at(grid: Grid, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return 0
  return grid.cells[y * grid.width + x]
}

/** Removes stitches with no neighbours at all, including diagonals. */
/** Drawing coverage at which a notch may be filled, and below which a spur may go. */
const NOTCH_MIN_COVER = 0.4
const SPUR_MAX_COVER = 0.85

/**
 * Evens out the outline of font lettering, so edges read as clean charted
 * steps: a stitch held by one neighbour or none (a spur) goes, and a gap
 * with three stitch neighbours (a notch) is filled. The drawing has
 * the final say: only cells it leaves part-covered can change, so real
 * counters and gaps stay. Runs until nothing changes, at most a few passes.
 */
export function smoothEdges(grid: Grid, cover: Float32Array, passes = 3): Grid {
  const neighbours = (cells: Uint8Array, x: number, y: number) => {
    const g = { ...grid, cells }
    return at(g, x - 1, y) + at(g, x + 1, y) + at(g, x, y - 1) + at(g, x, y + 1)
  }
  // One rule at a time, each on the result of the last: done together, the
  // corners beside a notch look like spurs and go before the notch is filled.
  const apply = (cells: Uint8Array, rule: (filled: boolean, n: number, i: number) => number | null) => {
    const next = cells.slice()
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const i = y * grid.width + x
        const value = rule(cells[i] !== 0, neighbours(cells, x, y), i)
        if (value !== null) next[i] = value
      }
    }
    return next
  }
  let cells = grid.cells
  for (let pass = 0; pass < passes; pass++) {
    // Exactly three: a cell closed on all four sides is a counter, left to fillPinholes.
    const filled = apply(cells, (on, n, i) => (!on && n === 3 && cover[i] >= NOTCH_MIN_COVER ? 1 : null))
    const next = apply(filled, (on, n, i) => (on && n <= 1 && cover[i] <= SPUR_MAX_COVER ? 0 : null))
    if (next.every((v, i) => v === cells[i])) break
    cells = next
  }
  return { ...grid, cells }
}

export function removeStrays(grid: Grid): Uint8Array {
  const out = grid.cells.slice()
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (!at(grid, x, y)) continue
      let neighbours = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && at(grid, x + dx, y + dy)) neighbours++
      if (neighbours === 0) out[y * grid.width + x] = 0
    }
  }
  return out
}

/** Fills single empty cells boxed in on all four sides, if the drawing had ink there. */
export function fillPinholes(grid: Grid, cover: Float32Array): Uint8Array {
  const out = grid.cells.slice()
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const i = y * grid.width + x
      if (at(grid, x, y) || cover[i] < PINHOLE_MIN_COVER) continue
      if (at(grid, x - 1, y) && at(grid, x + 1, y) && at(grid, x, y - 1) && at(grid, x, y + 1)) out[i] = 1
    }
  }
  return out
}

/**
 * Makes one-stitch-wide strokes two wide, horizontally and vertically, by
 * adding the neighbouring cell that the drawing inked the most. Letter gaps
 * have no ink in the drawing, so this can't close them.
 */
export function thickenStrokes(grid: Grid, cover: Float32Array): Uint8Array {
  const out = grid.cells.slice()
  const consider = (ax: number, ay: number, bx: number, by: number) => {
    const inA = ax >= 0 && ay >= 0 && ax < grid.width && ay < grid.height
    const inB = bx >= 0 && by >= 0 && bx < grid.width && by < grid.height
    const ca = inA ? cover[ay * grid.width + ax] : -1
    const cb = inB ? cover[by * grid.width + bx] : -1
    const [tx, ty, c] = ca >= cb ? [ax, ay, ca] : [bx, by, cb]
    if (c >= THICKEN_MIN_COVER) out[ty * grid.width + tx] = 1
  }
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (!at(grid, x, y)) continue
      if (!at(grid, x - 1, y) && !at(grid, x + 1, y)) consider(x - 1, y, x + 1, y)
      if (!at(grid, x, y - 1) && !at(grid, x, y + 1)) consider(x, y - 1, x, y + 1)
    }
  }
  return out
}
