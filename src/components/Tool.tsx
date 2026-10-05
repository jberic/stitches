import { useEffect, useId, useRef, useState } from 'react'
import { MAX_WIDTH, MIN_WIDTH, findReadableWidth, generatePattern, type GenerateResult } from '../pattern/generate'
import { describeRecipe, seedWithNewFont } from '../pattern/recipe'
import { PHRASE_MESSAGES, MAX_CHARS, parsePhrase } from '../pattern/text'
import { stitchCount } from '../pattern/types'
import { readShareState, writeShareState } from '../state/url'
import { PatternChart } from './PatternChart'
import './Tool.css'

// Placeholder until palettes arrive in step 4.
const INK = '#5f051c'

interface Props {
  inputRef?: React.Ref<HTMLInputElement>
}

export function Tool({ inputRef }: Props) {
  const [initial] = useState(() => readShareState(window.location.search))
  const [text, setText] = useState(initial.text)
  const [width, setWidth] = useState(initial.width)
  const [seed, setSeed] = useState(initial.seed)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [failed, setFailed] = useState(false)
  /** For a hard-to-read result: a width that works, keyed by the result it belongs to. */
  const [readableAt, setReadableAt] = useState<{ for: GenerateResult; width: number | null } | null>(null)
  const request = useRef(0)
  /** How the next state change should land in browser history. */
  const historyMode = useRef<'replace' | 'push' | 'none'>('replace')
  const widthRef = useRef<HTMLInputElement>(null)
  const sheetRef = useRef<HTMLElement>(null)
  const ids = { text: useId(), textHint: useId(), width: useId(), status: useId() }

  const phrase = parsePhrase(text)
  const linesKey = phrase.ok ? phrase.lines.join('\n') : null

  useEffect(() => {
    if (linesKey === null) return
    const id = ++request.current
    const timer = window.setTimeout(() => {
      generatePattern({ lines: linesKey.split('\n'), width, seed })
        .then((next) => {
          // Keep the previous pattern on screen until the newest request is ready.
          if (id !== request.current) return
          setResult(next)
          setFailed(false)
          const mode = historyMode.current
          historyMode.current = 'replace'
          if (mode !== 'none') writeShareState({ text: linesKey.split('\n').join(' '), seed, width }, mode)
        })
        .catch(() => id === request.current && setFailed(true))
    }, 90)
    return () => window.clearTimeout(timer)
  }, [linesKey, width, seed])

  // Back and Forward step through styles you have generated.
  useEffect(() => {
    const onPop = () => {
      const state = readShareState(window.location.search)
      historyMode.current = 'none'
      setText(state.text)
      setWidth(state.width)
      setSeed(state.seed)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const generateAgain = () => {
    historyMode.current = 'push'
    setSeed(seedWithNewFont(result?.recipe.font))
    // On short screens the button sits below the pattern; bring the new one into view.
    const sheet = sheetRef.current
    if (sheet && sheet.getBoundingClientRect().top < 0) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      sheet.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
    }
  }

  const pattern = result?.pattern
  const tooNarrow = result?.tooNarrow
  const hardToRead = result && !result.check.ok && !tooNarrow

  // When no attempt was readable, look for the narrowest width that is.
  useEffect(() => {
    if (!result || result.check.ok || result.tooNarrow) return
    let alive = true
    findReadableWidth(result.pattern.meta.text.split(' '), result.pattern.meta.seed, result.pattern.width).then(
      (width) => alive && setReadableAt({ for: result, width }),
    )
    return () => {
      alive = false
    }
  }, [result])
  const suggestedWidth = readableAt?.for === result ? readableAt.width : null

  const applyWidth = (next: number) => {
    setWidth(next)
    // The button that called this disappears once the width fits, so keep keyboard focus nearby.
    widthRef.current?.focus()
  }
  const charsLeft = MAX_CHARS - text.trim().length

  return (
    <div className="tool">
      <section className="tool-stage" aria-label="Pattern">
        <figure className="sheet" ref={sheetRef}>
          {pattern ? (
            <PatternChart
              pattern={pattern}
              ink={INK}
              label={`Cross-stitch pattern of “${pattern.meta.text}”, ${pattern.width} by ${pattern.height} stitches.`}
            />
          ) : (
            <div className="sheet-empty" aria-hidden="true" />
          )}
          {pattern && (
            <figcaption className="sheet-caption">
              <span>{describeRecipe(pattern.meta.recipe)}</span>
              <span className="mono">
                {pattern.width} × {pattern.height} · {stitchCount(pattern).toLocaleString('en')} stitches
              </span>
            </figcaption>
          )}
        </figure>
      </section>

      <section className="tool-controls" aria-label="Pattern settings">
        <div className="field field-phrase">
          <label htmlFor={ids.text} className="eyebrow">
            Your words
          </label>
          <input
            ref={inputRef}
            id={ids.text}
            className="phrase-input"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_CHARS + 10}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${ids.textHint} ${ids.status}`}
            aria-invalid={!phrase.ok}
          />
          <p id={ids.textHint} className="hint">
            Up to four words. Each word gets its own line.
            <span className="mono hint-count" aria-hidden="true">
              {charsLeft}
            </span>
          </p>
        </div>

        <div className="generate">
          <button type="button" className="generate-button" onClick={generateAgain} disabled={!phrase.ok}>
            <span className="generate-icon" aria-hidden="true">
              ✕
            </span>
            Generate again
          </button>
          <p className="hint">Same words, new style.</p>
        </div>

        <div className="field">
          <div className="field-row">
            <label htmlFor={ids.width} className="eyebrow">
              Width
            </label>
            <output htmlFor={ids.width} className="mono value">
              {width} <span>stitches</span>
            </output>
          </div>
          <input
            ref={widthRef}
            id={ids.width}
            className="range"
            type="range"
            min={MIN_WIDTH}
            max={MAX_WIDTH}
            step={1}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            style={{ '--fill': `${((width - MIN_WIDTH) / (MAX_WIDTH - MIN_WIDTH)) * 100}%` } as React.CSSProperties}
          />
          <div className="range-scale mono" aria-hidden="true">
            <span>{MIN_WIDTH}</span>
            <span>{MAX_WIDTH}</span>
          </div>
        </div>

        <div id={ids.status} className="status" role="status" aria-live="polite">
          {!phrase.ok && <p className="notice">{PHRASE_MESSAGES[phrase.reason]}</p>}
          {phrase.ok && failed && <p className="notice">Something went wrong drawing that. Try again.</p>}
          {phrase.ok && hardToRead && (
            <p className="notice">
              This one is hard to read at {width} stitches wide.{' '}
              {suggestedWidth ? (
                <button type="button" className="link-button" onClick={() => applyWidth(suggestedWidth)}>
                  Make it {suggestedWidth} wide
                </button>
              ) : (
                'Try it wider, with fewer words, or generate again.'
              )}
            </p>
          )}
          {phrase.ok && tooNarrow && (
            <p className="notice">
              “{tooNarrow.word}” is too long to read clearly at {width} stitches wide.{' '}
              {tooNarrow.suggestedWidth ? (
                <button type="button" className="link-button" onClick={() => applyWidth(tooNarrow.suggestedWidth!)}>
                  Make it {tooNarrow.suggestedWidth} wide
                </button>
              ) : (
                'Try a shorter word.'
              )}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
