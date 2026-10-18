import type { Grid } from './cleanup'

/**
 * Steps that add colour 2 (the accent thread) to a finished lettering grid.
 * They run after the legibility check, so they can never hide a problem with
 * the letters themselves.
 */

export const LETTERING = 1
export const ACCENT = 2

/**
 * How the accent thread dresses the lettering:
 * - shadow: a solid drop shadow two stitches deep, down and to the right
 * - block3d: a solid side three stitches deep, down and to the left, like
 *   carved block letters
 * - outline: a one-stitch contour round every letter. The letters swap to the
 *   lighter accent thread and the outline takes the darker lettering thread,
 *   which reads best on light fabric (the lettering thread is the darker one
 *   in every palette).
 */
export type Effect = 'none' | 'shadow' | 'block3d' | 'outline' | 'assisi' | 'sampler'
export const EFFECTS: Effect[] = ['none', 'shadow', 'block3d', 'outline', 'assisi', 'sampler']

/** Stitches an effect reaches beyond the letters, so the lettering can leave room for it. */
export const EFFECT_REACH: Record<Effect, { left: number; right: number; bottom: number; top: number }> = {
  none: { left: 0, right: 0, bottom: 0, top: 0 },
  shadow: { left: 0, right: 2, bottom: 2, top: 0 },
  block3d: { left: 3, right: 0, bottom: 3, top: 0 },
  outline: { left: 1, right: 1, bottom: 1, top: 1 },
  // Two stitches of background around the words, then a one-stitch frame.
  assisi: { left: 3, right: 3, bottom: 3, top: 3 },
  // Two stitches of fabric around the words, a one-stitch frame, and corner blocks one stitch beyond it.
  sampler: { left: 4, right: 4, bottom: 4, top: 4 },
}

/** Applies an effect. The grid must already have the effect's reach free at its sides. */
export function addEffect(grid: Grid, effect: Effect): Grid {
  if (effect === 'shadow') return extrude(grid, 1, 2)
  if (effect === 'block3d') return extrude(grid, -1, 3)
  if (effect === 'outline') return outline(grid)
  if (effect === 'assisi') return assisi(grid)
  if (effect === 'sampler') return sampler(grid)
  return grid
}

/**
 * Every lettering stitch casts `depth` stitches diagonally down, to the right
 * (dx 1) or left (dx -1), wherever the fabric is empty: a solid side, not an
 * offset copy. Adds rows at the bottom so the side fits.
 */
export function extrude(grid: Grid, dx: 1 | -1, depth: number): Grid {
  const out = withRows(grid, 0, depth)
  const { width } = out
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid.cells[y * width + x] !== LETTERING) continue
      for (let d = 1; d <= depth; d++) {
        const tx = x + dx * d
        if (tx < 0 || tx >= width) break
        const target = (y + d) * width + tx
        if (out.cells[target] === 0) out.cells[target] = ACCENT
      }
    }
  }
  return out
}

/** A one-stitch contour (all eight neighbours) in the lettering thread, with the letters in the accent thread. */
export function outline(grid: Grid): Grid {
  const out = withRows(grid, 1, 1)
  const { width, height } = out
  const letters = out.cells.slice()
  for (let i = 0; i < out.cells.length; i++) out.cells[i] = letters[i] === LETTERING ? ACCENT : letters[i]
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (letters[y * width + x] !== LETTERING) continue
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const tx = x + ox
          const ty = y + oy
          if (tx < 0 || ty < 0 || tx >= width || ty >= height) continue
          const target = ty * width + tx
          if (out.cells[target] === 0) out.cells[target] = LETTERING
        }
      }
    }
  }
  return out
}

/**
 * Assisi work, reversed: the letters stay bare fabric, outlined in the
 * lettering thread, on a panel stitched in the accent thread, inside a
 * one-stitch frame in the lettering thread. The panel hugs the words with
 * two stitches to spare; the grid must have three free columns each side.
 */
