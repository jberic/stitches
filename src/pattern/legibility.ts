import type { Grid } from './cleanup'
import { coverage, type Mask } from './downsample'

export interface LegibilityCheck {
  ok: boolean
  /** Plain-words reasons for a failure, for the dev page. */
  reasons: string[]
  /** Lower is better. Used to pick the least-bad result if every attempt fails. */
  penalty: number
  metrics: {
    inkKept: number
    inkPrecision: number
    holes: { drawing: number; lost: number }
    shapes: { drawing: number; stitched: number }
  }
}

const MIN_INK_KEPT = 0.8
const MIN_PRECISION = 0.65
/** Shapes smaller than this in the drawing (in half-stitch cells) are specks, not marks. */
const MIN_SHAPE_SUBCELLS = 3
/** Holes smaller than one stitch in the drawing can't be stitched anyway. */
const MIN_HOLE_SUBCELLS = 4

/**
 * Compares a stitched grid with the high-resolution drawing it came from.
 * Shapes and holes are counted on the drawing at half-stitch resolution, which
 * keeps real details but ignores hairlines too thin to stitch.
 */
export function checkLegibility(mask: Mask, scale: number, grid: Grid, cover: Float32Array): LegibilityCheck {
  let inkTotal = 0
  let inkOnStitches = 0
  let stitches = 0
  for (let i = 0; i < grid.cells.length; i++) {
    inkTotal += cover[i]
    if (grid.cells[i]) {
      inkOnStitches += cover[i]
      stitches++
    }
  }
  const inkKept = inkTotal > 0 ? inkOnStitches / inkTotal : 1
  const inkPrecision = stitches > 0 ? inkOnStitches / stitches : 0

  const half = Math.max(1, Math.floor(scale / 2))
  const subCover = coverage(mask, half)
  const sub: Grid = {
    width: Math.floor(mask.width / half),
    height: Math.floor(mask.height / half),
    cells: Uint8Array.from(subCover, (c) => (c >= 0.5 ? 1 : 0)),
  }
  const drawingShapes = countShapes(sub, MIN_SHAPE_SUBCELLS)
  const stitchedShapes = countShapes(grid, 1)
  const drawingHoles = holes(sub, MIN_HOLE_SUBCELLS)
  const enclosed = enclosedCells(grid)
  // A hole survives if any part of it is still enclosed background in the grid,
  // in the same place. Matching by position (not by count) means small sealed
  // notches along letter edges can't hide a counter that filled in.
  const ratio = scale / half
  const holesLost = drawingHoles.filter(
    (cells) =>
      !cells.some((i) => {
        const x = Math.floor((i % sub.width) / ratio)
        const y = Math.floor(Math.floor(i / sub.width) / ratio)
        return enclosed[y * grid.width + x] === 1
      }),
  ).length
  const merged = drawingShapes - stitchedShapes

  const reasons: string[] = []
  let penalty = 0
  if (inkKept < MIN_INK_KEPT) {
    reasons.push(`Too much of the lettering was lost (${Math.round(inkKept * 100)}% kept)`)
    penalty += (MIN_INK_KEPT - inkKept) * 20
  }
  if (inkPrecision < MIN_PRECISION) {
    reasons.push('Stitches spread outside the letters')
    penalty += (MIN_PRECISION - inkPrecision) * 20
  }
  if (holesLost > 0) {
    reasons.push(`${holesLost} ${holesLost === 1 ? 'hole' : 'holes'} in letters filled in`)
    penalty += holesLost * 3
  }
  if (merged > 0) {
    reasons.push(merged === 1 ? 'Two marks ran together' : `${merged} marks ran together`)
    penalty += merged * 3
  } else if (merged < 0) {
    reasons.push(merged === -1 ? 'A letter broke apart' : `Letters broke apart in ${-merged} places`)
    penalty += -merged * 2
  }

  return {
    ok: reasons.length === 0,
    reasons,
    penalty,
    metrics: {
      inkKept,
      inkPrecision,
      holes: { drawing: drawingHoles.length, lost: holesLost },
      shapes: { drawing: drawingShapes, stitched: stitchedShapes },
    },
  }
}

interface Component {
  cells: number[]
  touchesEdge: boolean
}

/**
 * Connected areas of ink (8-connected: stitches touching at corners join) or
 * of background (4-connected, so a diagonal step in a stroke still seals a hole).
 */
function components(grid: Grid, ink: boolean): Component[] {
  const { width, height, cells } = grid
  const seen = new Uint8Array(cells.length)
  const found: Component[] = []
  const stack: number[] = []
  for (let start = 0; start < cells.length; start++) {
    if (seen[start] || (cells[start] === 1) !== ink) continue
    const component: Component = { cells: [], touchesEdge: false }
    seen[start] = 1
    stack.push(start)
    while (stack.length) {
      const i = stack.pop()!
      component.cells.push(i)
      const x = i % width
      const y = (i - x) / width
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) component.touchesEdge = true
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || (!ink && dx && dy)) continue
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const j = ny * width + nx
          if (seen[j] || (cells[j] === 1) !== ink) continue
          seen[j] = 1
          stack.push(j)
        }
      }
    }
    found.push(component)
  }
  return found
}

export function countShapes(grid: Grid, minSize: number): number {
  return components(grid, true).filter((c) => c.cells.length >= minSize).length
}

/** Enclosed background areas (like the inside of an O), as lists of cell indexes. */
export function holes(grid: Grid, minSize: number): number[][] {
  return components(grid, false)
    .filter((c) => !c.touchesEdge && c.cells.length >= minSize)
    .map((c) => c.cells)
}

/** 1 for every background cell that is inside a hole. */
export function enclosedCells(grid: Grid): Uint8Array {
  const out = new Uint8Array(grid.cells.length)
  for (const cells of holes(grid, 1)) for (const i of cells) out[i] = 1
  return out
}
