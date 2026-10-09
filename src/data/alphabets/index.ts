import type { StitchAlphabet } from './alphabet'
import { BALLOON } from './balloon'
import { BEADED } from './beaded'
import { BLOCK } from './block'
import { BOTANICAL } from './botanical'
import { CHECKER } from './checker'
import { DAISY } from './daisy'
import { DECO } from './deco'
import { FOLK } from './folk'
import { GOTHIC } from './gothic'
import { HOLLOW } from './hollow'
import { MARKING } from './marking'
import { SAMPLER } from './sampler'
import { SERIF } from './serif'
import { SLAB } from './slab'
import { SPRIG } from './sprig'
import { STENCIL } from './stencil'
import { SWASH } from './swash'
import { TUSCAN } from './tuscan'
import { TYPEWRITER } from './typewriter'

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
  tuscan: TUSCAN,
  folk: FOLK,
  botanical: BOTANICAL,
  typewriter: TYPEWRITER,
  stencil: STENCIL,
  hollow: HOLLOW,
  balloon: BALLOON,
} satisfies Record<string, StitchAlphabet>

export type AlphabetId = keyof typeof ALPHABETS

export const ALPHABET_IDS = Object.keys(ALPHABETS) as AlphabetId[]
