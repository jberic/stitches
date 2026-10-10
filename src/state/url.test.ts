import { describe, expect, it } from 'vitest'
import { DEFAULT_STATE, readShareState, shareSearch } from './url'

describe('share links', () => {
  it('round-trips text, seed, width and both threads', () => {
    const state = {
      text: 'Stay cosy',
      seed: 'm4n5b',
      width: 64,
      lettering: '310',
      accent: '3721',
      fabric: 18,
      letterCase: 'lower',
    } as const
    expect(readShareState(shareSearch(state))).toEqual(state)
  })

  it('writes spaces as %20 so links read cleanly', () => {
    expect(
      shareSearch({
        text: 'Hello sunshine',
        seed: 'k3j9a',
        width: 50,
        lettering: '814',
        accent: '729',
        fabric: 14,
        letterCase: 'upper',
      }),
    ).toBe('?text=Hello%20sunshine&seed=k3j9a&w=50&l=814&a=729&f=14&c=upper')
  })

  it("opens links from before the colour wheel in the palette's threads", () => {
    expect(readShareState('?p=07')).toMatchObject({ lettering: '939', accent: '729' })
    expect(readShareState('?p=02')).toMatchObject({ lettering: '814', accent: '470' })
  })

  it('falls back to defaults for missing or broken values', () => {
    expect(readShareState('')).toEqual(DEFAULT_STATE)
    expect(readShareState('?text=%20%20&seed=NOT!&w=500&p=99&l=XYZ&a=0&f=13&m=meat')).toEqual(DEFAULT_STATE)
    expect(readShareState('?w=50.5').width).toBe(DEFAULT_STATE.width)
  })
})
