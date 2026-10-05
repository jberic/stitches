import type { DisplayFont } from '../fonts'

export type LayoutId = 'stacked-block'

export interface PatternMeta {
  text: string
  lines: string[]
  layout: LayoutId
  font: DisplayFont
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

export function stitchCount(pattern: Pattern, colourIndex = 1): number {
  let n = 0
  for (const c of pattern.cells) if (c === colourIndex) n++
  return n
}
