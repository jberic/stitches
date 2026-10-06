import type { Pattern } from '../pattern/types'

export interface StitchColours {
  /** The first leg of each cross, sewn bottom-left to top-right. */
  under: string
  /** The top leg, a touch lighter so the cross reads as two passes of floss. */
  over: string
}

export interface StitchDrawer {
  total: number
  /** Draws stitches in sewing order up to `count`. Cheap to call every frame. */
  drawUpTo(count: number): void
}

/**
 * Prepares a canvas to show a pattern as stitched thread. Stitches are ordered
 * as a loose left-to-right sweep with a little per-stitch irregularity, so
 * drawing them over time looks hand-sewn rather than scanned.
 */
export function prepareStitches(
  canvas: HTMLCanvasElement,
  pattern: Pattern,
  cell: number,
  colours: StitchColours,
): StitchDrawer {
  const dpr = window.devicePixelRatio || 1
  const w = pattern.width * cell
  const h = pattern.height * cell
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')

  const order: number[] = []
  for (let i = 0; i < pattern.cells.length; i++) if (pattern.cells[i]) order.push(i)
  const key = (i: number) => {
    const x = i % pattern.width
    const y = Math.floor(i / pattern.width)
    // Deterministic wobble: same pattern, same sewing order.
    const wobble = ((x * 31 + y * 17) % 7) * 0.45
    return x + y * 0.5 + wobble
  }
  order.sort((a, b) => key(a) - key(b))

  let drawn = 0
  // Stitch spec from the design handoff: ~20% inset, stroke ~27% of the cell, round caps.
  const inset = cell * 0.2
  const size = cell - inset * 2

  const legs = (from: number, to: number, over: boolean) => {
    if (!ctx) return
    ctx.beginPath()
    for (let k = from; k < to; k++) {
      const i = order[k]
      const left = (i % pattern.width) * cell + inset
      const top = Math.floor(i / pattern.width) * cell + inset
      if (over) {
        ctx.moveTo(left, top)
        ctx.lineTo(left + size, top + size)
      } else {
        ctx.moveTo(left, top + size)
        ctx.lineTo(left + size, top)
      }
    }
    ctx.strokeStyle = over ? colours.over : colours.under
    ctx.stroke()
  }

  const reset = () => {
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1, cell * 0.27)
    drawn = 0
  }
  reset()

  return {
    total: order.length,
    drawUpTo(count: number) {
      const target = Math.max(0, Math.min(order.length, Math.round(count)))
      if (target < drawn) reset()
      if (target === drawn) return
      legs(drawn, target, false)
      legs(drawn, target, true)
      drawn = target
    },
  }
}

/** Mixes two #rrggbb colours; t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const channel = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t)
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`
}
