import type { StitchAlphabet } from './alphabet'
import { ASSISI } from './assisi'
import { BALLOON } from './balloon'
import { BEADED } from './beaded'
import { BLOCK } from './block'
import { BOTANICAL } from './botanical'
import { CHECKER } from './checker'
import { CURSIVE } from './cursive'
import { DAISY } from './daisy'
import { DECO } from './deco'
import { DELFT } from './delft'
import { FLOURISH } from './flourish'
import { GOTHIC } from './gothic'
import { HOLLOW } from './hollow'
import { SAMPLER } from './sampler'
import { SERIF } from './serif'
import { SLAB } from './slab'
import { SPRIG } from './sprig'
import { STENCIL } from './stencil'
import { SWASH } from './swash'
import { TUSCAN } from './tuscan'
import { TYPEWRITER } from './typewriter'
import { WESTERN } from './western'

/** The stitch alphabets on offer. Add new ones here. */
export const ALPHABETS = {
  block: BLOCK,
  serif: SERIF,
  slab: SLAB,
  sampler: SAMPLER,
  sprig: SPRIG,
  daisy: DAISY,
  beaded: BEADED,
  checker: CHECKER,
  gothic: GOTHIC,
  flourish: FLOURISH,
  deco: DECO,
  swash: SWASH,
  tuscan: TUSCAN,
  botanical: BOTANICAL,
  typewriter: TYPEWRITER,
  stencil: STENCIL,
  hollow: HOLLOW,
  balloon: BALLOON,
  western: WESTERN,
  assisi: ASSISI,
  cursive: CURSIVE,
  delft: DELFT,
} satisfies Record<string, StitchAlphabet>

export type AlphabetId = keyof typeof ALPHABETS

export const ALPHABET_IDS = Object.keys(ALPHABETS) as AlphabetId[]
