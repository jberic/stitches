import { DEFAULT_PALETTE_ID, PALETTES } from '../data/palettes'
import { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH } from '../pattern/generate'
import { isSeed } from '../pattern/random'
import { DEFAULT_MOTIF, MOTIFS, type Motif } from '../pattern/recipe'
import { DEFAULT_FABRIC_COUNT, isFabricCount, type FabricCount } from '../pattern/size'
import { MAX_CHARS } from '../pattern/text'

/** Everything a shared link needs to rebuild the exact same pattern. */
export interface ShareState {
  text: string
  seed: string
  width: number
  palette: string
  fabric: FabricCount
  motif: Motif
}

export const DEFAULT_STATE: ShareState = {
  text: 'Hello sunshine',
  seed: 'k3j9a',
  width: DEFAULT_WIDTH,
  palette: DEFAULT_PALETTE_ID,
  fabric: DEFAULT_FABRIC_COUNT,
  motif: DEFAULT_MOTIF,
}

/** Reads a link. Anything missing or broken falls back to the default. */
export function readShareState(search: string): ShareState {
  const params = new URLSearchParams(search)
  const text = params.get('text')
  const seed = params.get('seed')
  const width = Number(params.get('w'))
  const palette = params.get('p')
  const fabric = Number(params.get('f'))
  const motif = params.get('m') as Motif | null
  return {
    text: text && text.trim() && text.length <= MAX_CHARS * 2 ? text : DEFAULT_STATE.text,
    seed: isSeed(seed) ? seed : DEFAULT_STATE.seed,
    width: Number.isInteger(width) && width >= MIN_WIDTH && width <= MAX_WIDTH ? width : DEFAULT_STATE.width,
    palette: PALETTES.some((p) => p.id === palette) ? palette! : DEFAULT_STATE.palette,
    fabric: isFabricCount(fabric) ? fabric : DEFAULT_STATE.fabric,
    motif: motif && MOTIFS.includes(motif) ? motif : DEFAULT_STATE.motif,
  }
}

export function shareSearch(state: ShareState): string {
  const params = new URLSearchParams({
    text: state.text,
    seed: state.seed,
    w: String(state.width),
    p: state.palette,
    f: String(state.fabric),
    m: state.motif,
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
