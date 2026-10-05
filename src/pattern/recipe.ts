import { DISPLAY_FONTS, type DisplayFont } from '../fonts'
import { between, newSeed, pick, randomFor } from './random'
import type { LegibilityCheck } from './legibility'
import type { LayoutId } from './types'

/** Everything that decides how a phrase looks. Derived from the seed, never stored. */
export interface Recipe {
  layout: LayoutId
  font: DisplayFont
  /** Letter height as a multiple of letter width. */
  letterAspect: number
  /** Clear columns between letters. */
  letterGap: number
  /** Empty rows between lines. */
  lineGap: number
  /** Share of a cell that must be ink for it to become a stitch. */
  threshold: number
}

export const MAX_ATTEMPTS = 5

/** What a retry knows about the attempt before it. */
export interface PreviousAttempt {
  recipe: Recipe
  check: LegibilityCheck
}

/**
 * Where each font's stitch threshold starts. Measured on the hardest test
 * phrases: Chango's counters only stay open from about 0.56, while Bagel Fat
 * One and Rubik Mono One keep theirs at 0.44 to 0.5 and lose strokes above.
 */
const THRESHOLDS: Record<DisplayFont, [number, number]> = {
  Chango: [0.5, 0.6],
  Shrikhand: [0.44, 0.54],
  'Bagel Fat One': [0.42, 0.52],
  'Rubik Mono One': [0.42, 0.52],
}

/** When the seed's font can't make a phrase readable, try these, sturdiest first. */
const FALLBACK_FONTS: DisplayFont[] = ['Bagel Fat One', 'Chango', 'Rubik Mono One', 'Shrikhand']

const THRESHOLD_STEP = 0.07
const THRESHOLD_LIMITS: [number, number] = [0.38, 0.66]

/**
 * The recipe for a seed and attempt. Attempt 0 is the style a seed is known by.
 * Retries react to why the last attempt failed: too heavy (holes filled in,
 * letters solid or merged) raises the threshold and tightens letter spacing;
 * too light (strokes broke, ink lost) lowers it. Attempts 1 and 2 keep the
 * font; 3 and 4 each try a different fallback font. Every step depends only on
 * the seed and earlier results, so the outcome is still deterministic.
 */
export function recipeFor(seed: string, attempt = 0, previous?: PreviousAttempt): Recipe {
  const rng = randomFor('recipe', seed, 0)
  const font = pick(rng, DISPLAY_FONTS)
  const base: Recipe = {
    layout: 'stacked-block',
    font,
    letterAspect: round2(between(rng, 1.25, 1.9)),
    letterGap: rng() < 0.75 ? 1 : 2,
    lineGap: rng() < 0.7 ? 1 : 2,
    threshold: round2(between(rng, ...THRESHOLDS[font])),
  }
  if (attempt === 0) return base

  // Last two chances: two different fallback fonts, so one font's weakness
  // can't sink both. The last one sits at the heavy-safe end of its range.
  if (attempt >= 3) {
    const fallbacks = FALLBACK_FONTS.filter((f) => f !== font)
    const fallback = fallbacks[attempt - 3]
    const [low, high] = THRESHOLDS[fallback]
    const threshold = attempt === 3 ? (low + high) / 2 : high + 0.02
    return { ...base, font: fallback, letterGap: attempt === 3 ? base.letterGap : 1, threshold: round2(threshold) }
  }

  const from = previous?.recipe ?? base
  // With no result to go on, assume the commonest failure: too heavy.
  const tooLight = previous ? previous.check.tooLight && !previous.check.tooHeavy : false
  const threshold = from.threshold + (tooLight ? -THRESHOLD_STEP : THRESHOLD_STEP)
  return {
    ...from,
    letterGap: tooLight ? from.letterGap : 1,
    threshold: round2(Math.min(THRESHOLD_LIMITS[1], Math.max(THRESHOLD_LIMITS[0], threshold))),
  }
}

/** The fixed look of the site's own wordmark. */
export const WORDMARK_RECIPE: Recipe = {
  layout: 'stacked-block',
  font: 'Chango',
  letterAspect: 1.5,
  letterGap: 1,
  lineGap: 1,
  threshold: 0.5,
}

/** Plain-words name for a style, so people can say what they liked. */
export function describeRecipe(recipe: Recipe): string {
  const shape = recipe.letterAspect >= 1.7 ? 'tall letters' : recipe.letterAspect <= 1.35 ? 'squat letters' : null
  const spacing = recipe.letterGap > 1 ? 'airy' : null
  return ['Stacked block', recipe.font, shape, spacing].filter(Boolean).join(' · ')
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** A new seed whose style starts from a different font, so "Generate again" always looks different. */
export function seedWithNewFont(currentFont: string | undefined, makeSeed: () => string = newSeed): string {
  for (let i = 0; i < 20; i++) {
    const seed = makeSeed()
    if (recipeFor(seed).font !== currentFont) return seed
  }
  return makeSeed()
}
