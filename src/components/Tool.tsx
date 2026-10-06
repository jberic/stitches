import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { paletteById, patternColours } from '../data/palettes'
import { MAX_WIDTH, MIN_WIDTH, findReadableWidth, generatePattern, type GenerateResult } from '../pattern/generate'
import { describeRecipe, seedWithNewStyle, type Choices, type LetterCase, type Motif } from '../pattern/recipe'
import { PHRASE_MESSAGES, MAX_CHARS, parsePhrase } from '../pattern/text'
import { legendFor } from '../pattern/legend'
import { FABRIC_COUNTS, finishedSize, type FabricCount } from '../pattern/size'
import { addToHistory, encodeCells, entryKey, loadHistory, saveHistory, type HistoryEntry } from '../state/history'
import { readShareState, shareSearch, writeShareState, type ShareState } from '../state/url'
import { HistoryStrip } from './HistoryStrip'
import { Legend } from './Legend'
import { PalettePicker } from './PalettePicker'
import { Segmented } from './Segmented'
import { PatternChart, type ChartColours } from './PatternChart'
import './Tool.css'

interface Props {
  inputRef?: React.Ref<HTMLInputElement>
}

export function Tool({ inputRef }: Props) {
  const [initial] = useState(() => readShareState(window.location.search))
  const [text, setText] = useState(initial.text)
  const [width, setWidth] = useState(initial.width)
  const [seed, setSeed] = useState(initial.seed)
  const [paletteId, setPaletteId] = useState(initial.palette)
  const [fabricCount, setFabricCount] = useState<FabricCount>(initial.fabric)
  const [motif, setMotif] = useState<Motif>(initial.motif)
  const [letterCase, setLetterCase] = useState<LetterCase>(initial.letterCase)
  const choices = useMemo<Choices>(() => ({ motif, letterCase }), [motif, letterCase])
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())
  // Read by the link writer without re-running generation when only the palette changes.
  const paletteRef = useRef(paletteId)
  useEffect(() => {
    paletteRef.current = paletteId
  }, [paletteId])
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [failed, setFailed] = useState(false)
  // Legend highlight: hover or focus previews a colour, a click pins it.
  const [preview, setPreview] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
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
      generatePattern({ lines: linesKey.split('\n'), width, seed, choices })
        .then((next) => {
          // Keep the previous pattern on screen until the newest request is ready.
          if (id !== request.current) return
          setResult(next)
          setFailed(false)
          const mode = historyMode.current
          historyMode.current = 'replace'
          if (mode !== 'none') {
            const current = readShareState(window.location.search)
            const text = linesKey.split('\n').join(' ')
            writeShareState({ ...current, text, seed, width, ...choices, palette: paletteRef.current }, mode)
          }
        })
        .catch(() => id === request.current && setFailed(true))
    }, 90)
    return () => window.clearTimeout(timer)
  }, [linesKey, width, seed, choices])

  // Back and Forward step through styles you have generated.
  useEffect(() => {
    const onPop = () => {
      const state = readShareState(window.location.search)
      historyMode.current = 'none'
      setText(state.text)
      setWidth(state.width)
      setSeed(state.seed)
      setPaletteId(state.palette)
      setFabricCount(state.fabric)
      setMotif(state.motif)
      setLetterCase(state.letterCase)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const generateAgain = () => {
    historyMode.current = 'push'
    setSeed(seedWithNewStyle(result?.recipe, undefined, choices))
    // On short screens the button sits below the pattern; bring the new one into view.
    const sheet = sheetRef.current
    if (sheet && sheet.getBoundingClientRect().top < 0) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      sheet.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
    }
  }

  // A new palette only recolours the pattern; the link is updated in place.
  const choosePalette = (id: string) => {
    setPaletteId(id)
    writeShareState({ ...readShareState(window.location.search), palette: id }, 'replace')
  }

  const chooseFabric = (count: FabricCount) => {
    setFabricCount(count)
    writeShareState({ ...readShareState(window.location.search), fabric: count }, 'replace')
  }

  const palette = paletteById(paletteId)
  const chartColours = useMemo<ChartColours>(() => {
    const { fabric, lettering, accent } = patternColours(palette)
    return { fabric, lettering: lettering.hex, accent: accent.hex }
  }, [palette])

  const pattern = result?.pattern
  const legend = useMemo(() => pattern && legendFor(pattern, palette), [pattern, palette])
  const highlight = preview ?? (legend?.rows.some((r) => r.index === pinned) ? pinned : null)
  const tooNarrow = result?.tooNarrow
  const hardToRead = result && !result.check.ok && !tooNarrow

  // When no attempt was readable, look for the narrowest width that is.
  useEffect(() => {
    if (!result || result.check.ok || result.tooNarrow) return
    let alive = true
    const { meta } = result.pattern
    findReadableWidth(meta.text.split(' '), meta.seed, result.pattern.width, choices).then(
      (width) => alive && setReadableAt({ for: result, width }),
    )
    return () => {
      alive = false
    }
  }, [result, choices])
  const suggestedWidth = readableAt?.for === result ? readableAt.width : null

  const applyWidth = (next: number) => {
    setWidth(next)
    // The button that called this disappears once the width fits, so keep keyboard focus nearby.
    widthRef.current?.focus()
  }
  // The settings behind what's on screen now, for the history strip.
  const shownState = useMemo<ShareState | null>(
    () =>
      pattern
        ? {
            text: pattern.meta.text,
            seed: pattern.meta.seed,
            width: pattern.width,
            palette: palette.id,
            fabric: fabricCount,
            ...choices,
          }
        : null,
    [pattern, palette.id, fabricCount, choices],
  )
  const shownKey = shownState && shareSearch(shownState)

  // A result joins the history once it has stayed on screen for a second,
  // so half-typed words don't fill the strip.
  useEffect(() => {
    if (!pattern || !shownState) return
    const timer = window.setTimeout(() => {
      const entry: HistoryEntry = {
        state: shownState,
        grid: { width: pattern.width, height: pattern.height, cells: encodeCells(pattern.cells) },
        label: `${shownState.text}: ${describeRecipe(pattern.meta.recipe)}, ${palette.name.toLowerCase()}`,
      }
      setHistory((list) => addToHistory(list, entry))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [pattern, shownState, palette.name])

  useEffect(() => saveHistory(history), [history])

  const restore = (entry: HistoryEntry) => {
    if (entryKey(entry) === shownKey) return
    // Write the link now: if only the colours differ, no new pattern is generated to write it.
    writeShareState(entry.state, 'push')
    const regenerates =
      entry.state.text !== shownState?.text ||
      entry.state.seed !== shownState?.seed ||
      entry.state.width !== shownState?.width ||
      entry.state.motif !== shownState?.motif ||
      entry.state.letterCase !== shownState?.letterCase
    // Only a regeneration consumes this; set it otherwise and the next edit wouldn't update the link.
    if (regenerates) historyMode.current = 'none'
    setText(entry.state.text)
    setWidth(entry.state.width)
    setSeed(entry.state.seed)
    setPaletteId(entry.state.palette)
    setFabricCount(entry.state.fabric)
    setMotif(entry.state.motif)
    setLetterCase(entry.state.letterCase)
  }

  const charsLeft = MAX_CHARS - text.trim().length
  const size = pattern && finishedSize(pattern.width, pattern.height, fabricCount)

  return (
    <div className="tool">
      <section className="tool-stage" aria-label="Pattern">
        <figure className="sheet" ref={sheetRef}>
          {pattern ? (
            <PatternChart
              pattern={pattern}
              colours={chartColours}
              highlight={highlight}
              label={`Cross-stitch pattern of “${pattern.meta.text}”, ${pattern.width} by ${pattern.height} stitches, ${palette.name.toLowerCase()}.`}
            />
          ) : (
            <div className="sheet-empty" aria-hidden="true" />
          )}
          {pattern && (
            <figcaption className="sheet-caption">
              <span>{describeRecipe(pattern.meta.recipe)}</span>
              <span className="mono">
                {pattern.width} × {pattern.height} stitches
              </span>
            </figcaption>
          )}
          {legend && (
            <Legend legend={legend} highlight={highlight} pinned={pinned} onPreview={setPreview} onPin={setPinned} />
          )}
        </figure>
        <HistoryStrip entries={history} currentKey={shownKey} onSelect={restore} />
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
            Generate again
          </button>
          <p className="hint">Same words, new style.</p>
        </div>

        <div className="field">
          <PalettePicker value={palette.id} onChange={choosePalette} />
          <p className="hint">Screen colours are approximate. Check against your physical thread card.</p>
        </div>

        <div className="field">
          <Segmented
            legend="Motif"
            options={[
              { value: 'any', label: 'Any' },
              { value: 'nature', label: 'Nature' },
              { value: 'food', label: 'Food' },
              { value: 'none', label: 'None' },
            ]}
            value={motif}
            onChange={(next: Motif) => setMotif(next)}
          />
        </div>

        <div className="field">
          <Segmented
            legend="Letters"
            options={[
              { value: 'typed', label: 'As typed' },
              { value: 'upper', label: 'Capitals' },
              { value: 'lower', label: 'Lowercase' },
            ]}
            value={letterCase}
            onChange={(next: LetterCase) => setLetterCase(next)}
          />
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

        <div className="field">
          <Segmented
            legend="Fabric"
            options={FABRIC_COUNTS.map((count) => ({ value: count, label: `${count}-count` }))}
            value={fabricCount}
            onChange={chooseFabric}
          />
          {size && (
            <p className="finished-size" aria-live="polite">
              <span className="mono">
                {size.cm.width.toFixed(1)} × {size.cm.height.toFixed(1)} cm
              </span>
              <span className="mono finished-size-inches">
                {size.inches.width.toFixed(1)} × {size.inches.height.toFixed(1)} in
              </span>
              <span className="hint-inline">finished design on {fabricCount}-count Aida</span>
            </p>
          )}
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
