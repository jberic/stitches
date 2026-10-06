import threads from './threads.json'

/**
 * The 12 stitch palettes from the design handoff ("Cross Stitch Design
 * System", stitch palettes). Each is a fabric, a heart thread in a tone of
 * the fabric, and one lettering thread. No other colours go in a pattern.
 *
 * Threads are stored as codes only; names and screen colours come from
 * threads.json. Codes are the closest thread (CIEDE2000) to the handoff
 * colour that still passes the palette rules: lettering at least 4.5:1 and
 * the heart at least 2:1 against the fabric, in the same tone direction.
 *
 * Fabric colours are on-screen guesses for coloured Aida, not thread data.
 * Three were lightened in OKLCH lightness only, so their closest lettering
 * thread could pass 4.5:1: 01 (ΔE 1.2), 02 (ΔE 3.0) and 10 (ΔE 4.6).
 */

export interface Thread {
  code: string
  name: string
  hex: string
}

export interface Palette {
  id: string
  group: 'brand' | 'complement'
  name: string
  fabric: { name: string; hex: string }
  lettering: { name: string; code: string }
  heart: { tone: 'light' | 'dark'; code: string }
  /** The handoff's on-screen colours, kept for reference and comparison. */
  design: { fabric: string; heart: string; lettering: string }
}

export const PALETTES: Palette[] = [
  {
    id: '01',
    group: 'brand',
    name: 'Mustard with garnet',
    fabric: { name: 'Mustard', hex: '#B9A40E' },
    lettering: { name: 'Garnet', code: '814' },
    heart: { tone: 'light', code: '307' },
    design: { fabric: '#B5A000', heart: '#F7E265', lettering: '#5F051C' },
  },
  {
    id: '02',
    group: 'brand',
    name: 'Olive with garnet',
    fabric: { name: 'Olive', hex: '#A0AB4C' },
    lettering: { name: 'Garnet', code: '814' },
    heart: { tone: 'light', code: '165' },
    design: { fabric: '#96A142', heart: '#D6E384', lettering: '#5F051C' },
  },
  {
    id: '03',
    group: 'brand',
    name: 'Garnet with olive',
    fabric: { name: 'Garnet', hex: '#5F051C' },
    lettering: { name: 'Olive', code: '470' },
    heart: { tone: 'light', code: '3721' },
    design: { fabric: '#5F051C', heart: '#963D48', lettering: '#96A142' },
  },
  {
    id: '04',
    group: 'brand',
    name: 'Blush with pine',
    fabric: { name: 'Blush', hex: '#FFCFC5' },
    lettering: { name: 'Pine', code: '890' },
    heart: { tone: 'dark', code: '3859' },
    design: { fabric: '#FFCFC5', heart: '#C48D81', lettering: '#2E5230' },
  },
  {
    id: '05',
    group: 'brand',
    name: 'Ecru with garnet',
    fabric: { name: 'Ecru', hex: '#F0EADA' },
    lettering: { name: 'Garnet', code: '815' },
    heart: { tone: 'dark', code: '3032' },
    design: { fabric: '#F0EADA', heart: '#AEA694', lettering: '#87071F' },
  },
  {
    id: '06',
    group: 'brand',
    name: 'Sage with plum',
    fabric: { name: 'Sage', hex: '#A9B89A' },
    lettering: { name: 'Plum', code: '35' },
    heart: { tone: 'dark', code: '367' },
    design: { fabric: '#A9B89A', heart: '#6F815D', lettering: '#4A1030' },
  },
  {
    id: '07',
    group: 'complement',
    name: 'Navy with mustard',
    fabric: { name: 'Navy', hex: '#1F2A4D' },
    lettering: { name: 'Mustard', code: '3820' },
    heart: { tone: 'light', code: '792' },
    design: { fabric: '#1F2A4D', heart: '#4B5980', lettering: '#DFB65F' },
  },
  {
    id: '08',
    group: 'complement',
    name: 'Deep teal with blush',
    fabric: { name: 'Deep teal', hex: '#1F4E54' },
    lettering: { name: 'Blush', code: '3824' },
    heart: { tone: 'light', code: '3765' },
    design: { fabric: '#1F4E54', heart: '#4F7D83', lettering: '#FFCFC5' },
  },
  {
    id: '09',
    group: 'complement',
    name: 'Terracotta with cream',
    fabric: { name: 'Terracotta', hex: '#9A3F2B' },
    lettering: { name: 'Cream', code: '739' },
    heart: { tone: 'light', code: '3778' },
    design: { fabric: '#9A3F2B', heart: '#D3725C', lettering: '#FFEBD2' },
  },
  {
    id: '10',
    group: 'complement',
    name: 'Dusty rose with pine',
    fabric: { name: 'Dusty rose', hex: '#DA9A9A' },
    lettering: { name: 'Pine', code: '890' },
    heart: { tone: 'dark', code: '3721' },
    design: { fabric: '#C98B8B', heart: '#9B5355', lettering: '#1E3A2A' },
  },
  {
    id: '11',
    group: 'complement',
    name: 'Charcoal with straw',
    fabric: { name: 'Charcoal', hex: '#1C1B1A' },
    lettering: { name: 'Straw', code: '744' },
    heart: { tone: 'light', code: '413' },
    design: { fabric: '#1C1B1A', heart: '#4D4C4B', lettering: '#EBDF8A' },
  },
  {
    id: '12',
    group: 'complement',
    name: 'Antique blue with garnet',
    fabric: { name: 'Antique blue', hex: '#A2B5C6' },
    lettering: { name: 'Garnet', code: '814' },
    heart: { tone: 'dark', code: '3838' },
    design: { fabric: '#A2B5C6', heart: '#677D91', lettering: '#5F051C' },
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

/** The colours a pattern is drawn with, in colour-index order (1 = lettering, 2 = heart). */
export function patternColours(palette: Palette) {
  return { fabric: palette.fabric.hex, lettering: thread(palette.lettering.code), heart: thread(palette.heart.code) }
}
