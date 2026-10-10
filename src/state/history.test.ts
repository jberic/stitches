import { describe, expect, it } from 'vitest'
import { HISTORY_LIMIT, addToHistory, decodeCells, encodeCells, loadHistory, saveHistory, type HistoryEntry } from './history'
import { DEFAULT_STATE } from './url'

const entry = (seed: string): HistoryEntry => ({
  state: { ...DEFAULT_STATE, seed },
  grid: { width: 2, height: 1, cells: '12' },
  label: seed,
})

function memoryStorage() {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

describe('history', () => {
  it('keeps the newest first and at most the limit', () => {
    let list: HistoryEntry[] = []
    for (let i = 0; i < 12; i++) list = addToHistory(list, entry(`s${i}`))
    expect(list).toHaveLength(HISTORY_LIMIT)
    expect(list[0].state.seed).toBe('s11')
  })

  it('moves a repeat to the front instead of adding it twice', () => {
    const list = addToHistory(addToHistory(addToHistory([], entry('a')), entry('b')), entry('a'))
    expect(list.map((e) => e.state.seed)).toEqual(['a', 'b'])
  })

  it('round-trips through storage', () => {
    const storage = memoryStorage()
    saveHistory([entry('a'), entry('b')], storage)
    expect(loadHistory(storage).map((e) => e.state.seed)).toEqual(['a', 'b'])
  })

  it('survives broken or blocked storage', () => {
    expect(loadHistory({ getItem: () => '{not json' })).toEqual([])
    expect(loadHistory({ getItem: () => JSON.stringify([{ label: 1 }]) })).toEqual([])
    expect(() =>
      saveHistory([entry('a')], {
        setItem: () => {
          throw new Error('quota')
        },
      }),
    ).not.toThrow()
  })

  it('encodes grids compactly and losslessly', () => {
    const cells = new Uint8Array([0, 1, 2, 2, 0])
    expect(decodeCells(encodeCells(cells))).toEqual(cells)
  })
})

describe('history saved before the colour wheel', () => {
  it("keeps the old palette's exact threads", () => {
    const old = [
      {
        label: 'x',
        grid: { width: 1, height: 1, cells: '1' },
        state: { text: 'Hi', seed: 'k3j9a', width: 50, palette: '07', fabric: 14, letterCase: 'typed' },
      },
    ]
    const [entry] = loadHistory({ getItem: () => JSON.stringify(old) })
    expect([entry.state.lettering, entry.state.accent]).toEqual(['939', '729'])
  })
})
