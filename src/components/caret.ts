import type { LetterBox } from '../pattern/layouts/stackedBlock'

/**
 * The stitched text cursor. Letters come in reading order with spaces left
 * out, so the k-th letter is the k-th character of the text that isn't a
 * space. All positions are in stitches.
 */

/** The text index of each letter. */
export function letterIndexes(text: string): number[] {
  const out: number[] = []
  for (let i = 0; i < text.length; i++) if (!/\s/.test(text[i])) out.push(i)
  return out
}

/** The cursor is as tall as the letters: down to the baseline, not into the room left for tails. */
const tall = (box: LetterBox) => box.capHeight ?? box.height

export interface CaretBox {
  /** The middle of the cursor: in the gap between two letters, clear of both. */
  x: number
  top: number
  height: number
}

/** Half a stitch: how far out the cursor sits at the start or end of a line. */
const HALF = 0.5

/**
 * Where the cursor sits for a text index: in the gap after the letter before
 * it, or, at the start of a word, in front of that word's first letter.
 */
export function caretBox(text: string, letters: LetterBox[], index: number): CaretBox | null {
  const at = letterIndexes(text)
  if (at.length === 0 || letters.length === 0) return null
  // How many letters come before the cursor.
  let before = 0
  while (before < at.length && at[before] < index) before++
  const afterLetter = index > 0 && !/\s/.test(text[index - 1] ?? ' ')
  if (afterLetter && before > 0 && letters[before - 1]) {
    const box = letters[before - 1]
    const right = box.x + box.width
    // The next letter on the same line, if any: the cursor goes in the middle of the gap.
    const next = letters[before]
    const x = next && next.y === box.y && next.x >= right ? (right + next.x) / 2 : right + HALF
    return { x, top: box.y, height: tall(box) }
  }
  const next = letters[Math.min(before, letters.length - 1)]
  if (before < letters.length) return { x: next.x - HALF, top: next.y, height: tall(next) }
  const last = letters[letters.length - 1]
  return { x: last.x + last.width + HALF, top: last.y, height: tall(last) }
}

/** The text index nearest a point: before or after the closest letter on the closest line. */
export function indexAt(text: string, letters: LetterBox[], x: number, y: number): number {
  const at = letterIndexes(text)
  const count = Math.min(at.length, letters.length)
  if (count === 0) return text.length
  // The line: the letters whose rows contain the point, or else the nearest.
  const distanceY = (b: LetterBox) => (y < b.y ? b.y - y : y > b.y + b.height ? y - b.y - b.height : 0)
  let best = Infinity
  for (let k = 0; k < count; k++) best = Math.min(best, distanceY(letters[k]))
  let chosen = -1
  let nearest = Infinity
  for (let k = 0; k < count; k++) {
    const box = letters[k]
    if (distanceY(box) !== best) continue
    const dx = x < box.x ? box.x - x : x > box.x + box.width ? x - box.x - box.width : 0
    if (dx < nearest) {
      nearest = dx
      chosen = k
    }
  }
  const box = letters[chosen]
  return x < box.x + box.width / 2 ? at[chosen] : at[chosen] + 1
}
