import type { DisplayFont } from '../fonts'
import type { Recipe } from './recipe'

export type LayoutId = 'stacked-block' | 'wavy'

export interface PatternMeta {
  text: string
  lines: string[]
  layout: LayoutId
  font: DisplayFont
  /** Empty for the site's own wordmark, which uses a fixed recipe. */
  seed: string
  recipe: Recipe
}

/**
 * A pattern is pure data: a row-major grid of colour indexes plus metadata.
 * Index 0 means "no stitch" (bare fabric). Rendering, export and the legend
 * all read from this; nothing here knows about canvas or the DOM.
 */
export interface Pattern {
  width: number
  height: number
  cells: Uint8Array
  meta: PatternMeta
}
