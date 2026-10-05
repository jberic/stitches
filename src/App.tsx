import { useCallback, useEffect, useRef, useState } from 'react'
import { Tool } from './components/Tool'
import { Wordmark } from './components/Wordmark'
import './App.css'

/**
 * waiting: nothing shown until the wordmark is drawn, so nothing jumps.
 * intro:   the wordmark sews itself in and a short line appears word by word.
 * leaving: the line drifts away and the tool rises into place.
 * done:    the page as normal.
 */
type Phase = 'waiting' | 'intro' | 'leaving' | 'done'

const PLAYED_KEY = 'say-it-with-stitches:intro-played'
const INTRO_LINE = 'Type a phrase. Get a cross-stitch pattern.'
const HOLD_MS = 2600
const LEAVE_MS = 1300

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
  const [phase, setPhase] = useState<Phase>('waiting')
  const [finishSignal, setFinishSignal] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const typedDuringIntro = useRef(false)

  const onWordmarkReady = useCallback(() => {
    setPhase((p) => (p === 'waiting' ? (playIntro ? 'intro' : 'done') : p))
  }, [playIntro])

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
        input.select()
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
    input.focus({ preventScroll: true })
    // Selecting lets a typed phrase replace the example. On touch screens the
    // keyboard isn't open yet, so a selection would only look like a glitch.
    if (window.matchMedia('(pointer: fine)').matches) input.select()
  }, [phase, playIntro])

  return (
    <div className="page" data-phase={phase} data-entrance={playIntro ? 'intro' : 'quick'}>
      <header className="masthead">
        <Wordmark sew={playIntro} onReady={onWordmarkReady} finishSignal={finishSignal} />
        <p className="tagline reveal" style={{ '--order': 0 } as React.CSSProperties}>
          Type a phrase, get a cross-stitch pattern.
        </p>
      </header>

      <main className="reveal" style={{ '--order': 1 } as React.CSSProperties}>
        <Tool inputRef={inputRef} />
      </main>

      <footer className="colophon reveal" style={{ '--order': 2 } as React.CSSProperties}>
        <p>
          Colour data: <a href="https://github.com/makebead/craft-color-codes">craft-color-codes</a> by MakeBead (CC
          BY 4.0). Not affiliated with any thread maker.
        </p>
      </footer>

      {playIntro && (phase === 'intro' || phase === 'leaving') && (
        <p className="intro-line" aria-hidden="true">
          {INTRO_LINE.split(' ').map((word, i) => (
            <span key={i} style={{ '--i': i } as React.CSSProperties}>
              {word}{' '}
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
