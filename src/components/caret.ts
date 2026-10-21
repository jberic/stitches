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

export interface CaretBox {
  x: number
  top: number
  height: number
}

/**
 * Where the cursor sits for a text index: right after the letter before it,
 * or, at the start of a word, just before that word's first letter.
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
    return { x: box.x + box.width, top: box.y, height: box.height }
  }
  const next = letters[Math.min(before, letters.length - 1)]
  if (before < letters.length) return { x: next.x, top: next.y, height: next.height }
  const last = letters[letters.length - 1]
  return { x: last.x + last.width, top: last.y, height: last.height }
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
