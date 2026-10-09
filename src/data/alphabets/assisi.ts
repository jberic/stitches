import type { StitchAlphabet } from './alphabet'
import { BLOCK } from './block'

/**
 * Assisi: the Block letters worked the old Italian way, reversed. The letters
 * are left as bare fabric with an outline, on a stitched panel in a frame
 * (the panel is drawn in pattern/compose.ts).
 */
export const ASSISI: StitchAlphabet = {
  ...BLOCK,
  name: 'Assisi',
  effects: [],
  reversed: true,
  ornamented: true,
  ornament: 'Background',
}