export function assisi(grid: Grid): Grid {
  const out = withRows(grid, 3, 3)
  const { width, height } = out
  const letters = out.cells.slice()
  let minX = width
  let maxX = -1
  for (let i = 0; i < letters.length; i++) {
    if (!letters[i]) continue
    minX = Math.min(minX, i % width)
    maxX = Math.max(maxX, i % width)
  }
  if (maxX < 0) return out
  const left = Math.max(0, minX - 3)
  const right = Math.min(width - 1, maxX + 3)
  const near = (x: number, y: number) => {
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const tx = x + ox
        const ty = y + oy
        if (tx >= 0 && ty >= 0 && tx < width && ty < height && letters[ty * width + tx]) return true
      }
    }
    return false
  }
  for (let y = 0; y < height; y++) {
    for (let x = left; x <= right; x++) {
      const i = y * width + x
      const frame = y === 0 || y === height - 1 || x === left || x === right
      if (letters[i]) out.cells[i] = 0
      else if (frame || near(x, y)) out.cells[i] = LETTERING
      else out.cells[i] = ACCENT
    }
  }
  return out
}

/**
 * A sampler frame, after the Delft style in the Stitch Alphabets handoff: a
 * one-stitch line in the lettering thread two stitches clear of the words,
 * with a 3×3 chequered block on each corner. The grid must have four free
 * columns each side.
 */
export function sampler(grid: Grid): Grid {
  const out = withRows(grid, 4, 4)
  const { width, height } = out
  let minX = width
  let maxX = -1
  for (let i = 0; i < out.cells.length; i++) {
    if (!out.cells[i]) continue
    minX = Math.min(minX, i % width)
    maxX = Math.max(maxX, i % width)
  }
  if (maxX < 0) return out
  const left = Math.max(1, minX - 3)
  const right = Math.min(width - 2, maxX + 3)
  const top = 1
  const bottom = height - 2
  const put = (x: number, y: number, on: boolean) => {
    if (x >= 0 && y >= 0 && x < width && y < height) out.cells[y * width + x] = on ? LETTERING : 0
  }
  for (let x = left; x <= right; x++) {
    put(x, top, true)
    put(x, bottom, true)
  }
  for (let y = top; y <= bottom; y++) {
    put(left, y, true)
    put(right, y, true)
  }
  for (const [cx, cy] of [
    [left, top],
    [right, top],
    [left, bottom],
    [right, bottom],
  ]) {
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) put(cx + a, cy + b, (a + b) % 2 === 0)
  }
  return out
}

/** The same grid with empty rows added above and below. */
function withRows(grid: Grid, top: number, bottom: number): Grid {
  const width = grid.width
  const height = grid.height + top + bottom
  const cells = new Uint8Array(width * height)
  cells.set(grid.cells, top * width)
  return { width, height, cells }
}

/** Adds empty columns on the left and right. */
export function padColumns(grid: Grid, left: number, right: number): Grid {
  const width = grid.width + left + right
  const cells = new Uint8Array(width * grid.height)
  for (let y = 0; y < grid.height; y++) cells.set(grid.cells.subarray(y * grid.width, (y + 1) * grid.width), y * width + left)
  return { width, height: grid.height, cells }
}

/** Places an icon centred below the lettering, `gap` empty rows apart, in the accent colour. */
export function placeIconBelow(grid: Grid, icon: Grid, gap = 1): Grid {
  const width = grid.width
  const height = grid.height + gap + icon.height
  const cells = new Uint8Array(width * height)
  cells.set(grid.cells)
  const left = Math.floor((width - icon.width) / 2)
  const top = grid.height + gap
  for (let y = 0; y < icon.height; y++) {
    for (let x = 0; x < icon.width; x++) {
      if (icon.cells[y * icon.width + x]) cells[(top + y) * width + left + x] = ACCENT
    }
  }
  return { width, height, cells }
}

/** The largest icon size that is no wider than `share` of the pattern. */
export function iconSizeFor<S extends number>(available: S[], width: number, share = 0.34): S | null {
  const fitting = available.filter((size) => size <= width * share)
  return fitting.length ? (Math.max(...fitting) as S) : null
}
