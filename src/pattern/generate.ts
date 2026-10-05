import { loadDisplayFont } from '../fonts'
import { maskFromCanvas } from './canvas'
import { cleanup, type Grid } from './cleanup'
import { coverage, stitchesFrom, trimRows, type Mask } from './downsample'
import { renderStackedBlock } from './layouts/stackedBlock'
import { checkLegibility, type LegibilityCheck } from './legibility'
import { MAX_ATTEMPTS, WORDMARK_RECIPE, recipeFor, type Recipe } from './recipe'
import type { Pattern } from './types'

export const MIN_WIDTH = 40
export const MAX_WIDTH = 80
export const DEFAULT_WIDTH = 50

/** Mask pixels per stitch. */
const SCALE = 8
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

/** Draws, downsamples, tidies and checks one recipe. Deterministic for the same inputs. */
export async function renderRecipe(lines: string[], width: number, recipe: Recipe, seed = ''): Promise<Rendered> {
  await loadDisplayFont(recipe.font)
  const upper = lines.map((line) => line.toLocaleUpperCase())
  const { canvas, letters } = renderStackedBlock(upper, {
    width,
    scale: SCALE,
    font: recipe.font,
    letterAspect: recipe.letterAspect,
    letterGap: recipe.letterGap,
    lineGap: recipe.lineGap,
  })
  const mask: Mask = maskFromCanvas(canvas)
  const cover = coverage(mask, SCALE)
  const raw: Grid = { width, height: cover.length / width, cells: stitchesFrom(cover, recipe.threshold) }
  const tidy = cleanup(raw, cover)
  const check = checkLegibility(mask, SCALE, tidy, cover, letters)
  const { cells, height } = trimRows(tidy.cells, width)

  return {
    pattern: {
      width,
      height,
      cells,
      meta: { text: lines.join(' '), lines: upper, layout: recipe.layout, font: recipe.font, seed, recipe },
    },
    raw,
    check,
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
}: {
  lines: string[]
  width: number
  seed: string
}): Promise<GenerateResult> {
  const attempts: Attempt[] = []
  let best: { rendered: Rendered; recipe: Recipe } | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const recipe = recipeFor(seed, attempt)
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
