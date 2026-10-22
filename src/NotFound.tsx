import { useCallback, useEffect, useRef } from 'react'
import stitchMark from './assets/stitch-mark.svg'
import { SITE_NAME, Wordmark } from './components/Wordmark'
import './App.css'
import './NotFound.css'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const noop = () => {}
const STITCHES_WIDE = 40

/** The page for an address that doesn't exist: "404" sewn in on the fabric, and the way back. */
export function NotFound() {
  const pageRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLDivElement>(null)

  // The fabric grid in step with the stitches: one square per stitch, lined up with them.
  const align = useCallback(() => {
    const page = pageRef.current
    const canvas = markRef.current?.querySelector('canvas')
    if (!page || !canvas) return
    const box = canvas.getBoundingClientRect()
    const cell = box.width / STITCHES_WIDE
    if (!cell) return
    const top = box.top + window.scrollY
    page.style.backgroundSize = `${cell}px ${cell}px`
    page.style.backgroundPosition = `${box.left % cell}px ${top % cell}px`
  }, [])

  useEffect(() => {
    window.addEventListener('resize', align)
    return () => window.removeEventListener('resize', align)
  }, [align])

  return (
    <div ref={pageRef} className="page not-found">
      <header className="site-header">
        <div className="site-nav">
          <a className="site-mark" href="/">
            <img src={stitchMark} alt={SITE_NAME} width="32.4" height="32.4" />
          </a>
        </div>
        <div className="running-stitch" aria-hidden="true" />
      </header>
      <main className="not-found-body">
        <div ref={markRef} className="not-found-mark">
          <Wordmark
            sew={!reduced}
            lines={['404']}
            stitchesWide={STITCHES_WIDE}
            widest={() => 480}
            onReady={align}
            onFailed={noop}
            finishSignal={0}
          />
        </div>
        <h1>Oh no, we’re still stitching this page together</h1>
        <p>Check back soon, or start a pattern of your own.</p>
        <a className="not-found-home" href="/">
          Start stitching
        </a>
      </main>
    </div>
  )
}
