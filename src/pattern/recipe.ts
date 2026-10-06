import { ALPHABETS, ALPHABET_IDS, type AlphabetId } from '../data/alphabets'
import { ICON_LABELS, ICON_SETS, type IconName } from '../data/icons'
import { CAPITALS_ONLY, DISPLAY_FONTS, type DisplayFont } from '../fonts'
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
  /** Wavy only: the warp, in stitches. */
  wave: StitchWave | null
  /** A motif in the accent thread, or none. */
  icon: IconName | null
  /** A tonal drop shadow in the accent thread. */
  shadow: boolean
  letterCase: TextCase
  /** Letters drawn from a stitch alphabet instead of the font, or null for the font. */
  alphabet: AlphabetId | null
}

/** The person's choice: keep the case they typed, or force capitals or lowercase. */
export type LetterCase = 'typed' | 'upper' | 'lower'
/** The case the pattern is actually stitched in. */
export type TextCase = 'upper' | 'lower' | 'mixed'

/** What the person chose; everything else in a recipe comes from the seed. */
export interface Choices {
  motif: Motif
  letterCase: LetterCase
}

/** Choices with the case worked out for a particular phrase. */
export interface ResolvedChoices {
  motif: Motif
  letterCase: TextCase
}

/** The case a phrase is stitched in. "As typed" with only capitals (or only lowercase) is just that. */
export function textCase(lines: string[], choice: LetterCase): TextCase {
  if (choice !== 'typed') return choice
  const text = lines.join(' ')
  const hasLower = text !== text.toLocaleUpperCase()
  const hasUpper = text !== text.toLocaleLowerCase()
  return hasLower && hasUpper ? 'mixed' : hasLower ? 'lower' : 'upper'
}

export function resolveChoices(lines: string[], choices: Choices): ResolvedChoices {
  return { motif: choices.motif, letterCase: textCase(lines, choices.letterCase) }
}

