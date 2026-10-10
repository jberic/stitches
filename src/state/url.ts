import { DEFAULT_PALETTE_ID, codesForPaletteId, isThreadCode } from '../data/palettes'
import { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH } from '../pattern/generate'
import { isSeed } from '../pattern/random'
import type { LetterCase } from '../pattern/recipe'
import { DEFAULT_FABRIC_COUNT, isFabricCount, type FabricCount } from '../pattern/size'
import { MAX_CHARS } from '../pattern/text'

/** Everything a shared link needs to rebuild the exact same pattern. */
export interface ShareState {
  text: string
  seed: string
  width: number
  /** Thread codes: the lettering thread and the accent thread. */
  lettering: string
  accent: string
  fabric: FabricCount
  letterCase: LetterCase
}

export const DEFAULT_STATE: ShareState = {
  text: 'Hello sunshine',
  seed: 'k3j9a',
  width: DEFAULT_WIDTH,
  lettering: codesForPaletteId(DEFAULT_PALETTE_ID)![0],
  accent: codesForPaletteId(DEFAULT_PALETTE_ID)![1],
  fabric: DEFAULT_FABRIC_COUNT,
  letterCase: 'typed',
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
  return {
    text: text && text.trim() && text.length <= MAX_CHARS * 2 ? text : DEFAULT_STATE.text,
    seed: isSeed(seed) ? seed : DEFAULT_STATE.seed,
    width: Number.isInteger(width) && width >= MIN_WIDTH && width <= MAX_WIDTH ? width : DEFAULT_STATE.width,
    lettering: isThreadCode(lettering) ? lettering! : (fromPalette?.[0] ?? DEFAULT_STATE.lettering),
    accent: isThreadCode(accent) ? accent! : (fromPalette?.[1] ?? DEFAULT_STATE.accent),
    fabric: isFabricCount(fabric) ? fabric : DEFAULT_STATE.fabric,
    letterCase: letterCase === 'upper' || letterCase === 'lower' ? letterCase : DEFAULT_STATE.letterCase,
  }
}

export function shareSearch(state: ShareState): string {
  const params = new URLSearchParams({
    text: state.text,
    seed: state.seed,
    w: String(state.width),
    l: state.lettering,
    a: state.accent,
    f: String(state.fabric),
    c: state.letterCase,
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
  if (search === window.location.search) return
  const url = `${window.location.pathname}${search}${window.location.hash}`
  if (mode === 'push') window.history.pushState(null, '', url)
  else window.history.replaceState(null, '', url)
}
