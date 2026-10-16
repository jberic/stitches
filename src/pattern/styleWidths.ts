import type { AlphabetId } from '../data/alphabets'
import type { DisplayFont } from '../fonts'

/**
 * The width, in stitches, each lettering style is generated at when "Generate
 * again" picks it. Set by hand on the dev page fonts.html. The Width control
 * can still change it afterwards.
 */
export const STYLE_WIDTHS: Record<AlphabetId, number> & Partial<Record<DisplayFont, number>> = {
  block: 75,
  serif: 61,
  slab: 64,
  sampler: 42,
  sprig: 91,
  daisy: 82,
  beaded: 93,
  checker: 95,
  gothic: 79,
  // A first guess until set on fonts.html.
  flourish: 90,
  deco: 64,
  swash: 88,
  tuscan: 65,
  botanical: 65,
  typewriter: 48,
  stencil: 42,
  hollow: 64,
  balloon: 50,
  western: 64,
  assisi: 40,
  cursive: 42,
  Shrikhand: 40,
  'Bagel Fat One': 40,
  'Rubik Mono One': 40,
}

/** The width for a style, or the given width for one not in the list. */
export function styleWidth(letterform: AlphabetId | DisplayFont, fallback: number): number {
  return (STYLE_WIDTHS as Record<string, number | undefined>)[letterform] ?? fallback
}
