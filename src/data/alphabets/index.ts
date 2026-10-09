import type { StitchAlphabet } from './alphabet'
import { BEADED } from './beaded'
import { BLOCK } from './block'
import { CHECKER } from './checker'
import { DAISY } from './daisy'
import { DECO } from './deco'
import { GOTHIC } from './gothic'
import { MARKING } from './marking'
import { SAMPLER } from './sampler'
import { SERIF } from './serif'
import { SLAB } from './slab'
import { SPRIG } from './sprig'
import { SWASH } from './swash'

/** The stitch alphabets on offer. Add new ones here. */
export const ALPHABETS = {
  block: BLOCK,
  serif: SERIF,
  slab: SLAB,
  sampler: SAMPLER,
  sprig: SPRIG,
  daisy: DAISY,
  marking: MARKING,
  beaded: BEADED,
  checker: CHECKER,
  gothic: GOTHIC,
  deco: DECO,
  swash: SWASH,
} satisfies Record<string, StitchAlphabet>

export type AlphabetId = keyof typeof ALPHABETS

export const ALPHABET_IDS = Object.keys(ALPHABETS) as AlphabetId[]
