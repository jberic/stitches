import { ALPHABETS } from '../data/alphabets'
import { ICON_LABELS } from '../data/icons'
import { FABRIC, patternColours, type Palette, type Thread } from '../data/palettes'
import { ACCENT, LETTERING } from './compose'
import type { Pattern } from './types'

export interface LegendRow {
  /** The colour index in the pattern grid. */
  index: number
  thread: Thread
  /** What this thread is used for, in plain words. */
  use: string
  stitches: number
}

export interface Legend {
  rows: LegendRow[]
  fabric: { name: string; hex: string }
  total: number
}

/** Stitches per colour index, from the grid itself. */
export function stitchCounts(pattern: Pattern): Map<number, number> {
  const counts = new Map<number, number>()
  for (const c of pattern.cells) if (c) counts.set(c, (counts.get(c) ?? 0) + 1)
  return counts
}

/** The key for a pattern: one row per thread actually used, plus the fabric. */
export function legendFor(pattern: Pattern, palette: Palette): Legend {
  const { lettering, accent } = patternColours(palette)
  const { icon, effect } = pattern.meta.recipe
  // With an outline the threads swap: the darker one outlines, the accent fills the letters.
  const letteringUse =
    effect === 'outline'
      ? 'Outline'
      : effect === 'assisi'
        ? 'Outline and frame'
        : effect === 'sampler'
          ? 'Lettering and frame'
          : 'Lettering'
  const effectPart = {
    none: null,
    shadow: 'shadow',
    block3d: '3D side',
    outline: 'lettering',
    assisi: null,
    sampler: null,
    drop: 'shadow',
  }[effect]
  const iconLabel = icon && ICON_LABELS[icon]
  const { alphabet } = pattern.meta.recipe
  const ornament = alphabet ? ALPHABETS[alphabet].ornament : undefined
  const accentParts = [ornament ?? null, iconLabel || null, effectPart].filter(Boolean).join(' and ')
  const accentUse = capitalise(accentParts || 'Accent')
  const counts = stitchCounts(pattern)
  const rows: LegendRow[] = [
    { index: LETTERING, thread: lettering, use: letteringUse, stitches: counts.get(LETTERING) ?? 0 },
    { index: ACCENT, thread: accent, use: accentUse, stitches: counts.get(ACCENT) ?? 0 },
  ].filter((row) => row.stitches > 0)
  return {
    rows,
    fabric: { name: FABRIC.name, hex: FABRIC.hex },
    total: rows.reduce((sum, row) => sum + row.stitches, 0),
  }
}

function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
