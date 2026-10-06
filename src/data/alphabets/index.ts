import type { StitchAlphabet } from './alphabet'
import { BLOCK } from './block'

/** The stitch alphabets on offer. Add new ones here. */
export const ALPHABETS = { block: BLOCK } satisfies Record<string, StitchAlphabet>

export type AlphabetId = keyof typeof ALPHABETS

export const ALPHABET_IDS = Object.keys(ALPHABETS) as AlphabetId[]
