import { ALPHABETS } from '../data/alphabets'
import { iconCells, iconSizes } from '../data/icons'
import { loadDisplayFont } from '../fonts'
import { maskFromCanvas } from './canvas'
import { cleanup, type Grid } from './cleanup'
import { addShadow, iconSizeFor, placeIconBelow } from './compose'
import { coverage, stitchesFrom, trimRows, type Mask } from './downsample'
import { renderAlphabet } from './layouts/alphabet'
import { renderStackedBlock, type LetterBox } from './layouts/stackedBlock'
import { renderWavy } from './layouts/wavy'
import { checkLegibility, type LegibilityCheck } from './legibility'
import { DEFAULT_CHOICES, MAX_ATTEMPTS, WORDMARK_RECIPE, recipeFor, type Choices, type Recipe } from './recipe'
import type { Pattern } from './types'
import { warpMask } from './warp'

export const MIN_WIDTH = 40
export const MAX_WIDTH = 100
export const DEFAULT_WIDTH = 50

/** Mask pixels per stitch. */
const SCALE = 8
/** Lowercase letters sit under the cap height, so lines need more rows to keep them readable. */
const MIN_ROWS = { upper: 11, lower: 15 }
/** Narrower than this per letter (gap excluded) and the strokes can't hold their shape. */
const MIN_STITCHES_PER_LETTER = 4

export interface Rendered {
  pattern: Pattern
  /** The grid straight after downsampling, before tidy-up (for the dev page). */
  raw: Grid
  check: LegibilityCheck
}

export interface Attempt {
  recipe: Recipe
  check: LegibilityCheck
}

export interface GenerateResult {
  pattern: Pattern
  recipe: Recipe
  check: LegibilityCheck
  /** Every attempt in order, the chosen one included. */
  attempts: Attempt[]
  /** Set when the longest word is too long for this width to stay readable. */
  tooNarrow?: { word: string; suggestedWidth: number | null }
}

interface Lettering {
  mask: Mask
  letters: LetterBox[]
  /** Set when a stitch alphabet can't draw this phrase. */
  unsupported?: string
}

function toPixels(wave: NonNullable<Recipe['wave']>) {
  return { ax: wave.ax * SCALE, wy: wave.wy * SCALE, ay: wave.ay * SCALE, wx: wave.wx * SCALE, px: wave.px, py: wave.py }
}

/** Draws the lettering for a recipe as a high-resolution mask, with each letter's box. */
function drawLettering(upper: string[], width: number, recipe: Recipe): Lettering {
  if (recipe.alphabet) {
    const wave = recipe.layout === 'wavy' ? recipe.wave : null
    const result = renderAlphabet(upper, {
      width,
      scale: SCALE,
      alphabet: ALPHABETS[recipe.alphabet],
      letterGap: recipe.letterGap,
      lineGap: recipe.lineGap + 1 + (wave ? 1 : 0),
      // Gentle steps: at most two rows up or down, over roughly a word.
      wave: wave ? { amplitude: Math.min(2, wave.ay), length: Math.max(24, wave.wx), phase: wave.py } : undefined,
    })
    if (!result.ok) {
      const empty: Mask = { width: width * SCALE, height: SCALE, data: new Uint8Array(width * SCALE * SCALE) }
      const why = result.reason === 'missing' ? `This alphabet has no "${result.char}"` : 'Too wide for this alphabet'
      return { mask: empty, letters: [], unsupported: why }
    }
    return { mask: result.mask, letters: result.letters }
  }
  if (recipe.layout === 'wavy' && recipe.wave) {
    const wave = recipe.wave
    const { canvas, letters } = renderWavy(upper, {
      width,
      scale: SCALE,
      font: recipe.font,
      letterAspect: recipe.letterAspect,
      letterGap: recipe.letterGap,
      lineGap: recipe.lineGap,
      reach: { x: wave.ax, y: wave.ay },
      minCapRows: MIN_ROWS[recipe.letterCase],
    })
    return { mask: warpMask(maskFromCanvas(canvas), toPixels(wave)), letters }
  }
  const { canvas, letters } = renderStackedBlock(upper, {
    width,
    scale: SCALE,
    font: recipe.font,
    letterAspect: recipe.letterAspect,
    letterGap: recipe.letterGap,
    lineGap: recipe.lineGap,
    minLineRows: MIN_ROWS[recipe.letterCase],
  })
  return { mask: maskFromCanvas(canvas), letters }
}

/**
 * Adds the accent-thread parts (shadow, then icon) to the finished lettering.
 * Runs after the legibility check, so it can't hide a problem with the letters.
 */
function decorate(lettering: Grid, recipe: Recipe): Grid {
  let grid = recipe.shadow ? addShadow(lettering) : lettering
  if (recipe.icon) {
    const size = iconSizeFor(iconSizes(recipe.icon), grid.width)
    if (size) grid = placeIconBelow(grid, iconCells(recipe.icon, size), recipe.layout === 'wavy' ? 2 : 1)
  }
  return grid
}

