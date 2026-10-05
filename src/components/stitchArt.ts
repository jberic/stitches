import type { Pattern } from '../pattern/types'

/**
 * Draws a pattern as stitched thread: each stitch is an X, the top leg slightly
 * lighter so the cross reads as two passes of floss. Purely decorative.
 */
export function drawStitches(canvas: HTMLCanvasElement, pattern: Pattern, cell: number, thread: string) {
  const dpr = window.devicePixelRatio || 1
  const w = pattern.width * cell
  const h = pattern.height * cell
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1.2, cell * 0.3)

  const inset = cell * 0.2
  const legs = (under: boolean) => {
    ctx.beginPath()
    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        if (!pattern.cells[y * pattern.width + x]) continue
        const left = x * cell + inset
        const top = y * cell + inset
        const size = cell - inset * 2
        if (under) {
          ctx.moveTo(left, top + size)
          ctx.lineTo(left + size, top)
        } else {
          ctx.moveTo(left, top)
          ctx.lineTo(left + size, top + size)
        }
      }
    }
    ctx.stroke()
  }

  ctx.strokeStyle = thread
  legs(true)
  ctx.strokeStyle = mix(thread, '#ffffff', 0.16)
  legs(false)
}

/** Mixes two #rrggbb colours; t = 0 gives a, t = 1 gives b. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const channel = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t)
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`
}
