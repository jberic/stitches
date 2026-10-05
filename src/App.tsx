import { useCallback, useEffect, useRef, useState } from 'react'
import { Tool } from './components/Tool'
import { Wordmark, type IntroPhase, type IntroVariant } from './components/Wordmark'
import './App.css'

// Temporary: ?intro=stitched shows the stitched wordmark, for comparing the two intros.
const INTRO_VARIANT: IntroVariant =
  new URLSearchParams(window.location.search).get('intro') === 'stitched' ? 'stitched' : 'type'

function initialPhase(): IntroPhase {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'done' : 'intro'
}

export default function App() {
  const [phase, setPhase] = useState<IntroPhase>(initialPhase)
  const inputRef = useRef<HTMLInputElement>(null)
  const typedDuringIntro = useRef(false)

  const leave = useCallback(() => setPhase((p) => (p === 'intro' ? 'leaving' : p)), [])
  const done = useCallback(() => setPhase('done'), [])

  // The first keystroke ends the intro and lands in the text field, replacing
  // the example phrase instead of being lost.
  useEffect(() => {
    if (phase !== 'intro') return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const input = inputRef.current
      if (input && (e.key.length === 1 || e.key === 'Backspace')) {
        typedDuringIntro.current = true
        input.focus({ preventScroll: true })
        input.select()
      }
      leave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, leave])

  // Once the tool is showing, put focus in the text field.
  useEffect(() => {
    if (phase !== 'done' || typedDuringIntro.current) return
    const input = inputRef.current
    if (input && document.activeElement === document.body) {
      input.focus({ preventScroll: true })
      // Selecting lets a typed phrase replace the example. On touch screens the
      // keyboard isn't open yet, so a selection would only look like a glitch.
      if (window.matchMedia('(pointer: fine)').matches) input.select()
    }
  }, [phase])

  return (
    <div className="page" data-intro={phase}>
      <header className="masthead">
        <Wordmark phase={phase} variant={INTRO_VARIANT} onLeave={leave} onDone={done} />
        <p className="tagline reveal">Type a phrase, get a cross-stitch pattern.</p>
      </header>

      <main className="reveal">
        <Tool inputRef={inputRef} />
      </main>

      <footer className="colophon reveal">
        <p>
          Colour data: <a href="https://github.com/makebead/craft-color-codes">craft-color-codes</a> by MakeBead (CC
          BY 4.0). Not affiliated with any thread maker.
        </p>
      </footer>
    </div>
  )
}
