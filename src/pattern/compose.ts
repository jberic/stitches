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
export type Effect = 'none' | 'shadow' | 'block3d' | 'outline' | 'assisi'
export const EFFECTS: Effect[] = ['none', 'shadow', 'block3d', 'outline', 'assisi']

/** Stitches an effect reaches beyond the letters, so the lettering can leave room for it. */
export const EFFECT_REACH: Record<Effect, { left: number; right: number; bottom: number; top: number }> = {
  none: { left: 0, right: 0, bottom: 0, top: 0 },
  shadow: { left: 0, right: 2, bottom: 2, top: 0 },
  block3d: { left: 3, right: 0, bottom: 3, top: 0 },
  outline: { left: 1, right: 1, bottom: 1, top: 1 },
  // Two stitches of background around the words, then a one-stitch frame.
  assisi: { left: 3, right: 3, bottom: 3, top: 3 },
}

/** Applies an effect. The grid must already have the effect's reach free at its sides. */
export function addEffect(grid: Grid, effect: Effect): Grid {
  if (effect === 'shadow') return extrude(grid, 1, 2)
  if (effect === 'block3d') return extrude(grid, -1, 3)
  if (effect === 'outline') return outline(grid)
  if (effect === 'assisi') return assisi(grid)
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

/** Clear columns between motifs in a row. */
const ROW_GAP = 3
const ROW_MAX = 5

/**
 * A row of small motifs under the lettering, like a sampler border: as many
 * as fit (an odd number, up to five, at least three), centred. Every other
 * one is mirrored, so leaves and the like read as a vine rather than a stamp.
 * Returns null when three don't fit.
 */
export function placeIconRow(grid: Grid, icon: Grid, gap = 1): Grid | null {
  const fits = Math.floor((grid.width + ROW_GAP) / (icon.width + ROW_GAP))
  const count = Math.min(ROW_MAX, fits % 2 ? fits : fits - 1)
  if (count < 3) return null
  const rowWidth = count * icon.width + (count - 1) * ROW_GAP
  const width = grid.width
  const height = grid.height + gap + icon.height
  const cells = new Uint8Array(width * height)
  cells.set(grid.cells)
  const top = grid.height + gap
  let left = Math.floor((width - rowWidth) / 2)
  for (let k = 0; k < count; k++) {
    const mirror = k % 2 === 1
    for (let y = 0; y < icon.height; y++) {
      for (let x = 0; x < icon.width; x++) {
        const sx = mirror ? icon.width - 1 - x : x
        if (icon.cells[y * icon.width + sx]) cells[(top + y) * width + left + x] = ACCENT
      }
    }
    left += icon.width + ROW_GAP
  }
  return { width, height, cells }
}

/** The largest icon size that is no wider than `share` of the pattern. */
export function iconSizeFor<S extends number>(available: S[], width: number, share = 0.34): S | null {
  const fitting = available.filter((size) => size <= width * share)
  return fitting.length ? (Math.max(...fitting) as S) : null
}
