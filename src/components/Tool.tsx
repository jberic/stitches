import { useEffect, useId, useRef, useState } from 'react'
import { DEFAULT_WIDTH, MAX_WIDTH, MIN_WIDTH, generatePattern, type GenerateResult } from '../pattern/generate'
import { PHRASE_MESSAGES, MAX_CHARS, parsePhrase } from '../pattern/text'
import { stitchCount } from '../pattern/types'
import { PatternChart } from './PatternChart'
import './Tool.css'

const DEFAULT_TEXT = 'Hello sunshine'
// Placeholder until palettes arrive in step 4.
const INK = '#5f051c'
const FONT = 'Chango'

interface Props {
  inputRef?: React.Ref<HTMLInputElement>
}

export function Tool({ inputRef }: Props) {
  const [text, setText] = useState(DEFAULT_TEXT)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [failed, setFailed] = useState(false)
  const request = useRef(0)
  const widthRef = useRef<HTMLInputElement>(null)
  const ids = { text: useId(), textHint: useId(), width: useId(), status: useId() }

  const phrase = parsePhrase(text)
  const linesKey = phrase.ok ? phrase.lines.join('\n') : null

  useEffect(() => {
    if (linesKey === null) return
    const id = ++request.current
    const timer = window.setTimeout(() => {
      generatePattern({ lines: linesKey.split('\n'), width, font: FONT })
        .then((next) => {
          // Keep the previous pattern on screen until the newest request is ready.
          if (id === request.current) {
            setResult(next)
            setFailed(false)
          }
        })
        .catch(() => id === request.current && setFailed(true))
    }, 90)
    return () => window.clearTimeout(timer)
  }, [linesKey, width])

  const pattern = result?.pattern
  const tooNarrow = result?.tooNarrow
  const charsLeft = MAX_CHARS - text.trim().length

  return (
    <div className="tool">
      <section className="tool-stage" aria-label="Pattern">
        <figure className="sheet">
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
              <span>Stacked block, {FONT}</span>
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
          {phrase.ok && tooNarrow && (
            <p className="notice">
              “{tooNarrow.word}” is too long to read clearly at {width} stitches wide.{' '}
              {tooNarrow.suggestedWidth ? (
                <button type="button" className="link-button" onClick={() => {
                    setWidth(tooNarrow.suggestedWidth!)
                    // This button disappears once the width fits, so keep keyboard focus nearby.
                    widthRef.current?.focus()
                  }}>
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
