import type { Mask } from './downsample'

/** Two sine waves, in mask pixels: one shifts rows sideways, one shifts columns up and down. */
export interface Wave {
  /** Sideways shift, peak, and the vertical distance over which it repeats. */
  ax: number
  wy: number
  /** Up-and-down shift, peak, and the horizontal distance over which it repeats. */
  ay: number
  wx: number
  /** Phases in radians, so the same text doesn't always bend the same way. */
  px: number
  py: number
}

/**
 * Bends a mask with the wave. Each output pixel samples the source at the
 * opposite offset (bilinear), so strokes stay smooth. Pure arithmetic: the
 * same mask and wave always give the same result.
 */
export function warpMask(mask: Mask, wave: Wave): Mask {
  const { width, height, data } = mask
  const out = new Uint8Array(width * height)
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : data[y * width + x])
  const kx = (2 * Math.PI) / wave.wx
  const ky = (2 * Math.PI) / wave.wy
  for (let y = 0; y < height; y++) {
    const dx = wave.ax * Math.sin(y * ky + wave.px)
    for (let x = 0; x < width; x++) {
      const sx = x - dx
      const sy = y - wave.ay * Math.sin(x * kx + wave.py)
      const x0 = Math.floor(sx)
      const y0 = Math.floor(sy)
      const fx = sx - x0
      const fy = sy - y0
      const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx
      const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx
      out[y * width + x] = Math.round(top * (1 - fy) + bottom * fy)
    }
  }
  return { width, height, data: out }
}
