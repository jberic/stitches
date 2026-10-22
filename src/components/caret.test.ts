import { describe, expect, it } from 'vitest'
import { caretBox, indexAt, letterIndexes } from './caret'

// "Hi you": two lines, letters 5 wide with a gap of 1, lines 10 rows apart.
const letters = [
  { x: 0, y: 0, width: 5, height: 8 },
  { x: 6, y: 0, width: 5, height: 8 },
  { x: 0, y: 10, width: 5, height: 8 },
  { x: 6, y: 10, width: 5, height: 8 },
  { x: 12, y: 10, width: 5, height: 8 },
]
const text = 'Hi you'

describe('the stitched cursor', () => {
  it('lists the text index of every letter, spaces left out', () => {
    expect(letterIndexes(text)).toEqual([0, 1, 3, 4, 5])
  })

  it('sits after the letter before it, or before the first letter of a word', () => {
    expect(caretBox(text, letters, 0)).toEqual({ x: 0, top: 0, height: 8 })
    expect(caretBox(text, letters, 2)).toEqual({ x: 11, top: 0, height: 8 })
    expect(caretBox(text, letters, 3)).toEqual({ x: 0, top: 10, height: 8 })
    expect(caretBox(text, letters, 6)).toEqual({ x: 17, top: 10, height: 8 })
  })

  it('is as tall as the letters, not the room left for tails below them', () => {
    const tails = [{ x: 0, y: 0, width: 5, height: 26, capHeight: 20 }]
    expect(caretBox('A', tails, 1)).toEqual({ x: 5, top: 0, height: 20 })
  })

  it('has nowhere to go without letters', () => {
    expect(caretBox('', [], 0)).toBeNull()
  })

  it('puts a click before or after the nearest letter on the nearest line', () => {
    expect(indexAt(text, letters, 1, 4)).toBe(0)
    expect(indexAt(text, letters, 4, 4)).toBe(1)
    expect(indexAt(text, letters, 30, 4)).toBe(2)
    expect(indexAt(text, letters, 8, 13)).toBe(4)
    expect(indexAt(text, letters, 16, 40)).toBe(6)
  })
})
