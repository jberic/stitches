import threads from './threads.json'

/**
 * The 12 thread palettes. Every pattern sits on the same fabric, #FBF3EC, and
 * uses two threads: one for the lettering, one for the icon and shadow.
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

export const PALETTES: Palette[] = [
  { id: '01', name: 'Garnet and mustard', lettering: { name: 'Garnet', code: '814' }, accent: { name: 'Mustard', code: '729' } },
  { id: '02', name: 'Garnet and olive', lettering: { name: 'Garnet', code: '814' }, accent: { name: 'Olive', code: '470' } },
  { id: '04', name: 'Pine and blush', lettering: { name: 'Pine', code: '890' }, accent: { name: 'Blush', code: '21' } },
  { id: '05', name: 'Garnet and mocha', lettering: { name: 'Garnet', code: '815' }, accent: { name: 'Mocha', code: '3023' } },
  { id: '06', name: 'Plum and sage', lettering: { name: 'Plum', code: '35' }, accent: { name: 'Sage', code: '523' } },
  { id: '07', name: 'Navy and mustard', lettering: { name: 'Navy', code: '939' }, accent: { name: 'Mustard', code: '729' } },
  { id: '08', name: 'Deep teal and blush', lettering: { name: 'Deep teal', code: '311' }, accent: { name: 'Blush', code: '21' } },
  {
    id: '09',
    name: 'Terracotta and straw',
    lettering: { name: 'Terracotta', code: '355' },
    accent: { name: 'Straw', code: '833' },
  },
  {
    id: '10',
    name: 'Pine and dusty rose',
    lettering: { name: 'Pine', code: '500' },
    accent: { name: 'Dusty rose', code: '223' },
  },
  { id: '11', name: 'Charcoal and straw', lettering: { name: 'Charcoal', code: '310' }, accent: { name: 'Straw', code: '833' } },
  {
    id: '12',
    name: 'Garnet and antique blue',
    lettering: { name: 'Garnet', code: '814' },
    accent: { name: 'Antique blue', code: '809' },
  },
]

export const DEFAULT_PALETTE_ID = '01'

const THREADS = new Map((threads as Thread[]).map((t) => [t.code, t]))

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
