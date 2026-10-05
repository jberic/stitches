import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { generatePattern } from '../pattern/generate'
import { drawStitches } from './stitchArt'

export type IntroPhase = 'intro' | 'leaving' | 'done'
/** "type" scales the real heading; "stitched" shows the wordmark as a stitch pattern first. */
export type IntroVariant = 'type' | 'stitched'

interface Props {
  phase: IntroPhase
  variant: IntroVariant
  onLeave: () => void
  onDone: () => void
}

const WORDS = ['Say', 'It', 'In', 'Stitches']
/** On narrow screens the intro breaks into "Say it / in / stitches". */
const NARROW_LINES = [[0, 1], [2], [3]]
const WIDE_LINES = [[0, 1, 2, 3]]
const NARROW_MAX = 640
const HOLD_MS = 2000
const STAGGER_MS = 45
const THREAD = '#b8402f'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * The wordmark is the real h1 in the header the whole time. During the intro
 * each word is moved and scaled (transform only) to where a full-width layout
 * would put it, measured from a hidden copy; leaving the intro animates the
 * words back into the header.
 */
export function Wordmark({ phase, variant, onLeave, onDone }: Props) {
  const h1Ref = useRef<HTMLHeadingElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const stitchRef = useRef<HTMLCanvasElement>(null)
  const [narrow] = useState(() => window.innerWidth < NARROW_MAX)
  const [ready, setReady] = useState(false)

  // Place the words in their intro positions before they are shown.
  useLayoutEffect(() => {
    if (phase !== 'intro') return
    if (prefersReducedMotion()) {
      onDone()
      return
    }
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    const root = document.documentElement
    root.style.overflow = 'hidden'

    let cancelled = false
    // The intro must never show fallback type, so wait for Fraunces first.
    document.fonts
      .load('700 100px "Fraunces"', 'Say It In Stitches')
      .catch(() => undefined)
      .then(async () => {
        if (cancelled || !h1Ref.current || !ghostRef.current) return
        if (variant === 'stitched' && stitchRef.current) {
          await drawStitchedWordmark(stitchRef.current)
          if (cancelled) return
        } else {
          placeForIntro(h1Ref.current, ghostRef.current)
        }
        setReady(true)
      })
    return () => {
      cancelled = true
      root.style.overflow = ''
    }
  }, [phase, variant, onDone])

  // Leave after a short hold, or straight away on any interaction.
  useEffect(() => {
    if (phase !== 'intro' || !ready) return
    const timer = window.setTimeout(onLeave, HOLD_MS)
    const events = ['pointerdown', 'wheel', 'touchmove', 'resize'] as const
    events.forEach((e) => window.addEventListener(e, onLeave, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, onLeave))
    }
  }, [phase, ready, onLeave])

  // Shrink the stitched wordmark onto the heading while the heading fades in.
  useEffect(() => {
    if (phase !== 'leaving' || variant !== 'stitched') return
    const canvas = stitchRef.current
    const h1 = h1Ref.current
    if (!canvas || !h1) {
      onDone()
      return
    }
    const from = canvas.getBoundingClientRect()
    const to = h1.getBoundingClientRect()
    const scale = to.width / from.width
    const dy = to.top - from.top + (to.height - from.height * scale) / 2
    canvas.style.transform = `translate(${to.left - from.left}px, ${dy}px) scale(${scale})`
    canvas.style.opacity = '0'
    const fallback = window.setTimeout(onDone, 1600)
    canvas.addEventListener('transitionend', onDone, { once: true })
    return () => {
      canvas.removeEventListener('transitionend', onDone)
      window.clearTimeout(fallback)
    }
  }, [phase, variant, onDone])

  // Animate each word back to its header position.
  useEffect(() => {
    if (phase !== 'leaving' || variant !== 'type') return
    const spans = wordSpans(h1Ref.current)
    spans.forEach((span, i) => {
      span.style.transitionDelay = `${i * STAGGER_MS}ms`
      span.style.transform = ''
    })
    const finish = () => {
      spans.forEach((span) => {
        span.style.transitionDelay = ''
        span.style.transformOrigin = ''
      })
      onDone()
    }
    const last = spans[spans.length - 1]
    last?.addEventListener('transitionend', finish, { once: true })
    // In case the transition never runs (hidden tab, zero duration).
    const fallback = window.setTimeout(finish, 1800)
    return () => {
      last?.removeEventListener('transitionend', finish)
      window.clearTimeout(fallback)
    }
  }, [phase, variant, onDone])

  const lines = narrow ? NARROW_LINES : WIDE_LINES

  return (
    <>
      <h1 ref={h1Ref} className="wordmark" data-phase={phase} data-variant={variant} data-ready={ready || undefined}>
        {WORDS.map((word, i) => (
          <Fragment key={word}>
            {i > 0 && ' '}
            <span className="wordmark-word">{word}</span>
          </Fragment>
        ))}
      </h1>
      {variant === 'stitched' && phase !== 'done' && (
        <div className="wordmark-stitched" aria-hidden="true">
          <canvas ref={stitchRef} />
        </div>
      )}
      {phase === 'intro' && (
        <div ref={ghostRef} className="wordmark-ghost" aria-hidden="true">
          {lines.map((line) => (
            <div key={line.join()} className="wordmark-ghost-line">
              {line.map((index, k) => (
                <Fragment key={index}>
                  {k > 0 && ' '}
                  <span className="wordmark-word" data-index={index}>
                    {WORDS[index]}
                  </span>
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function wordSpans(root: Element | null): HTMLElement[] {
  return root ? [...root.querySelectorAll<HTMLElement>('.wordmark-word')] : []
}

function placeForIntro(h1: HTMLElement, ghost: HTMLElement) {
  // Size the ghost so its widest line fills the screen width.
  const gutter = parseFloat(getComputedStyle(ghost).paddingLeft) || 0
  const available = document.documentElement.clientWidth - gutter * 2
  ghost.style.fontSize = '100px'
  const lines = [...ghost.querySelectorAll<HTMLElement>('.wordmark-ghost-line')]
  const widest = Math.max(...lines.map((line) => line.getBoundingClientRect().width))
  const introSize = (100 * available) / widest
  ghost.style.fontSize = `${introSize}px`

  const targets = new Map<number, DOMRect>()
  ghost.querySelectorAll<HTMLElement>('.wordmark-word').forEach((span) => {
    targets.set(Number(span.dataset.index), span.getBoundingClientRect())
  })

  wordSpans(h1).forEach((span, i) => {
    span.style.transform = ''
    const from = span.getBoundingClientRect()
    const to = targets.get(i)
    if (!to) return
    const scale = introSize / parseFloat(getComputedStyle(span).fontSize)
    span.style.transformOrigin = '0 0'
    span.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scale})`
  })
}

/**
 * Draws "Say it in stitches" with the pattern engine, sized to fill the screen.
 * Two lines on every screen: a line of just "in" swells into an unreadable block.
 */
async function drawStitchedWordmark(canvas: HTMLCanvasElement) {
  const gutter = Math.max(16, Math.min(48, window.innerWidth * 0.04))
  const available = document.documentElement.clientWidth - gutter * 2
  const { pattern } = await generatePattern({ lines: ['Say it in', 'stitches'], width: 64, font: 'Chango' })
  const cell = Math.min(available / pattern.width, (window.innerHeight * 0.8) / pattern.height)
  drawStitches(canvas, pattern, cell, THREAD)
}
