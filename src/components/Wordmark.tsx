import { useEffect, useRef } from 'react'
import { renderWordmark } from '../pattern/generate'
import type { Pattern } from '../pattern/types'
import { prepareStitches, type StitchDrawer } from './stitchArt'
import { introWordmarkWidth } from './wordmarkSize'

export const SITE_NAME = 'Say It With Stitches'

const LINES = ['Say it with stitches']
const STITCHES_WIDE = 120
const SEW_MS = 1100


interface Props {
  /** Sew the stitches in over about a second instead of showing them at once. */
  sew: boolean
  /** Called once the first drawing is on screen (or sewing has started). */
  onReady: () => void
  /** Bumped by the parent to finish sewing immediately. */
  finishSignal: number
}

function cssColour(el: Element, name: string) {
  return getComputedStyle(el).getPropertyValue(name).trim()
}

/** The site's heading, drawn as a stitch pattern by the same engine as the tool. */
export function Wordmark({ sew, onReady, finishSignal }: Props) {
  const h1Ref = useRef<HTMLHeadingElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawerRef = useRef<StitchDrawer | null>(null)
  const sewRef = useRef(sew)
  const frameRef = useRef(0)
  const readyRef = useRef(onReady)

  useEffect(() => {
    readyRef.current = onReady
  }, [onReady])

  useEffect(() => {
    const h1 = h1Ref.current
    const canvas = canvasRef.current
    if (!h1 || !canvas) return
    const patternReady: Promise<Pattern> = renderWordmark(LINES, STITCHES_WIDE)
    let lastCell = 0
    let alive = true

    const render = async () => {
      const pattern = await patternReady
      if (!alive) return
      const cell = Math.max(h1.clientWidth, introWordmarkWidth()) / pattern.width
      if (cell === lastCell) return
      lastCell = cell

      const drawer = prepareStitches(canvas, pattern, cell, {
        under: cssColour(h1, '--wordmark-under'),
        over: cssColour(h1, '--wordmark-over'),
      })
      // Drawn large, shown at whatever size the header gives it.
      canvas.style.width = '100%'
      canvas.style.height = 'auto'
      drawerRef.current = drawer
      cancelAnimationFrame(frameRef.current)

      if (sewRef.current) {
        sewRef.current = false
        const start = performance.now()
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / SEW_MS)
          // Ease out: quick at first, settling as the last stitches go in.
          drawer.drawUpTo(drawer.total * (1 - Math.pow(1 - t, 3)))
          if (t < 1) frameRef.current = requestAnimationFrame(step)
        }
        frameRef.current = requestAnimationFrame(step)
      } else {
        drawer.drawUpTo(drawer.total)
      }
      readyRef.current()
    }

    const observer = new ResizeObserver(() => void render())
    observer.observe(document.documentElement)
    return () => {
      alive = false
      observer.disconnect()
      cancelAnimationFrame(frameRef.current)
    }
  }, [])

  useEffect(() => {
    if (finishSignal === 0) return
    cancelAnimationFrame(frameRef.current)
    const drawer = drawerRef.current
    if (drawer) drawer.drawUpTo(drawer.total)
  }, [finishSignal])

  return (
    <h1 ref={h1Ref} className="wordmark">
      <span className="visually-hidden">{SITE_NAME}</span>
      <canvas ref={canvasRef} className="wordmark-canvas" aria-hidden="true" />
    </h1>
  )
}
