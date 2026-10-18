import type { StitchAlphabet } from './alphabet'
import { ASSISI } from './assisi'
import { ASSISI_ROMAN } from './assisiroman'
import { BALLOON } from './balloon'
import { BEADED } from './beaded'
import { BLACKLETTER } from './blackletter'
import { BLACKWORK } from './blackwork'
import { BLOCK } from './block'
import { BOTANICAL } from './botanical'
import { CHECKER } from './checker'
import { COPPERPLATE } from './copperplate'
import { COUNTED } from './counted'
import { CURSIVE } from './cursive'
import { DAISY } from './daisy'
import { DECO } from './deco'
import { DELFT } from './delft'
import { DIDONE } from './didone'
import { FLOURISH } from './flourish'
import { FOREST } from './forest'
import { FRAKTUR } from './fraktur'
import { GOTHIC } from './gothic'
import { HOLBEIN } from './holbein'
import { HOLLOW } from './hollow'
import { INLINE } from './inline'
import { SAMPLER } from './sampler'
import { SERIF } from './serif'
import { SHADOW_SLAB } from './shadowslab'
import { SLAB } from './slab'
import { SPRIG } from './sprig'
import { STENCIL } from './stencil'
import { SWASH } from './swash'
import { TUSCAN } from './tuscan'
import { TYPEWRITER } from './typewriter'
import { WESTERN } from './western'
import { WOOD_TYPE } from './woodtype'

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
  inline: INLINE,
  holbein: HOLBEIN,
  shadowslab: SHADOW_SLAB,
  counted: COUNTED,
  blackwork: BLACKWORK,
  forest: FOREST,
  fraktur: FRAKTUR,
  assisiroman: ASSISI_ROMAN,
  blackletter: BLACKLETTER,
  copperplate: COPPERPLATE,
  woodtype: WOOD_TYPE,
  didone: DIDONE,
} satisfies Record<string, StitchAlphabet>

export type AlphabetId = keyof typeof ALPHABETS

export const ALPHABET_IDS = Object.keys(ALPHABETS) as AlphabetId[]
