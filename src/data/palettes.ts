import { deltaE, hexToLab } from './colour'
import threads from './threads.json'

/**
 * Thread pairs. Every pattern sits on the same fabric, #FBF3EC, and uses two
 * threads: one for the lettering, one for the accent (shadow, ornaments).
 * Any two threads can be picked with the colour wheel; these are the
 * recommended starting points.
 *
 * Built from the hues of the design handoff ("Cross Stitch Design System",
 * stitch palettes): the darker colour of each handoff palette letters, the
 * other hue becomes the accent. Threads are stored as codes only; names and
 * screen colours come from threads.json. Each code is the closest thread
 * (CIEDE2000) to the handoff colour that passes on the fabric: lettering at
 * least 4.5:1, accent at least 2:1 and clearly apart from the lettering.
 * Pale hues (blush, straw, ecru) had to darken to stay visible on cream.
 */

export interface Thread {
  code: string
  name: string
  hex: string
}

export interface Palette {
  id: string
  name: string
  lettering: { name: string; code: string }
  /** Stitches the icon and the shadow. */
  accent: { name: string; code: string }
}

/** The one fabric every pattern sits on. Its screen colour is a choice, not thread data. */
export const FABRIC = { name: 'Cream', hex: '#FBF3EC' }

/** Recommended pairs: quick picks to start from. Any two threads can be chosen with the colour wheel. */
export const PALETTES: Palette[] = [
  { id: '07', name: 'Navy and mustard', lettering: { name: 'Navy', code: '939' }, accent: { name: 'Mustard', code: '729' } },
  { id: '01', name: 'Garnet and mustard', lettering: { name: 'Garnet', code: '814' }, accent: { name: 'Mustard', code: '729' } },
  { id: '04', name: 'Pine and blush', lettering: { name: 'Pine', code: '890' }, accent: { name: 'Blush', code: '21' } },
  { id: '06', name: 'Plum and sage', lettering: { name: 'Plum', code: '35' }, accent: { name: 'Sage', code: '523' } },
  { id: '11', name: 'Charcoal and straw', lettering: { name: 'Charcoal', code: '310' }, accent: { name: 'Straw', code: '833' } },
  {
    id: '12',
    name: 'Garnet and antique blue',
    lettering: { name: 'Garnet', code: '814' },
    accent: { name: 'Antique blue', code: '809' },
  },
]

export const DEFAULT_PALETTE_ID = '07'

/**
 * Pairs that used to be palettes, by their old id, so a link made before the
 * colour wheel still opens in its exact threads. 03 was removed outright.
 */
const RETIRED_PAIRS: Record<string, [lettering: string, accent: string]> = {
  '02': ['814', '470'],
  '05': ['815', '3023'],
  '08': ['311', '21'],
  '09': ['355', '833'],
  '10': ['500', '223'],
}

/** The thread codes an old palette id stood for, or null if it was never one we kept. */
export function codesForPaletteId(id: string | null): [string, string] | null {
  const current = PALETTES.find((p) => p.id === id)
  if (current) return [current.lettering.code, current.accent.code]
  return (id && RETIRED_PAIRS[id]) || null
}

const THREADS = new Map((threads as Thread[]).map((t) => [t.code, t]))

/** Every thread, for the colour wheel. */
export const ALL_THREADS: Thread[] = [...THREADS.values()]

const LAB = new Map(ALL_THREADS.map((t) => [t.code, hexToLab(t.hex)]))

/** The threads closest to a screen colour, by how alike they look (CIEDE2000), closest first. */
export function nearestThreads(hex: string, count = 1): Thread[] {
  const target = hexToLab(hex)
  return ALL_THREADS.map((t) => ({ t, d: deltaE(target, LAB.get(t.code)!) }))
    .sort((x, y) => x.d - y.d)
    .slice(0, count)
    .map(({ t }) => t)
}

export function isThreadCode(code: string | null | undefined): boolean {
  return !!code && THREADS.has(code)
}

export function thread(code: string): Thread {
  const found = THREADS.get(code)
  if (!found) throw new Error(`Unknown thread code: ${code}`)
  return found
}

export function paletteById(id: string | null | undefined): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]
}

/** The colours a pattern is drawn with, in colour-index order (1 = lettering, 2 = accent). */
export function patternColours(palette: Palette) {
  return { fabric: FABRIC.hex, lettering: thread(palette.lettering.code), accent: thread(palette.accent.code) }
}

/**
 * A pair of threads as a palette, so the chart, key and download treat a
 * custom choice like a recommended one. It keeps the recommended name when
 * the codes match one; otherwise it is named after its two threads.
 */
export function pairPalette(letteringCode: string, accentCode: string): Palette {
  const known = PALETTES.find((p) => p.lettering.code === letteringCode && p.accent.code === accentCode)
  if (known) return known
  const l = thread(letteringCode)
  const a = thread(accentCode)
  return {
    id: 'custom',
    name: `${l.name} and ${a.name}`,
    lettering: { name: l.name, code: l.code },
    accent: { name: a.name, code: a.code },
  }
}
