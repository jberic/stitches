export const DISPLAY_FONTS = ['Chango', 'Shrikhand', 'Bagel Fat One', 'Rubik Mono One'] as const

export type DisplayFont = (typeof DISPLAY_FONTS)[number]

// Canvas text silently falls back to another font if the face isn't loaded yet,
// so the generator must await this before drawing.
export async function loadDisplayFont(font: DisplayFont, sizePx = 100): Promise<void> {
  const spec = `${sizePx}px "${font}"`
  const faces = await document.fonts.load(spec, 'AaBbOo')
  if (faces.length === 0 || !document.fonts.check(spec, 'AaBb')) {
    throw new Error(`Font failed to load: ${font}`)
  }
}
