/** High-resolution ink coverage, one byte per pixel (0 = paper, 255 = ink). */
export interface Mask {
  width: number
  height: number
  data: Uint8Array
}

/**
 * Average ink per block of `scale` × `scale` mask pixels, from 0 to 1.
 * With `scale` = pixels per stitch this is the coverage of each stitch cell.
 */
export function coverage(mask: Mask, scale: number): Float32Array {
  const cols = Math.floor(mask.width / scale)
  const rows = Math.floor(mask.height / scale)
  const out = new Float32Array(cols * rows)
  const full = 255 * scale * scale

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let sum = 0
      for (let y = row * scale; y < (row + 1) * scale; y++) {
        const offset = y * mask.width
        for (let x = col * scale; x < (col + 1) * scale; x++) sum += mask.data[offset + x]
      }
      out[row * cols + col] = sum / full
    }
  }
  return out
}

/** A cell becomes a stitch when its coverage reaches `threshold` (0 to 1). */
export function stitchesFrom(cover: Float32Array, threshold = 0.5): Uint8Array {
  const cells = new Uint8Array(cover.length)
  for (let i = 0; i < cover.length; i++) if (cover[i] >= threshold) cells[i] = 1
  return cells
}

/** Turns a mask into a stitch grid. `scale` is mask pixels per stitch. */
export function downsample(mask: Mask, scale: number, threshold = 0.5): Uint8Array {
  return stitchesFrom(coverage(mask, scale), threshold)
}

/** Drops fully empty rows from the top and bottom of a grid. */
export function trimRows(cells: Uint8Array, width: number): { cells: Uint8Array; height: number; top: number } {
  const height = cells.length / width
  const empty = (row: number) => cells.subarray(row * width, (row + 1) * width).every((c) => c === 0)
  let first = 0
  let last = height - 1
  while (first <= last && empty(first)) first++
  while (last >= first && empty(last)) last--
  return { cells: cells.slice(first * width, (last + 1) * width), height: last - first + 1, top: first }
}
