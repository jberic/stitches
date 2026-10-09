import { ALPHABETS } from '../data/alphabets'
import type { AlphabetSizeId } from '../data/alphabets/alphabet'
import { iconCells, iconSizes } from '../data/icons'
import { SCRIPT_FONTS, loadDisplayFont } from '../fonts'
import { maskFromCanvas } from './canvas'
import { cleanup, smoothEdges, type Grid } from './cleanup'
import { ACCENT, EFFECT_REACH, addEffect, type Effect, iconSizeFor, padColumns, placeIconBelow } from './compose'
import { coverage, stitchesFrom, trimRows, type Mask } from './downsample'
import { renderAlphabet } from './layouts/alphabet'
import { renderStackedBlock, type LetterBox } from './layouts/stackedBlock'
import { checkLegibility, type LegibilityCheck } from './legibility'
import { DEFAULT_CHOICES, MAX_ATTEMPTS, WORDMARK_RECIPE, recipeFor, resolveChoices, type Choices, type Recipe } from './recipe'
import type { Pattern } from './types'

export const MIN_WIDTH = 40
export const MAX_WIDTH = 100
export const DEFAULT_WIDTH = 50

/** Mask pixels per stitch. */
const SCALE = 8
/** Lowercase letters sit under the cap height, so lines need more rows to keep them readable. */
const MIN_ROWS = { upper: 11, lower: 15, mixed: 15 }
/** Empty columns each side of font lettering. */
const FONT_MARGIN = 0

/**
 * Script lowercase needs room: at 50 stitches, Shrikhand read well at about 9
 * stitches per letter ("Home sweet home") and lost its bowls at 6 ("Sunshine").
 */
export const MIN_SCRIPT_LETTER_WIDTH = 8

/** The narrowest line's median letter width, in stitches. Lines are letters sharing a top edge. */
export function narrowestLineLetterWidth(letters: LetterBox[]): number {
  const lines = new Map<number, number[]>()
  for (const box of letters) {
    const key = Math.round(box.y)
    lines.set(key, [...(lines.get(key) ?? []), box.width])
  }
  let narrowest = Infinity
  for (const widths of lines.values()) {
    const sorted = widths.sort((a, b) => a - b)
    narrowest = Math.min(narrowest, sorted[Math.floor(sorted.length / 2)])
  }
  return narrowest
}

/** Fails a script font whose lowercase is set too small to read. */
function checkScriptSize(check: LegibilityCheck, letters: LetterBox[], recipe: Recipe): LegibilityCheck {
  if (recipe.alphabet || recipe.letterCase === 'upper' || !SCRIPT_FONTS.includes(recipe.font)) return check
  if (narrowestLineLetterWidth(letters) >= MIN_SCRIPT_LETTER_WIDTH) return check
  return {
    ...check,
    ok: false,
    tooSmall: true,
    reasons: [...check.reasons, 'Letters too small for a script font'],
    penalty: check.penalty + 100,
  }
}
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
  /** The stitch alphabet size used, if any. */
  size?: AlphabetSizeId
  /** An ornamented alphabet's decoration, one cell per stitch. */
  accent?: Uint8Array
}

/** Draws the lettering for a recipe as a high-resolution mask, with each letter's box. */
/** Clear columns between a drop-cap initial and the words beside it. */
const INITIAL_GAP = 2

function unsupportedLettering(width: number, why: string): Lettering {
  const empty: Mask = { width: width * SCALE, height: SCALE, data: new Uint8Array(width * SCALE * SCALE) }
  return { mask: empty, letters: [], unsupported: why }
}

/**
 * A drop cap: the phrase's first letter drawn large from an initial alphabet,
 * and the rest set beside it in Sampler, left-aligned, in the case it was typed.
 * The whole block is centred.
 */
function drawInitial(lines: string[], width: number, recipe: Recipe): Lettering {
  // The large initial beside words in any Sampler size; if that's too wide, the
  // small initial beside small words, so it still stands taller than the text.
  const large = drawInitialAt(lines, width, recipe, 'regular', ['regular', 'small'])
  if (!large.unsupported) return large
  const small = drawInitialAt(lines, width, recipe, 'small', ['small'])
  return small.unsupported ? large : small
}

