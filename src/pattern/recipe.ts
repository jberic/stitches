import { DISPLAY_FONTS, type DisplayFont } from '../fonts'
import { between, pick, randomFor } from './random'
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

/** Attempts after this one may also change the font, if the first font keeps failing. */
const KEEP_FONT_UNTIL = 2

/**
 * The recipe for a seed and attempt. Attempt 0 is the style a seed is known by;
 * later attempts (after a failed legibility check) stay close to it at first,
 * with squatter letters, which is what usually rescues a filled-in counter.
 */
export function recipeFor(seed: string, attempt = 0): Recipe {
  const base = randomFor('recipe', seed, 0)
  const font = pick(base, DISPLAY_FONTS)
  const rng = randomFor('recipe', seed, attempt)
  const squash = attempt === 0 ? 0 : Math.min(0.5, attempt * 0.15)

  return {
    layout: 'stacked-block',
    // If the first font keeps failing, later attempts always try a different one.
    font: attempt <= KEEP_FONT_UNTIL ? font : pick(rng, DISPLAY_FONTS.filter((f) => f !== font)),
    letterAspect: round2(Math.max(1, between(rng, 1.25, 1.9) - squash)),
    letterGap: rng() < 0.75 ? 1 : 2,
    lineGap: rng() < 0.7 ? 1 : 2,
    threshold: round2(between(rng, 0.44, 0.56)),
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
