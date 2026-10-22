import { useCallback, useEffect, useRef, useState } from 'react'
import stitchMark from './assets/stitch-mark.svg'
import { About } from './components/About'
import { Tool } from './components/Tool'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SITE_NAME, Wordmark } from './components/Wordmark'
import './App.css'

/**
 * waiting: nothing shown until the wordmark is drawn, so nothing jumps.
 * intro:   the wordmark sews itself in, large in the middle of the screen,
 *          and a short line appears word by word.
 * leaving: the line drifts away and the tool rises into place.
 * done:    the page as normal.
 */
type Phase = 'waiting' | 'intro' | 'leaving' | 'done'

const PLAYED_KEY = 'say-it-with-stitches:intro-played'
const INTRO_LINE = 'Type a phrase. Get a cross-stitch pattern.'
const HOLD_MS = 2600
const LEAVE_MS = 1300
/** The longest the page waits for the wordmark before skipping the intro. */
const WAIT_MS = 3000

function shouldPlayIntro(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    // Like a title sequence: once per visit, not on every reload.
    return sessionStorage.getItem(PLAYED_KEY) === null
  } catch {
    return true
  }
}

function rememberIntroPlayed() {
  try {
    sessionStorage.setItem(PLAYED_KEY, '1')
  } catch {
    // Storage can be blocked; the intro just plays again next time.
  }
}

export default function App() {
  const [playIntro] = useState(shouldPlayIntro)
  // Without the intro there is no wordmark to wait for.
  const [phase, setPhase] = useState<Phase>(() => (playIntro ? 'waiting' : 'done'))
  const [finishSignal, setFinishSignal] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const typedDuringIntro = useRef(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const aboutRef = useRef<HTMLButtonElement>(null)
  const closeAbout = useCallback(() => {
    setAboutOpen(false)
    // Back to where the person was; Safari doesn't focus a clicked button by itself.
    aboutRef.current?.focus()
  }, [])

  const onWordmarkReady = useCallback(() => {
    setPhase((p) => (p === 'waiting' ? 'intro' : p))
  }, [])

  const skipIntro = useCallback(() => setPhase('done'), [])

  // Never a blank screen: if the wordmark is slow or fails to draw, go straight to the tool.
  useEffect(() => {
    if (phase !== 'waiting') return
    const timer = window.setTimeout(skipIntro, WAIT_MS)
    return () => window.clearTimeout(timer)
  }, [phase, skipIntro])

  const leave = useCallback(() => {
    setPhase((p) => (p === 'intro' ? 'leaving' : p))
    setFinishSignal((n) => n + 1)
  }, [])

  // Hold, then leave. Any click, tap or scroll leaves straight away.
  useEffect(() => {
    if (phase !== 'intro') return
    const timer = window.setTimeout(leave, HOLD_MS)
    const events = ['pointerdown', 'wheel', 'touchmove'] as const
    events.forEach((e) => window.addEventListener(e, leave, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, leave))
    }
  }, [phase, leave])

  useEffect(() => {
    if (phase !== 'leaving') return
    const timer = window.setTimeout(() => setPhase('done'), LEAVE_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  // The first keystroke lands in the text field, replacing the example phrase.
  useEffect(() => {
    if (phase !== 'intro' && phase !== 'leaving') return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const input = inputRef.current
      if (input && document.activeElement !== input && (e.key.length === 1 || e.key === 'Backspace')) {
        typedDuringIntro.current = true
        input.focus({ preventScroll: true })
        input.setSelectionRange(input.value.length, input.value.length)
      }
      leave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, leave])

  // No scrolling while the intro holds the screen.
  useEffect(() => {
    if (phase !== 'intro' && phase !== 'leaving') return
    const root = document.documentElement
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = ''
    }
  }, [phase])

  // Once the tool is showing, put focus in the text field.
  useEffect(() => {
    if (phase !== 'done') return
    if (playIntro) rememberIntroPlayed()
    const input = inputRef.current
    if (!input || typedDuringIntro.current || document.activeElement !== document.body) return
    // The cursor at the end of the example: typing replaces it, Backspace deletes a letter at a time.
    input.focus({ preventScroll: true })
    input.setSelectionRange(input.value.length, input.value.length)
  }, [phase, playIntro])

  return (
    <div className="page" data-phase={phase} data-entrance={playIntro ? 'intro' : 'quick'}>
      <header className="site-header reveal" style={{ '--order': 0 } as React.CSSProperties}>
        <div className="site-nav">
          <h1 className="site-mark">
            <img src={stitchMark} alt={SITE_NAME} width="32.4" height="32.4" />
          </h1>
          <button ref={aboutRef} type="button" className="about-link" onClick={() => setAboutOpen(true)} aria-haspopup="dialog">
            About
          </button>
        </div>
        <div className="running-stitch" aria-hidden="true" />
      </header>

      {/* Fades in rather than rising: the stage and toolbar are fixed to the screen, and a transform would carry them along. */}
      <main className="reveal reveal-fade" style={{ '--order': 1 } as React.CSSProperties}>
        <ErrorBoundary>
          <Tool inputRef={inputRef} />
        </ErrorBoundary>
      </main>

      {/* Also holds the colour data credit its licence (CC BY 4.0) asks for. */}
      <About open={aboutOpen} onClose={closeAbout} />

      {/* The wordmark only appears here: sewn in large, then gone with the line. */}
      {playIntro && phase !== 'done' && (
        <div className="intro" aria-hidden="true">
          <div className="intro-mark">
            <Wordmark sew onReady={onWordmarkReady} onFailed={skipIntro} finishSignal={finishSignal} />
          </div>
          <p className="intro-line">
            {INTRO_LINE.split(' ').map((word, i) => (
              <span key={i} style={{ '--i': i } as React.CSSProperties}>
                {word}{' '}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  )
}
