import { ALPHABETS, type AlphabetId } from '../data/alphabets'
import { ICON_PLURALS, ICON_SETS, iconPhrase, type IconName } from '../data/icons'
import { CAPITALS_ONLY, PATTERN_FONTS, SCRIPT_FONTS, type DisplayFont } from '../fonts'
import { between, newSeed, pick, randomFor } from './random'
import type { Effect } from './compose'
import type { LegibilityCheck } from './legibility'

/** Everything that decides how a phrase looks. Derived from the seed, never stored. */
export interface Recipe {
  font: DisplayFont
  /** Letter height as a multiple of letter width. */
  letterAspect: number
  /** Clear columns between letters. */
  letterGap: number
  /** Empty rows between lines. */
  lineGap: number
  /** Share of a cell that must be ink for it to become a stitch. */
  threshold: number
  /** A motif in the accent thread, or none. */
  icon: IconName | null
  /** Show the icon small and repeated in a row, instead of once. Only icons drawn at 7 stitches. */
  iconRow: boolean
  /** How the accent thread dresses the letters (see compose.ts). */
  effect: Effect
  letterCase: TextCase
  /**
   * Set when a capitals-only alphabet (Slab) sets a phrase in capitals that
   * wasn't typed that way: the case it had, so a fallback font can restore it.
   */
  capitalsFrom: TextCase | null
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
  /** The person picked Capitals or Lowercase themselves, so no alphabet may change the case. */
  caseForced?: boolean
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
  return { motif: choices.motif, letterCase: textCase(lines, choices.letterCase), caseForced: choices.letterCase !== 'typed' }
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
const FALLBACK_FONTS: DisplayFont[] = ['Bagel Fat One', 'Rubik Mono One', 'Shrikhand']

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

const ALL_ICONS: IconName[] = [...ICON_SETS.nature, ...ICON_SETS.food]

/** What kind of icon a pattern may have. "any" lets the seed decide, including none. */
export type Motif = 'any' | 'nature' | 'food' | 'none'
export const MOTIFS: Motif[] = ['any', 'nature', 'food', 'none']
/**
 * Motifs (icons under the words, motif rows) are saved for v2: the drawings,
 * placement and recipe logic all still work, but v1 never asks for one, so
 * every pattern is letters only. Set this back to 'any' and restore the
 * Motif control in Tool.tsx and the 'm' link parameter to bring them back.
 */
export const DEFAULT_MOTIF: Motif = 'none'
export const DEFAULT_CHOICES: Choices = { motif: DEFAULT_MOTIF, letterCase: 'typed' }

/**
 * About two in three seeds use a hand-drawn stitch alphabet, which read most
 * like a charted sampler; the rest a display font. Its own stream, like the icon.
 */
const ALPHABET_SHARE = 0.67

/**
 * Alphabets the seed can pick. A capitals-only one (Slab) sets a phrase typed
 * in lowercase in capitals, unless the person chose Lowercase themselves.
 */
const IN_MIX: AlphabetId[] = [
  'block',
  'serif',
  'slab',
  'sampler',
  'sprig',
  'daisy',
  'marking',
  'beaded',
  'checker',
  'gothic',
  'deco',
  'swash',
  'tuscan',
  'folk',
  'botanical',
]

/** Alphabets with a small size that fit most phrases: the first stand-ins when another can't draw one. */
const COMPACT_ALPHABETS: AlphabetId[] = ['marking', 'serif', 'sampler', 'block']

/** The same letters without decoration, for when a Nature or Food icon was asked for. */
const PLAIN_VERSION: Partial<Record<AlphabetId, AlphabetId>> = { sprig: 'sampler', daisy: 'sampler', checker: 'slab' }

function alphabetFor(seed: string, letterCase: TextCase, caseForced = false, motif: Motif = DEFAULT_MOTIF): AlphabetId | null {
  const rng = randomFor('alphabet', seed)
  const offered = IN_MIX.filter((id) => letterCase === 'upper' || ALPHABETS[id].lowercase || !caseForced)
  if (rng() >= ALPHABET_SHARE) return null
  const id = pick(rng, offered)
  // Ornamented letters replace the icon, so when a Nature or Food icon was asked
  // for, the same capitals come plain. The pick itself never moves,
  // so changing the motif changes nothing else.
  return ALPHABETS[id].ornamented && motif !== 'any' && motif !== 'none' ? (PLAIN_VERSION[id] ?? 'sampler') : id
}

/**
 * Effects the seed can pick. The 3D side and the outline are built (see
 * compose.ts and the styles gallery) but not offered yet.
 */
const EFFECTS_IN_MIX: Effect[] = ['none', 'shadow']

/** The seed's effect, if it suits the alphabet; otherwise none. */
function effectFor(effect: Effect, alphabet: AlphabetId | null): Effect {
  if (effect === 'none' || !alphabet || !EFFECTS_IN_MIX.includes(effect)) return 'none'
  return (ALPHABETS[alphabet].effects as Effect[]).includes(effect) ? effect : 'none'
}

/** Sampler letters often sit over a row of small motifs, for the icons allowed in a row. */
const ROW_SHARE = 0.6

function iconRowFor(seed: string, alphabet: AlphabetId | null, icon: IconName | null): boolean {
  if (alphabet !== 'sampler' || !icon || !(icon in ICON_PLURALS)) return false
  return randomFor('icon-row', seed)() < ROW_SHARE
}

/**
 * Display fonts get room to breathe: at least two clear columns between
 * letters and two rows between lines, and no wave (bending squeezed heavy
 * letters into each other) or effect (on a font's ragged edge it read as noise).
 */
const FONT_LETTER_GAP = 2
const FONT_LINE_GAP = 2

/** A recipe back in the case the phrase was typed, if an alphabet had set it in capitals. */
function typedCase(recipe: Recipe): Pick<Recipe, 'letterCase' | 'capitalsFrom'> {
  return { letterCase: recipe.capitalsFrom ?? recipe.letterCase, capitalsFrom: null }
}

function asFontStyle(recipe: Recipe): Recipe {
  return {
    ...recipe,
    ...typedCase(recipe),
    alphabet: null,
    effect: 'none',
    iconRow: false,
    letterGap: Math.max(FONT_LETTER_GAP, recipe.letterGap),
    lineGap: Math.max(FONT_LINE_GAP, recipe.lineGap),
  }
}

/** Fonts that can draw the case: any lowercase rules out capitals-only fonts. */
function fontsFor(letterCase: TextCase): readonly DisplayFont[] {
  return letterCase === 'upper' ? PATTERN_FONTS : PATTERN_FONTS.filter((f) => !CAPITALS_ONLY.includes(f))
}

/**
 * The icon for a seed, from its own random stream: changing the motif only
 * ever changes the icon, never the font or effect.
 */
function iconFor(seed: string, motif: Motif): IconName | null {
  const rng = randomFor('icon', seed)
  if (motif === 'none') return null
  if (motif === 'any') return rng() < 0.7 ? pick(rng, ALL_ICONS) : null
  return pick(rng, ICON_SETS[motif] as readonly IconName[])
}

/** The effect comes from its own random stream, like the icon. */
function effectDraw(seed: string): Effect {
  return randomFor('style', seed)() < 0.3 ? 'shadow' : 'none'
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
    effect: effectDraw(seed),
    icon: iconFor(seed, choices.motif),
    iconRow: false,
    letterCase: choices.letterCase,
    capitalsFrom: null,
    alphabet: alphabetFor(seed, choices.letterCase, choices.caseForced, choices.motif),
  }
  if (base.alphabet && !ALPHABETS[base.alphabet].lowercase && base.letterCase !== 'upper') {
    base.capitalsFrom = base.letterCase
    base.letterCase = 'upper'
  }
  // Ornamented letters carry their own decoration: no icon, no effect. A
  // fallback style gets the seed's icon back.
  const seedIcon = base.icon
  if (base.alphabet && ALPHABETS[base.alphabet].ornamented) base.icon = null
  // A seed that picked ornamented letters keeps no effect even when they come
  // plain for an icon, so changing the motif changes only the icon.
  const pickedOrnamented = ALPHABETS[alphabetFor(seed, choices.letterCase, choices.caseForced) ?? 'block'].ornamented
  base.effect = pickedOrnamented ? 'none' : effectFor(base.effect, base.alphabet)
  base.iconRow = iconRowFor(seed, base.alphabet, base.icon)
  const first = base.alphabet ? base : asFontStyle(base)
  if (attempt === 0) return first

