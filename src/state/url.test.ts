import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, readShareState, shareSearch } from './url'

describe('share links', () => {
  it('round-trips text, seed and width', () => {
    const state = { text: 'Stay cosy', seed: 'm4n5b', width: 64, palette: '08', fabric: 18 } as const
    expect(readShareState(shareSearch(state))).toEqual(state)
  })

  it('writes spaces as %20 so links read cleanly', () => {
    expect(shareSearch({ text: 'Hello sunshine', seed: 'k3j9a', width: 50, palette: '01', fabric: 14 })).toBe(
      '?text=Hello%20sunshine&seed=k3j9a&w=50&p=01&f=14',
    )
  })

  it('falls back to defaults for missing or broken values', () => {
    expect(readShareState('')).toEqual(DEFAULT_STATE)
    expect(readShareState('?text=%20%20&seed=NOT!&w=500&p=99&f=13')).toEqual(DEFAULT_STATE)
    expect(readShareState('?w=50.5').width).toBe(DEFAULT_STATE.width)
  })
})
