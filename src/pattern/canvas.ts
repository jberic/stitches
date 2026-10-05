import type { Mask } from './downsample'

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(width))
  canvas.height = Math.max(1, Math.ceil(height))
  return canvas
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D is not available')
  return ctx
}

export function maskFromCanvas(canvas: HTMLCanvasElement): Mask {
  const { width, height } = canvas
  const rgba = context2d(canvas).getImageData(0, 0, width, height).data
  const data = new Uint8Array(width * height)
  for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4 + 3]
  return { width, height, data }
}

export interface InkBox {
  x: number
  y: number
  width: number
  height: number
}

/** Tight bounding box of everything drawn on the canvas, or null if it is empty. */
export function inkBounds(canvas: HTMLCanvasElement, alphaFloor = 8): InkBox | null {
  const { width, height } = canvas
  const rgba = context2d(canvas).getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > alphaFloor) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}