/** Draws, downsamples, tidies and checks one recipe. Deterministic for the same inputs. */
export async function renderRecipe(lines: string[], width: number, recipe: Recipe, seed = ''): Promise<Rendered> {
  await loadDisplayFont(recipe.font)
  const cased = lines.map((line) => (recipe.letterCase === 'upper' ? line.toLocaleUpperCase() : line.toLocaleLowerCase()))
  const { mask, letters, unsupported } = drawLettering(cased, width, recipe)
  if (unsupported) return unsupportedResult(lines, cased, width, recipe, seed, unsupported)
  const cover = coverage(mask, SCALE)
  const raw: Grid = { width, height: cover.length / width, cells: stitchesFrom(cover, recipe.threshold) }
  const tidy = cleanup(raw, cover)
  const check = checkLegibility(mask, SCALE, tidy, cover, letters, recipe.layout === 'wavy')
  const trimmed = trimRows(tidy.cells, width)
  const { cells, height } = decorate({ width, height: trimmed.height, cells: trimmed.cells }, recipe)

  return {
    pattern: {
      width,
      height,
      cells,
      meta: { text: lines.join(' '), lines: cased, layout: recipe.layout, font: recipe.font, seed, recipe },
    },
    raw,
    check,
  }
}

/** An attempt the style can't draw at all; it fails the check so the next attempt uses the font. */
function unsupportedResult(lines: string[], cased: string[], width: number, recipe: Recipe, seed: string, why: string): Rendered {
  const cells = new Uint8Array(width)
  return {
    pattern: { width, height: 1, cells, meta: { text: lines.join(' '), lines: cased, layout: recipe.layout, font: recipe.font, seed, recipe } },
    raw: { width, height: 1, cells },
    check: {
      ok: false,
      reasons: [why],
      penalty: Infinity,
      tooHeavy: false,
      tooLight: false,
      unsupported: true,
      metrics: {
        inkKept: 0,
        inkPrecision: 0,
        holes: { drawing: 0, lost: 0 },
        countersLost: 0,
        solidLetters: 0,
        brokenLetters: 0,
        letterFill: [],
        shapes: { drawing: 0, stitched: 0 },
      },
    },
  }
}

/**
 * Generates a readable pattern for a seed. If the legibility check fails, the
 * next recipe from the same seed is tried, up to MAX_ATTEMPTS. If none pass,
 * the least-bad result is returned with its failed check.
 */
export async function generatePattern({
  lines,
  width,
  seed,
  choices = DEFAULT_CHOICES,
}: {
  lines: string[]
  width: number
  seed: string
  choices?: Choices
}): Promise<GenerateResult> {
  const attempts: Attempt[] = []
  let best: { rendered: Rendered; recipe: Recipe } | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const recipe = recipeFor(seed, attempt, attempts[attempts.length - 1], choices)
    const rendered = await renderRecipe(lines, width, recipe, seed)
    attempts.push({ recipe, check: rendered.check })
    if (!best || rendered.check.penalty < best.rendered.check.penalty) best = { rendered, recipe }
    if (rendered.check.ok) break
  }

  const { rendered, recipe } = best!
  return {
    pattern: rendered.pattern,
    recipe,
    check: rendered.check,
    attempts,
    tooNarrow: narrowness(lines, width),
  }
}

/** The site's own wordmark: a fixed recipe, no retries. */
export async function renderWordmark(lines: string[], width: number): Promise<Pattern> {
  return (await renderRecipe(lines, width, WORDMARK_RECIPE)).pattern
}

function narrowness(lines: string[], width: number): GenerateResult['tooNarrow'] {
  const longest = lines.reduce((a, b) => ([...b].length > [...a].length ? b : a), '')
  const letters = [...longest].length
  const perLetter = (width - (letters - 1)) / letters
  if (perLetter >= MIN_STITCHES_PER_LETTER) return undefined
  const needed = Math.ceil(letters * MIN_STITCHES_PER_LETTER + (letters - 1))
  return { word: longest, suggestedWidth: needed <= MAX_WIDTH ? needed : null }
}

/**
 * For a phrase that isn't readable at this width: the narrowest wider width
 * (in steps of 2, up to 30 stitches wider) where the same seed gives a
 * readable pattern, or null.
 */
export async function findReadableWidth(
  lines: string[],
  seed: string,
  from: number,
  choices: Choices = DEFAULT_CHOICES,
): Promise<number | null> {
  for (let width = from + 2; width <= Math.min(MAX_WIDTH, from + 30); width += 2) {
    const result = await generatePattern({ lines, width, seed, choices })
    if (result.check.ok) return width
  }
  return null
}