  // The alphabet can't draw this phrase (a missing character, or too wide even
  // in its small size). First try a compact alphabet with a small size, picked
  // by the seed; if that fails too, use the font. Either way the icon comes back.
  if (previous?.check.unsupported) {
    const from = previous.recipe ?? base
    if (from.alphabet && !COMPACT_ALPHABETS.includes(from.alphabet)) {
      const options = COMPACT_ALPHABETS.filter(
        (id) => choices.letterCase === 'upper' || ALPHABETS[id].lowercase || !choices.caseForced,
      )
      const compact = pick(randomFor('compact', seed), options)
      const typed = typedCase(from)
      const capitals = !ALPHABETS[compact].lowercase && typed.letterCase !== 'upper'
      return {
        ...from,
        ...typed,
        ...(capitals ? { letterCase: 'upper' as const, capitalsFrom: typed.letterCase } : {}),
        alphabet: compact,
        icon: seedIcon,
        iconRow: false,
        effect: effectFor(effectDraw(seed), compact),
        letterGap: 1,
      }
    }
    return { ...asFontStyle(from), icon: seedIcon }
  }

  // Script lowercase too small to read: a threshold won't fix that, so keep
  // the style and switch to a font that isn't a script.
  if (previous?.check.tooSmall) {
    const from = previous.recipe ?? base
    const plain = FALLBACK_FONTS.find((f) => !SCRIPT_FONTS.includes(f) && fontsFor(choices.letterCase).includes(f))!
    const [lo, hi] = THRESHOLDS[plain]
    return { ...from, font: plain, threshold: round2((lo + hi) / 2) }
  }

