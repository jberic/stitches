import { readShareState, shareSearch, type ShareState } from './url'

/**
 * The last results, kept in this browser only (localStorage) so a pattern you
 * liked can be brought back. Never uploaded; if storage is blocked the strip
 * still works for the visit.
 */

export const HISTORY_LIMIT = 8
const STORAGE_KEY = 'say-it-with-stitches:history'

export interface HistoryEntry {
  /** Everything needed to rebuild the result exactly. */
  state: ShareState
  /** A compact copy of the grid for the thumbnail: one digit per cell. */
  grid: { width: number; height: number; cells: string }
  /** Plain description for screen readers and tooltips. */
  label: string
}

export function entryKey(entry: HistoryEntry): string {
  return shareSearch(entry.state)
}

/** Newest first, without duplicates, at most HISTORY_LIMIT long. */
export function addToHistory(list: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const key = entryKey(entry)
  return [entry, ...list.filter((e) => entryKey(e) !== key)].slice(0, HISTORY_LIMIT)
}

export function encodeCells(cells: Uint8Array): string {
  return Array.from(cells, (c) => String(c)).join('')
}

export function decodeCells(cells: string): Uint8Array {
  return Uint8Array.from(cells, (c) => Number(c))
}

function isEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false
  const e = value as HistoryEntry
  return (
    typeof e.label === 'string' &&
    typeof e.grid?.width === 'number' &&
    typeof e.grid?.height === 'number' &&
    typeof e.grid?.cells === 'string' &&
    e.grid.cells.length === e.grid.width * e.grid.height &&
    /^[0-9]*$/.test(e.grid.cells) &&
    typeof e.state === 'object'
  )
}

/** A saved state as a link; entries saved before the colour wheel carry a palette id instead of thread codes. */
function searchFor(state: ShareState & { palette?: string }): string {
  const search = shareSearch(state)
  return state.lettering ? search : `${search}&p=${encodeURIComponent(state.palette ?? '')}`
}

export function loadHistory(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): HistoryEntry[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Re-read each state through the link parser, so a stale or edited entry can't carry bad values.
    return parsed
      .filter(isEntry)
      .map((e) => ({ ...e, state: readShareState(searchFor(e.state)) }))
      .slice(0, HISTORY_LIMIT)
  } catch {
    return []
  }
}

export function saveHistory(list: HistoryEntry[], storage: Pick<Storage, 'setItem'> | undefined = safeStorage()) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Storage full or blocked: the strip just won't survive a reload.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}
