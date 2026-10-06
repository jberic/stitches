import type { Grid } from './cleanup'

/**
 * Steps that add colour 2 (the accent thread) to a finished lettering grid.
 * They run after the legibility check, so they can never hide a problem with
 * the letters themselves.
 */

export const LETTERING = 1
export const ACCENT = 2

/**
 * A tonal drop shadow: every lettering stitch casts one stitch down and to the
 * right, wherever that cell is empty. Adds a row so the bottom shadow fits.
 */
export function addShadow(grid: Grid): Grid {
  const width = grid.width
  const height = grid.height + 1
  const cells = new Uint8Array(width * height)
  cells.set(grid.cells)
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < width - 1; x++) {
      if (grid.cells[y * width + x] !== LETTERING) continue
      const target = (y + 1) * width + x + 1
      if (cells[target] === 0) cells[target] = ACCENT
    }
  }
  return { width, height, cells }
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
  return fitting.length ? Math.max(...fitting) as S : null
}
