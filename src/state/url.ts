import { DEFAULT_PALETTE_ID, codesForPaletteId, isThreadCode } from '../data/palettes'
import { MAX_WIDTH, MIN_WIDTH } from '../pattern/generate'
import { isSeed } from '../pattern/random'
import { STYLE_CHOICES, recipeFor, resolveChoices, type LetterCase, type StyleId } from '../pattern/recipe'
import { DEFAULT_FABRIC_COUNT, isFabricCount, type FabricCount } from '../pattern/size'
import { MAX_CHARS } from '../pattern/text'

/** Everything a shared link needs to rebuild the exact same pattern. */
export interface ShareState {
  text: string
  seed: string
  /** Stitches wide, or null for Auto: the letters at their natural size. */
  width: number | null
  /** Thread codes: the lettering thread and the accent thread. */
  lettering: string
  accent: string
  fabric: FabricCount
  letterCase: LetterCase
  /** The lettering style picked in Typography. */
  style: StyleId
}

/** The style everyone starts with. */
export const DEFAULT_STYLE: StyleId = 'delft'

/** Today's day of the week, like "Thursday": what a first visit opens on. */
export function today(date = new Date()): string {
  return date.toLocaleDateString('en-GB', { weekday: 'long' })
}

export const DEFAULT_STATE: ShareState = {
  text: today(),
  seed: 'k3j9a',
  width: null,
  lettering: codesForPaletteId(DEFAULT_PALETTE_ID)![0],
  accent: codesForPaletteId(DEFAULT_PALETTE_ID)![1],
  fabric: DEFAULT_FABRIC_COUNT,
  letterCase: 'typed',
  style: DEFAULT_STYLE,
}

function isStyle(value: string | null): value is StyleId {
  return value !== null && (STYLE_CHOICES as string[]).includes(value)
}

/** For a link made before styles were picked by hand: the style its seed always gave. */
function styleOfSeed(seed: string, text: string, letterCase: LetterCase): StyleId {
  const recipe = recipeFor(seed, 0, undefined, resolveChoices(text.trim().split(/\s+/), { motif: 'none', letterCase }))
  const style = recipe.alphabet ?? recipe.font
  return isStyle(style) ? style : DEFAULT_STYLE
}

/** True when the address names a pattern (a shared link or a reload), not a bare visit. */
export function hasShareState(search: string): boolean {
  const params = new URLSearchParams(search)
  return params.has('text') || params.has('seed')
}

/** Reads a link. Anything missing or broken falls back to the default. */
export function readShareState(search: string): ShareState {
  const params = new URLSearchParams(search)
  const text = params.get('text')
  const seed = params.get('seed')
  const width = Number(params.get('w'))
  const lettering = params.get('l')
  const accent = params.get('a')
  // Links made before the colour wheel name a palette instead.
  const fromPalette = codesForPaletteId(params.get('p'))
  const fabric = Number(params.get('f'))
  const letterCase = params.get('c')
  const style = params.get('s')
  const state = {
    text: text && text.trim() && text.length <= MAX_CHARS * 2 ? text : DEFAULT_STATE.text,
    seed: isSeed(seed) ? seed : DEFAULT_STATE.seed,
    // A link without a width, or with w=auto, is Auto.
    width: Number.isInteger(width) && width >= MIN_WIDTH && width <= MAX_WIDTH ? width : DEFAULT_STATE.width,
    lettering: isThreadCode(lettering) ? lettering! : (fromPalette?.[0] ?? DEFAULT_STATE.lettering),
    accent: isThreadCode(accent) ? accent! : (fromPalette?.[1] ?? DEFAULT_STATE.accent),
    fabric: isFabricCount(fabric) ? fabric : DEFAULT_STATE.fabric,
    letterCase: letterCase === 'upper' || letterCase === 'lower' ? letterCase : DEFAULT_STATE.letterCase,
  } as Omit<ShareState, 'style'>
  const fromSeed = isSeed(seed) ? styleOfSeed(state.seed, state.text, state.letterCase) : DEFAULT_STYLE
  return { ...state, style: isStyle(style) ? style : fromSeed }
}

export function shareSearch(state: ShareState): string {
  const params = new URLSearchParams({
    text: state.text,
    seed: state.seed,
    w: state.width === null ? 'auto' : String(state.width),
    l: state.lettering,
    a: state.accent,
    f: String(state.fabric),
    c: state.letterCase,
    s: state.style,
  })
  return `?${params.toString().replace(/\+/g, '%20')}`
}

/**
 * Puts the state in the address bar. "replace" for typing and dragging, so
 * every keystroke isn't a history entry; "push" for a new style, so Back
 * returns to the one before.
 */
export function writeShareState(state: ShareState, mode: 'replace' | 'push') {
  const search = shareSearch(state)
  rememberLastState(search)
  if (search === window.location.search) return
  const url = `${window.location.pathname}${search}${window.location.hash}`
  if (mode === 'push') window.history.pushState(null, '', url)
  else window.history.replaceState(null, '', url)
}

const LAST_KEY = 'say-it-with-stitches:last'

/** Kept in this browser only, so a returning visitor carries on where they left off. */
function rememberLastState(search: string) {
  try {
    window.localStorage.setItem(LAST_KEY, search)
  } catch {
    // Storage blocked: the next visit just starts fresh.
  }
}

/**
 * Where the tool opens: the pattern a link names; otherwise this browser's
 * last pattern; otherwise the default.
 */
export function startingState(search: string): ShareState {
  if (hasShareState(search)) return readShareState(search)
  try {
    const last = window.localStorage.getItem(LAST_KEY)
    if (last) return readShareState(last)
  } catch {
    // Storage blocked: start fresh.
  }
  return readShareState('')
}