function drawInitialAt(
  lines: string[],
  width: number,
  recipe: Recipe,
  initialSize: AlphabetSizeId,
  bodySizes: AlphabetSizeId[],
): Lettering {
  const initial = ALPHABETS[recipe.alphabet!].sizes[initialSize]
  const char = lines[0].charAt(0).toLocaleUpperCase()
  const glyph = initial.glyphs.get(char)
  if (!glyph) return unsupportedLettering(width, `This initial has no "${char}"`)
  const capRows = glyph.rows.slice(0, initial.capRows)
  const rest = [lines[0].slice(1), ...lines.slice(1)]
  if (rest[0] === '' && rest.length > 1) rest.shift()
  const hasBody = rest.some((line) => line !== '')
  const body = hasBody
    ? renderAlphabet(rest, {
        width: width - glyph.width - INITIAL_GAP,
        scale: SCALE,
        alphabet: ALPHABETS.sampler,
        letterGap: recipe.letterGap,
        lineGap: recipe.lineGap + 1,
        maxScale: 1,
        align: 'left',
        sizes: bodySizes,
      })
    : null
  if (body && !body.ok)
    return unsupportedLettering(
      width,
      body.reason === 'missing' ? `Sampler has no "${body.char}"` : 'Too wide beside the initial',
    )

  const contentWidth = glyph.width + (body?.ok ? INITIAL_GAP + body.contentWidth : 0)
  const x0 = Math.floor((width - contentWidth) / 2)
  const rows = Math.max(capRows.length, body?.ok ? body.rows : 0)
  const mask: Mask = { width: width * SCALE, height: rows * SCALE, data: new Uint8Array(width * SCALE * rows * SCALE) }
  const accent = new Uint8Array(width * rows)
  capRows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '+') accent[y * width + x0 + x] = 1
      if (row[x] !== '#') continue
      for (let py = y * SCALE; py < (y + 1) * SCALE; py++)
        mask.data.fill(255, py * mask.width + (x0 + x) * SCALE, py * mask.width + (x0 + x + 1) * SCALE)
    }
  })
  const letters: LetterBox[] = [{ x: x0, y: 0, width: glyph.width, height: capRows.length }]
  if (body?.ok) {
    const bx = x0 + glyph.width + INITIAL_GAP
    const bodyWidth = body.mask.width / SCALE
    // Only the columns the words use: the body was laid out in all the space beside the initial.
    const used = body.contentWidth
    for (let py = 0; py < body.mask.height; py++) {
      const from = py * body.mask.width
      mask.data.set(body.mask.data.subarray(from, from + used * SCALE), py * mask.width + bx * SCALE)
    }
    for (let y = 0; y < body.rows; y++) {
      for (let x = 0; x < used; x++) if (body.accent[y * bodyWidth + x]) accent[y * width + bx + x] = 1
    }
    letters.push(...body.letters.map((box) => ({ ...box, x: box.x + bx })))
  }
  return { mask, letters, size: initialSize, accent }
}

function drawLettering(upper: string[], width: number, recipe: Recipe): Lettering {
  if (recipe.alphabet && ALPHABETS[recipe.alphabet].initial) return drawInitial(upper, width, recipe)
  if (recipe.alphabet) {
    const result = renderAlphabet(upper, {
      width,
      scale: SCALE,
      alphabet: ALPHABETS[recipe.alphabet],
      letterGap: recipe.letterGap,
      lineGap: recipe.lineGap + 1,
    })
    if (!result.ok) {
      return unsupportedLettering(
        width,
        result.reason === 'missing' ? `This alphabet has no "${result.char}"` : 'Too wide for this alphabet',
      )
    }
    return { mask: result.mask, letters: result.letters, size: result.size, accent: result.accent }
  }
  // Fonts keep a margin of fabric at the sides, so the words don't fill the
  // pattern edge to edge.
  const inner = width - FONT_MARGIN * 2
  const { canvas, letters } = renderStackedBlock(upper, {
    width: inner,
    scale: SCALE,
    font: recipe.font,
    letterAspect: recipe.letterAspect,
    letterGap: recipe.letterGap,
    lineGap: recipe.lineGap,
    minLineRows: MIN_ROWS[recipe.letterCase],
  })
  return {
    mask: padSides(maskFromCanvas(canvas), FONT_MARGIN * SCALE),
    letters: letters.map((box) => ({ ...box, x: box.x + FONT_MARGIN })),
  }
}

/** Adds empty columns of mask pixels on both sides. */
function padSides(mask: Mask, pad: number): Mask {
  const width = mask.width + pad * 2
  const data = new Uint8Array(width * mask.height)
  for (let y = 0; y < mask.height; y++) data.set(mask.data.subarray(y * mask.width, (y + 1) * mask.width), y * width + pad)
  return { width, height: mask.height, data }
}

/**
 * Adds the accent-thread parts (the effect, then the icon) to the finished lettering.
 * Runs after the legibility check, so it can't hide a problem with the letters.
 */