/** A warp in stitch units (see pattern/warp.ts for what each part does). */
export interface StitchWave {
  ax: number
  wy: number
  ay: number
  wx: number
  px: number
  py: number
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

/**
 * The threshold at which each font rescued the hardest test phrases (long
 * words with small counters: Butterfly, Wonderful, Happy birthday).
 */
const RESCUE_THRESHOLDS: Record<DisplayFont, number> = {
  Chango: 0.62,
  Shrikhand: 0.5,
  'Bagel Fat One': 0.46,
  'Rubik Mono One': 0.46,
}

const THRESHOLD_STEP = 0.07
const THRESHOLD_LIMITS: [number, number] = [0.38, 0.66]
/** How much a too-heavy wavy attempt calms the warp. */
const WAVE_CALM = 0.6

const ALL_ICONS: IconName[] = [...ICON_SETS.nature, ...ICON_SETS.food]

/** What kind of icon a pattern may have. "any" lets the seed decide, including none. */
export type Motif = 'any' | 'nature' | 'food' | 'none'
export const MOTIFS: Motif[] = ['any', 'nature', 'food', 'none']
export const DEFAULT_MOTIF: Motif = 'any'
export const DEFAULT_CHOICES: Choices = { motif: DEFAULT_MOTIF, letterCase: 'typed' }

/** Half of all seeds use a stitch alphabet; the rest a display font. Its own stream, like the icon. */
function alphabetFor(seed: string): AlphabetId | null {
  const rng = randomFor('alphabet', seed)
  return rng() < 0.5 ? pick(rng, ALPHABET_IDS) : null
}

/** Fonts that can draw the case: any lowercase rules out capitals-only fonts. */
function fontsFor(letterCase: TextCase): readonly DisplayFont[] {
  return letterCase === 'upper' ? DISPLAY_FONTS : DISPLAY_FONTS.filter((f) => !CAPITALS_ONLY.includes(f))
}

/**
 * The icon for a seed, from its own random stream: changing the motif only
 * ever changes the icon, never the font, layout or shadow.
 */
function iconFor(seed: string, motif: Motif): IconName | null {
  const rng = randomFor('icon', seed)
  if (motif === 'none') return null
  if (motif === 'any') return rng() < 0.7 ? pick(rng, ALL_ICONS) : null
  return pick(rng, ICON_SETS[motif] as readonly IconName[])
}

/**
 * Layout, warp, icon and shadow come from their own random stream, so adding
 * them didn't change the font and letter shape of seeds made before.
 */
function styleFor(seed: string): Pick<Recipe, 'layout' | 'wave' | 'shadow'> {
  const rng = randomFor('style', seed)
  const layout = rng() < 0.5 ? 'stacked-block' : 'wavy'
  // Long, gentle waves: about one bend across the pattern. Shorter ones shear
  // two-stitch strokes into slivers, because neighbouring columns move apart.
  const wave: StitchWave = {
    ax: round2(between(rng, 0.3, 0.8)),
    wy: round2(between(rng, 36, 64)),
    ay: round2(between(rng, 0.6, 1.4)),
    wx: round2(between(rng, 44, 80)),
    px: round2(between(rng, 0, Math.PI * 2)),
    py: round2(between(rng, 0, Math.PI * 2)),
  }
  const shadow = rng() < 0.3
  return { layout, wave: layout === 'wavy' ? wave : null, shadow }
}

function calmer(wave: StitchWave | null): StitchWave | null {
  return wave && { ...wave, ax: round2(wave.ax * WAVE_CALM), ay: round2(wave.ay * WAVE_CALM) }
}

/**
 * The recipe for a seed and attempt. Attempt 0 is the style a seed is known by.
 * Retries react to why the last attempt failed: too heavy (holes filled in,
 * letters solid or merged) raises the threshold and tightens letter spacing;
 * too light (strokes broke, ink lost) lowers it. Attempts 1 and 2 keep the
 * font and layout; 3 and 4 are stacked block in two different fallback fonts.
 * Every step depends only on
 * the seed and earlier results, so the outcome is still deterministic.
 */
export function recipeFor(
  seed: string,
  attempt = 0,
  previous?: PreviousAttempt,
  choices: ResolvedChoices = { motif: DEFAULT_MOTIF, letterCase: 'upper' },
): Recipe {
  const rng = randomFor('recipe', seed, 0)
  // One draw either way, so the rest of the recipe doesn't shift with the case.
  const font = pick(rng, fontsFor(choices.letterCase))
  const base: Recipe = {
    font,
    letterAspect: round2(between(rng, 1.25, 1.9)),
    letterGap: rng() < 0.75 ? 1 : 2,
    lineGap: rng() < 0.7 ? 1 : 2,
    threshold: round2(between(rng, ...THRESHOLDS[font])),
    ...styleFor(seed),
    icon: iconFor(seed, choices.motif),
    letterCase: choices.letterCase,
    alphabet: alphabetFor(seed),
  }
  if (base.layout === 'wavy') base.lineGap += 1
  if (attempt === 0) return base

  // The alphabet can't draw this phrase (a missing character, or too wide even
  // in its small size): keep the style, use the font.
  if (previous?.check.unsupported) return { ...(previous.recipe ?? base), alphabet: null }

  // The last two chances are stacked block, which passed every test phrase,
  // with tight spacing and each font's measured rescue threshold. A wavy seed
  // first tries its own font, so its style changes as little as possible.
  if (attempt >= 3) {
    const others = FALLBACK_FONTS.filter((f) => f !== font && fontsFor(choices.letterCase).includes(f))
    const fonts = base.layout === 'wavy' ? [font, ...others] : others
    const fallback = fonts[attempt - 3]
    return {
      ...base,
      layout: 'stacked-block',
      wave: null,
      alphabet: null,
      font: fallback,
      letterGap: 1,
      lineGap: Math.min(2, base.lineGap),
      threshold: RESCUE_THRESHOLDS[fallback],
    }
  }

  const from = previous?.recipe ?? base
  // With no result to go on, assume the commonest failure: too heavy.
  const tooLight = previous ? previous.check.tooLight && !previous.check.tooHeavy : false
  const threshold = from.threshold + (tooLight ? -THRESHOLD_STEP : THRESHOLD_STEP)
  return {
    ...from,
    letterGap: tooLight ? from.letterGap : 1,
    threshold: round2(Math.min(THRESHOLD_LIMITS[1], Math.max(THRESHOLD_LIMITS[0], threshold))),
    // A warp that bent letters into each other or filled them in gets calmer.
    wave: tooLight ? from.wave : calmer(from.wave),
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
  wave: null,
  icon: null,
  shadow: false,
  letterCase: 'upper',
  alphabet: null,
}

/** Plain-words name for a style, so people can say what they liked. */
export function describeRecipe(recipe: Recipe): string {
  const stacked = recipe.layout === 'stacked-block'
  const shape = !stacked
    ? null
    : recipe.letterAspect >= 1.7
      ? 'tall letters'
      : recipe.letterAspect <= 1.35
        ? 'squat letters'
        : null
  const spacing = stacked && recipe.letterGap > 1 ? 'airy' : null
  const extras = [recipe.shadow ? 'a shadow' : null, recipe.icon ? `a ${ICON_LABELS[recipe.icon]}` : null].filter(Boolean)
  const withPart = extras.length ? `with ${extras.join(' and ')}` : null
  const lower = recipe.letterCase === 'lower' ? 'lowercase' : null
  const letters = recipe.alphabet ? `${ALPHABETS[recipe.alphabet].name} stitch letters` : recipe.font
  const fontShape = recipe.alphabet ? null : shape
  return [stacked ? 'Stacked block' : 'Wavy', letters, lower, fontShape, spacing, withPart].filter(Boolean).join(' · ')
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * A new seed whose style visibly differs from the current one: a different
 * font or a different layout, and never the same icon twice in a row.
 */
export function seedWithNewStyle(
  current: Recipe | undefined,
  makeSeed: () => string = newSeed,
  choices: Choices = DEFAULT_CHOICES,
): string {
  for (let i = 0; i < 30; i++) {
    const seed = makeSeed()
    if (!current) return seed
    // Same phrase, so the same case as the pattern on screen.
    const next = recipeFor(seed, 0, undefined, { motif: choices.motif, letterCase: current.letterCase })
    const letterform = (r: Recipe) => r.alphabet ?? r.font
    const newLook = letterform(next) !== letterform(current) || next.layout !== current.layout
    if (newLook && (next.icon === null || next.icon !== current.icon)) return seed
  }
  return makeSeed()
}