  // Fourth chance: the plain Block alphabet, which is drawn on the grid and so
  // can't lose a counter. If it can't draw the phrase either, the rule above
  // hands the last attempt to a font.
  if (attempt === 3) {
    return {
      ...first,
      ...typedCase(first),
      icon: seedIcon,
      alphabet: 'block',
      effect: effectFor(base.effect, 'block'),
      iconRow: false,
      letterGap: 1,
      lineGap: Math.max(1, first.lineGap),
    }
  }

  // The last chance is stacked block in a sturdy font at its measured rescue
  // threshold. An alphabet seed first tries its own font.
  if (attempt >= 4) {
    const others = FALLBACK_FONTS.filter((f) => f !== font && fontsFor(choices.letterCase).includes(f))
    // An alphabet seed that got here first tries its own font.
    const fonts = base.alphabet ? [font, ...others] : others
    const fallback = fonts[attempt - 4]
    return {
      ...asFontStyle(base),
      icon: seedIcon,
      font: fallback,
      letterGap: FONT_LETTER_GAP,
      lineGap: FONT_LINE_GAP,
      threshold: RESCUE_THRESHOLDS[fallback],
    }
  }

  const from = previous?.recipe ?? first
  // With no result to go on, assume the commonest failure: too heavy.
  const tooLight = previous ? previous.check.tooLight && !previous.check.tooHeavy : false
  const threshold = from.threshold + (tooLight ? -THRESHOLD_STEP : THRESHOLD_STEP)
  return {
    ...from,
    letterGap: tooLight ? from.letterGap : from.alphabet ? 1 : FONT_LETTER_GAP,
    threshold: round2(Math.min(THRESHOLD_LIMITS[1], Math.max(THRESHOLD_LIMITS[0], threshold))),
  }
}

/** The fixed look of the site's own wordmark. */
export const WORDMARK_RECIPE: Recipe = {
  font: 'Chango',
  letterAspect: 1.5,
  letterGap: 1,
  lineGap: 1,
  threshold: 0.5,
  icon: null,
  iconRow: false,
  effect: 'none',
  letterCase: 'upper',
  capitalsFrom: null,
  alphabet: null,
}

const EFFECT_PHRASES: Record<Effect, string | null> = {
  none: null,
  shadow: 'a shadow',
  block3d: 'a 3D side',
  outline: 'an outline',
}

/** Plain-words name for a style, so people can say what they liked. */
export function describeRecipe(recipe: Recipe): string {
  const shape = recipe.letterAspect >= 1.7 ? 'tall letters' : recipe.letterAspect <= 1.35 ? 'squat letters' : null
  const spacing = recipe.letterGap > 1 ? 'airy' : null
  const iconPart = recipe.icon && (recipe.iconRow ? `a row of ${ICON_PLURALS[recipe.icon]}` : iconPhrase(recipe.icon))
  const extras = [EFFECT_PHRASES[recipe.effect], iconPart || null].filter(Boolean)
  const withPart = extras.length ? `with ${extras.join(' and ')}` : null
  const lower = recipe.capitalsFrom ? 'set in capitals' : recipe.letterCase === 'lower' ? 'lowercase' : null
  const chosen = recipe.alphabet && ALPHABETS[recipe.alphabet]
  const letters = chosen
    ? chosen.initial
      ? `${chosen.name} initial with Sampler letters`
      : `${chosen.name} stitch letters`
    : recipe.font
  const fontShape = recipe.alphabet ? null : shape
  return [letters, lower, fontShape, spacing, withPart].filter(Boolean).join(' · ')
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** Whether any font attempt on this phrase failed the check. */
export function fontFailed(attempts: PreviousAttempt[]): boolean {
  return attempts.some((a) => !a.recipe.alphabet && !a.check.ok)
}

/**
 * A new seed whose style visibly differs from the current one: a different
 * font, alphabet or effect, and never the same icon twice in a row.
 */
export function seedWithNewStyle(
  current: Recipe | undefined,
  makeSeed: () => string = newSeed,
  choices: Choices = DEFAULT_CHOICES,
  /** A font already failed on this phrase: skip seeds that start with a font, they'd likely fall back to Block again. */
  avoidFonts = false,
): string {
  for (let i = 0; i < 30; i++) {
    const seed = makeSeed()
    if (!current) return seed
    // Same phrase, so the same case as the pattern on screen.
    const next = recipeFor(seed, 0, undefined, {
      motif: choices.motif,
      letterCase: current.capitalsFrom ?? current.letterCase,
      caseForced: choices.letterCase !== 'typed',
    })
    const letterform = (r: Recipe) => r.alphabet ?? r.font
    const newLook = letterform(next) !== letterform(current) || next.effect !== current.effect
    if (avoidFonts && !next.alphabet) continue
    if (newLook && (next.icon === null || next.icon !== current.icon)) return seed
  }
  return makeSeed()
}
