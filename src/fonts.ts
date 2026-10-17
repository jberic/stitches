export const DISPLAY_FONTS = [
  'Chango',
  'Shrikhand',
  'Bagel Fat One',
  'Rubik Mono One',
  'Cinzel Decorative',
  'UnifrakturMaguntia',
  'Rye',
  'Bodoni Moda',
] as const

export type DisplayFont = (typeof DISPLAY_FONTS)[number]

/**
 * Fonts the seed can pick for pattern lettering. Chango is left out: shrunk
 * onto the grid it turned into dense blocks. It still draws the wordmark.
 */
export const PATTERN_FONTS: DisplayFont[] = [
  'Shrikhand',
  'Bagel Fat One',
  'Rubik Mono One',
  // From the Claude Design handoff "Stitch Alphabets", turn 1. Its fifth, Pinyon Script, was
  // left out: its hairlines are thinner than a stitch, so no phrase came out readable.
  'Cinzel Decorative',
  'UnifrakturMaguntia',
  'Rye',
  'Bodoni Moda',
]

/** Fonts that draw lowercase as capitals, so they're left out when lowercase is chosen. Cinzel's lowercase is small capitals. */
export const CAPITALS_ONLY: DisplayFont[] = ['Rubik Mono One', 'Cinzel Decorative']

/** Faces with decorative slits cut into their strokes, too thin to stitch open. */
export const INLINE_FONTS: DisplayFont[] = ['Rye']

/** Joined script or blackletter lowercase that needs more stitches per letter to stay readable. */
export const SCRIPT_FONTS: DisplayFont[] = ['Shrikhand', 'UnifrakturMaguntia']

// Canvas text silently falls back to another font if the face isn't loaded yet,
// so the generator must await this before drawing.
export async function loadDisplayFont(font: DisplayFont, sizePx = 100): Promise<void> {
  const spec = `${sizePx}px "${font}"`
  const faces = await document.fonts.load(spec, 'AaBbOo')
  if (faces.length === 0 || !document.fonts.check(spec, 'AaBb')) {
    throw new Error(`Font failed to load: ${font}`)
  }
}
