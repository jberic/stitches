import type { Grid } from './cleanup'
import { coverage, type Mask } from './downsample'
import type { LetterBox } from './layouts/stackedBlock'

export interface LegibilityCheck {
  ok: boolean
  /** Plain-words reasons for a failure, for the dev page. */
  reasons: string[]
  /** Lower is better. Used to pick the least-bad result if every attempt fails. */
  penalty: number
  /** Too much stitched: holes filled, letters solid or run together. A higher threshold helps. */
  tooHeavy: boolean
  /** Too little stitched: strokes broke apart or ink was lost. A lower threshold helps. */
  tooLight: boolean
  /** The style can't draw this phrase at all (a stitch alphabet missing a character, or too wide). */
  unsupported?: boolean
  /** Script lowercase set too small to read; a non-script font helps, a threshold doesn't. */
  tooSmall?: boolean
  metrics: {
    inkKept: number
    inkPrecision: number
    holes: { drawing: number; lost: number }
    /** Letters whose open space (notches, bowls, the arms of E) filled in. */
    countersLost: number
    /** Letters stitched as a solid block although the drawing had shape inside the box. */
    solidLetters: number
    /** Letters stitched in more pieces than they were drawn in. */
    brokenLetters: number
    /** Per letter: share of the box stitched, and the drawing's average ink in the box. For tuning. */
    letterFill: { fill: number; drawn: number }[]
    shapes: { drawing: number; stitched: number }
  }
}

const MIN_INK_KEPT = 0.8
/** A letter box this full of stitches reads as a block, not a letter... */
const SOLID_FILL = 0.95
/**
 * ...unless the drawing really was that solid. Measured over 360 renders: plain
 * I's draw at 0.93 and up, the N that turned into a block at 0.84.
 */
const SOLID_DRAWN = 0.9
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
export function checkLegibility(
  mask: Mask,
  scale: number,
  grid: Grid,
  cover: Float32Array,
  letters: LetterBox[] = [],
  /** Wavy letters are meant to touch, so merged marks don't count against them. */
  allowMerge = false,
): LegibilityCheck {
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
  const merged = Math.min(drawingShapes - stitchedShapes, allowMerge ? 0 : Infinity)
  const countersLost = letters.reduce((n, box) => n + (letterLostCounter(sub, ratio, grid, box) ? 1 : 0), 0)
  const letterFill = letters.map((box) => fillOf(grid, cover, box))
  const solidLetters = letterFill.filter((l) => l.fill >= SOLID_FILL && l.drawn < SOLID_DRAWN).length
  // Per letter, so a merge between two letters can't cancel out a break inside one.
  const brokenLetters = letters.filter(
    (box) =>
      countShapes(crop(grid, box, 1), 1) >
      countShapes(crop(sub, { x: box.x * ratio, y: box.y * ratio, width: box.width * ratio, height: box.height * ratio }, 1), MIN_SHAPE_SUBCELLS),
  ).length

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
  if (countersLost > 0) {
    reasons.push(
      countersLost === 1 ? 'The open space in a letter filled in' : `The open space in ${countersLost} letters filled in`,
    )
    penalty += countersLost * 3
  }
  if (solidLetters > 0) {
    reasons.push(solidLetters === 1 ? 'A letter turned into a solid block' : `${solidLetters} letters turned into solid blocks`)
    penalty += solidLetters * 3
  }
  if (brokenLetters > 0) {
    reasons.push(brokenLetters === 1 ? 'A letter broke into pieces' : `${brokenLetters} letters broke into pieces`)
    penalty += brokenLetters * 2
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
    tooHeavy: holesLost > 0 || countersLost > 0 || solidLetters > 0 || merged > 0 || inkPrecision < MIN_PRECISION,
    tooLight: merged < 0 || brokenLetters > 0 || inkKept < MIN_INK_KEPT,
    metrics: {
      inkKept,
      inkPrecision,
      holes: { drawing: drawingHoles.length, lost: holesLost },
      countersLost,
      solidLetters,
      brokenLetters,
      letterFill,
      shapes: { drawing: drawingShapes, stitched: stitchedShapes },
    },
  }
}

/** The part of a grid inside a box (in that grid's own cells), clipped to the grid. */
function crop(grid: Grid, box: LetterBox, scale: number): Grid {
  const x0 = Math.max(0, box.x * scale)
  const y0 = Math.max(0, box.y * scale)
  const x1 = Math.min(grid.width, (box.x + box.width) * scale)
  const y1 = Math.min(grid.height, (box.y + box.height) * scale)
  const width = Math.max(0, x1 - x0)
  const height = Math.max(0, y1 - y0)
  const cells = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) cells.set(grid.cells.subarray((y0 + y) * grid.width + x0, (y0 + y) * grid.width + x0 + width), y * width)
  return { width, height, cells }
}

/** How much of a letter's box is stitched, and how much ink the drawing had there. */
function fillOf(grid: Grid, cover: Float32Array, box: LetterBox) {
  let stitched = 0
  let drawn = 0
  for (let y = box.y; y < box.y + box.height; y++)
    for (let x = box.x; x < box.x + box.width; x++) {
      const i = y * grid.width + x
      stitched += grid.cells[i]
      drawn += cover[i]
    }
  const area = box.width * box.height
  return { fill: stitched / area, drawn: drawn / area }
}

/**
 * True if some stitch-sized patch of background inside a letter's box (in the
 * drawing) ended up fully stitched over. That's what turns an N into a block:
 * it has no closed hole to lose, only open notches.
 */
function letterLostCounter(sub: Grid, ratio: number, grid: Grid, box: LetterBox): boolean {
  const open = new Uint8Array(box.width * box.height)
  for (let cy = 0; cy < box.height; cy++) {
    for (let cx = 0; cx < box.width; cx++) {
      let empty = true
      for (let sy = 0; sy < ratio && empty; sy++)
        for (let sx = 0; sx < ratio && empty; sx++) {
          const x = (box.x + cx) * ratio + sx
          const y = (box.y + cy) * ratio + sy
          if (sub.cells[y * sub.width + x]) empty = false
        }
      if (!empty) open[cy * box.width + cx] = 1
    }
  }
  // Open patches are the zeros here, so they group edge-to-edge like other background.
  const region: Grid = { width: box.width, height: box.height, cells: open }
  for (const area of components(region, false)) {
    const stillOpen = area.cells.some((i) => {
      const x = box.x + (i % box.width)
      const y = box.y + Math.floor(i / box.width)
      return grid.cells[y * grid.width + x] === 0
    })
    if (!stillOpen) return true
  }
  return false
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
