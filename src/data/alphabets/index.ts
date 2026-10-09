import type { StitchAlphabet } from './alphabet'
import { BLOCK } from './block'
import { DAISY } from './daisy'
import { SAMPLER } from './sampler'
import { SERIF } from './serif'
import { SLAB } from './slab'
import { SPRIG } from './sprig'

/** The stitch alphabets on offer. Add new ones here. */
export const ALPHABETS = {
  block: BLOCK,
  serif: SERIF,
  slab: SLAB,
  sampler: SAMPLER,
  sprig: SPRIG,
  daisy: DAISY,
} satisfies Record<string, StitchAlphabet>

export type AlphabetId = keyof typeof ALPHABETS

export const ALPHABET_IDS = Object.keys(ALPHABETS) as AlphabetId[]