function decorate(lettering: Grid, recipe: Recipe): Grid {
  let grid = addEffect(lettering, recipe.effect)
  if (recipe.icon) {
    const gap = 1
    const size = iconSizeFor(iconSizes(recipe.icon), grid.width)
    if (size) grid = placeIconBelow(grid, iconCells(recipe.icon, size), gap)
  }
  return grid
}

/**
 * The effect actually stitched. A stitch alphabet's one-stitch small size, or
 * an effect its letters don't suit, takes the shadow instead, which reads on
 * anything. The pattern records this, so the caption and key stay true.
 */
function stitchedEffect(recipe: Recipe, size: AlphabetSizeId | undefined): Effect {
  if (!recipe.alphabet || recipe.effect === 'none' || recipe.effect === 'shadow' || recipe.effect === 'assisi')
    return recipe.effect
  const suits = (ALPHABETS[recipe.alphabet].effects as Effect[]).includes(recipe.effect)
  return size === 'regular' && suits ? recipe.effect : 'shadow'
}

/** Draws, downsamples, tidies and checks one recipe. Deterministic for the same inputs. */
export async function renderRecipe(lines: string[], width: number, recipe: Recipe, seed = ''): Promise<Rendered> {
  await loadDisplayFont(recipe.font)
  const cased = lines.map((line) =>
    recipe.letterCase === 'upper' ? line.toLocaleUpperCase() : recipe.letterCase === 'lower' ? line.toLocaleLowerCase() : line,
  )
  // The lettering leaves room at its sides for the effect to reach into.
  // Assisi alphabets always end in the Assisi panel, so plan its room from the start.
  const planned: Recipe = recipe.alphabet && ALPHABETS[recipe.alphabet].reversed ? { ...recipe, effect: 'assisi' } : recipe
  const reach = EFFECT_REACH[planned.effect]
  const inner = width - reach.left - reach.right
  const { mask, letters, unsupported, size, accent } = drawLettering(cased, inner, recipe)
  if (unsupported) return unsupportedResult(lines, cased, width, recipe, seed, unsupported)
  const cover = coverage(mask, SCALE)
  const raw: Grid = { width: inner, height: cover.length / inner, cells: stitchesFrom(cover, recipe.threshold) }
  // Stitch alphabets are drawn exactly on the grid, so tidy-up would only do
  // harm (it took the one-stitch dot off a small i). Font edges get evened out.
  const tidy = recipe.alphabet ? raw : smoothEdges(cleanup(raw, cover), cover)
  const legible = checkLegibility(mask, SCALE, tidy, cover, letters)
  const check = checkScriptSize(legible, letters, recipe)
  // Ornaments join after the check: they decorate the letters, they don't make them readable.
  const withOrnaments = tidy.cells.slice()
  if (accent) accent.forEach((on, i) => on && !withOrnaments[i] && (withOrnaments[i] = ACCENT))
  const trimmed = trimRows(withOrnaments, inner)
  const stitched: Recipe = { ...recipe, effect: stitchedEffect(planned, size) }
  const left = EFFECT_REACH[stitched.effect].left
  const lettering = padColumns({ width: inner, height: trimmed.height, cells: trimmed.cells }, left, width - inner - left)
  const { cells, height } = decorate(lettering, stitched)

  return {
    pattern: {
      width,
      height,
      cells,
      meta: { text: lines.join(' '), lines: cased, font: recipe.font, seed, recipe: stitched },
    },
    raw,
    check,
  }
}

/** An attempt the style can't draw at all; it fails the check so the next attempt uses the font. */
function unsupportedResult(lines: string[], cased: string[], width: number, recipe: Recipe, seed: string, why: string): Rendered {
  const cells = new Uint8Array(width)
  return {
    pattern: {
      width,
      height: 1,
      cells,
      meta: { text: lines.join(' '), lines: cased, font: recipe.font, seed, recipe },
    },
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
  let best: { rendered: Rendered } | null = null
  const resolved = resolveChoices(lines, choices)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const recipe = recipeFor(seed, attempt, attempts[attempts.length - 1], resolved)
    const rendered = await renderRecipe(lines, width, recipe, seed)
    attempts.push({ recipe, check: rendered.check })
    if (!best || rendered.check.penalty < best.rendered.check.penalty) best = { rendered }
    if (rendered.check.ok) break
  }

  const { rendered } = best!
  return {
    pattern: rendered.pattern,
    // As stitched, so "Generate again" compares against what is on screen.
    recipe: rendered.pattern.meta.recipe,
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
