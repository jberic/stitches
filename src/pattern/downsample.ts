/** High-resolution ink coverage, one byte per pixel (0 = paper, 255 = ink). */
export interface Mask {
  width: number
  height: number
  data: Uint8Array
}

/**
 * Turns a mask into a stitch grid. `scale` is mask pixels per stitch; a cell
 * becomes a stitch when its average coverage reaches `threshold` (0 to 1).
 */
export function downsample(mask: Mask, scale: number, threshold = 0.5): Uint8Array {
  const cols = Math.floor(mask.width / scale)
  const rows = Math.floor(mask.height / scale)
  const cells = new Uint8Array(cols * rows)
  const limit = threshold * 255 * scale * scale

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let sum = 0
      for (let y = row * scale; y < (row + 1) * scale; y++) {
        const offset = y * mask.width
        for (let x = col * scale; x < (col + 1) * scale; x++) sum += mask.data[offset + x]
      }
      if (sum >= limit) cells[row * cols + col] = 1
    }
  }
  return cells
}

/** Drops fully empty rows from the top and bottom of a grid. */
export function trimRows(cells: Uint8Array, width: number): { cells: Uint8Array; height: number } {
  const height = cells.length / width
  const empty = (row: number) => cells.subarray(row * width, (row + 1) * width).every((c) => c === 0)
  let first = 0
  let last = height - 1
  while (first <= last && empty(first)) first++
  while (last >= first && empty(last)) last--
  return { cells: cells.slice(first * width, (last + 1) * width), height: last - first + 1 }
}
