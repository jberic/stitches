import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { pairPalette, patternColours } from '../data/palettes'
import {
  MAX_WIDTH,
  MIN_WIDTH,
  NATURAL_FONT_ROWS,
  generateInStyle,
  readableWidthInStyle,
  type GenerateResult,
} from '../pattern/generate'
import { ALPHABETS } from '../data/alphabets'
import {
  DEFAULT_MOTIF,
  capitalsOnly,
  isAlphabetStyle,
  describeRecipe,
  styleName,
  usesSecondThread,
  type Choices,
  type LetterCase,
  type StyleId,
} from '../pattern/recipe'
import { PHRASE_MESSAGES, MAX_CHARS, parsePhrase } from '../pattern/text'
import { downloadPatternSheet } from '../export/patternImage'
import { legendFor } from '../pattern/legend'
import { FABRIC_COUNTS, finishedSize, type FabricCount } from '../pattern/size'
import { thread } from '../data/palettes'
import { readShareState, startingState, today, writeShareState } from '../state/url'
import { Segmented } from './Segmented'
import { Stage } from './Stage'
import { StylePicker } from './StylePicker'
import { ThreadKey } from './ThreadKey'
import { ThreadPicker } from './ThreadPicker'
import { Toolbar, type ToolbarItem } from './Toolbar'
import type { ChartColours } from './chartPaint'
import './Tool.css'

interface Props {
  inputRef?: React.RefObject<HTMLInputElement | null>
}

/** How many rows tall a style's capitals are at their natural size. */
function naturalRows(style: StyleId): number {
  return isAlphabetStyle(style) ? ALPHABETS[style].sizes.regular.capRows : NATURAL_FONT_ROWS
}

const CASE_LABELS: Record<LetterCase, string> = { typed: 'As typed', upper: 'Capitals', lower: 'Lowercase' }

/** True while the media query matches. */
function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export function Tool({ inputRef }: Props) {
  const [initial] = useState(() => startingState(window.location.search))
  const [text, setText] = useState(initial.text)
  // Untouched since the page opened: the first keystroke replaces the example.
  const [pristine, setPristine] = useState(true)
  const [width, setWidth] = useState(initial.width)
  const [seed, setSeed] = useState(initial.seed)
  const [style, setStyle] = useState<StyleId>(initial.style)
  const [threads, setThreads] = useState({ lettering: initial.lettering, accent: initial.accent })
  const [fabricCount, setFabricCount] = useState<FabricCount>(initial.fabric)
  const [letterCase, setLetterCase] = useState<LetterCase>(initial.letterCase)
  const choices = useMemo<Choices>(() => ({ motif: DEFAULT_MOTIF, letterCase }), [letterCase])
  const threadsRef = useRef(threads)
  useEffect(() => {
    threadsRef.current = threads
  }, [threads])

  /** The newest result, and the last one that could be drawn at all (kept on screen when a phrase doesn't fit). */
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [shown, setShown] = useState<GenerateResult | null>(null)
  const [failed, setFailed] = useState(false)
  const [focused, setFocused] = useState(false)
  // Where the text cursor is, so the stitched one can follow it.
  const [caretIndex, setCaretIndex] = useState(initial.text.length)
  const [download, setDownload] = useState<'idle' | 'busy' | 'failed'>('idle')
  const [preview, setPreview] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  const [readableAt, setReadableAt] = useState<{ for: GenerateResult; width: number | null } | null>(null)
  const request = useRef(0)
  const historyMode = useRef<'replace' | 'push' | 'none'>('replace')
  const wide = useMedia('(min-width: 1440px)')
  const ids = { text: useId(), hint: useId(), width: useId() }

  const phrase = parsePhrase(text)
  const linesKey = phrase.ok ? phrase.lines.join('\n') : null

  useEffect(() => {
    if (linesKey === null) return
    const id = ++request.current
    const timer = window.setTimeout(() => {
      generateInStyle({ lines: linesKey.split('\n'), width: width ?? 'auto', seed, style, choices })
        .then((next) => {
          if (id !== request.current) return
          setResult(next)
          if (!next.check.unsupported) setShown(next)
          setFailed(false)
          const mode = historyMode.current
          historyMode.current = 'replace'
          if (mode !== 'none') {
            const current = readShareState(window.location.search)
            writeShareState(
              { ...current, text: linesKey.split('\n').join(' '), seed, width, style, ...choices, ...threadsRef.current },
              mode,
            )
          }
        })
        .catch(() => id === request.current && setFailed(true))
    }, 90)
    return () => window.clearTimeout(timer)
  }, [linesKey, width, seed, style, choices])

  // Back and Forward step through the styles you picked.
  useEffect(() => {
    const onPop = () => {
      const state = readShareState(window.location.search)
      historyMode.current = 'none'
      setText(state.text)
      setWidth(state.width)
      setSeed(state.seed)
      setStyle(state.style)
      setThreads({ lettering: state.lettering, accent: state.accent })
      setFabricCount(state.fabric)
      setLetterCase(state.letterCase)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // A new style starts at its letters' natural size.
  const chooseStyle = (next: StyleId) => {
    if (next === style) return
    historyMode.current = 'push'
    setStyle(next)
    setWidth(null)
  }

  const chooseThreads = (lettering: string, accent: string) => {
    setThreads({ lettering, accent })
    writeShareState({ ...readShareState(window.location.search), lettering, accent }, 'replace')
  }

  const chooseFabric = (count: FabricCount) => {
    setFabricCount(count)
    writeShareState({ ...readShareState(window.location.search), fabric: count }, 'replace')
  }

  const palette = useMemo(() => pairPalette(threads.lettering, threads.accent), [threads])
  const chartColours = useMemo<ChartColours>(() => {
    const { fabric, lettering, accent } = patternColours(palette)
    return { fabric, lettering: lettering.hex, accent: accent.hex }
  }, [palette])

  // No words, no pattern: deleting the last letter leaves the fabric empty.
  const empty = text.trim() === ''
  const pattern = empty ? null : (shown?.pattern ?? null)
  const legend = useMemo(() => pattern && legendFor(pattern, palette), [pattern, palette])
  const highlight = preview ?? (legend?.rows.some((r) => r.index === pinned) ? pinned : null)
  const unsupported = result?.check.unsupported
  const hardToRead = result && !result.check.ok && !unsupported && !result.tooNarrow
  const tooNarrow = result && !unsupported ? result.tooNarrow : undefined

  // When the pattern isn't readable at this width, look for a width in the same style that is.
  // If the letters don't fit at all, the pattern simply grows to that width as you type:
  // on screen the stitches get smaller, the letters keep every detail.
  useEffect(() => {
    if (!result || result.check.ok || (result.tooNarrow && !result.check.unsupported)) return
    let alive = true
    const doesntFit = result.check.unsupported
    // At Auto the letters already have all the width there is; nothing wider would fit them.
    if (doesntFit && width === null) {
      setReadableAt({ for: result, width: null })
      return
    }
    // From the width this result was drawn at, not the current one: once the pattern has
    // widened, this same result mustn't send it wider again before the new one arrives.
    readableWidthInStyle(result.pattern.meta.lines, seed, style, result.pattern.width, choices).then((found) => {
      if (!alive) return
      if (doesntFit && found) setWidth(found)
      else setReadableAt({ for: result, width: found })
    })
    return () => {
      alive = false
    }
    // The width is read only to tell Auto apart; a change of width brings a new result anyway.
  }, [result, seed, style, choices]) // eslint-disable-line react-hooks/exhaustive-deps
  const searched = readableAt?.for === result
  const suggestedWidth = searched ? readableAt.width : null

  const downloadSheet = async () => {
    if (!pattern || !legend || download === 'busy') return
    setDownload('busy')
    try {
      await downloadPatternSheet({
        pattern,
        legend,
        colours: chartColours,
        fabricCount,
        description: describeRecipe(pattern.meta.recipe),
      })
      setDownload('idle')
    } catch {
      setDownload('failed')
    }
  }

  const size = pattern && finishedSize(pattern.width, pattern.height, fabricCount)
  // What the width slider shows: the chosen width, or at Auto the width the words came out at.
  const shownWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width ?? pattern?.width ?? MIN_WIDTH))
  const capitals = capitalsOnly(style)
  const second = usesSecondThread(style)
  const name = styleName(style)
  const l = thread(threads.lettering)
  const a = thread(threads.accent)

  const onType = (value: string, cursor = value.length) => {
    setPristine(false)
    setText(value)
    setCaretIndex(cursor)
  }

  // A click or tap on the words puts the cursor there, to add or delete letters in place.
  const pickPosition = (index: number) => {
    const field = fieldRef.current
    if (!field) return
    setPristine(false)
    field.focus({ preventScroll: true })
    field.setSelectionRange(index, index)
    setCaretIndex(index)
  }

  // Until you've typed, the example is just a placeholder: the first character
  // you type, paste or delete replaces all of it, wherever the cursor was.
  const ownRef = useRef<HTMLInputElement | null>(null)
  const fieldRef = inputRef ?? ownRef
  useEffect(() => {
    const field = fieldRef.current
    if (!field || !pristine) return
    const onBefore = (e: InputEvent) => {
      e.preventDefault()
      onType(e.inputType.startsWith('delete') ? '' : (e.data ?? e.dataTransfer?.getData('text') ?? ''))
    }
    field.addEventListener('beforeinput', onBefore)
    return () => field.removeEventListener('beforeinput', onBefore)
  }, [pristine, fieldRef])

  const input = (
    <input
      ref={fieldRef}
      id={ids.text}
      className="stage-input"
      type="text"
      value={text}
      onChange={(e) => onType(e.target.value, e.target.selectionStart ?? e.target.value.length)}
      onSelect={(e) => setCaretIndex(e.currentTarget.selectionStart ?? text.length)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      maxLength={MAX_CHARS + 10}
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
      aria-label="Your words"
      aria-describedby={ids.hint}
      aria-invalid={!phrase.ok}
    />
  )

  const keyProps = legend &&
    size &&
    pattern && {
      legend,
      size,
      stitchesWide: pattern.width,
      stitchesHigh: pattern.height,
      fabricCount,
      highlight,
      pinned,
      onPreview: setPreview,
      onPin: setPinned,
    }

  const items: ToolbarItem[] = [
    {
      id: 'type',
      label: 'Typography',
      value: name,
      wide: true,
      panel: (
        <StylePicker
          lines={phrase.ok ? phrase.lines : [today()]}
          seed={seed}
          choices={choices}
          colours={chartColours}
          value={style}
          onChange={chooseStyle}
        />
      ),
    },
    {
      id: 'colours',
      label: 'Colours',
      value: (
        <>
          <span className="toolbar-swatch" style={{ background: l.hex }} />
          {second && <span className="toolbar-swatch" style={{ background: a.hex }} />}
          {l.code}
          {second && ` · ${a.code}`}
        </>
      ),
      panel: (
        <>
          <ThreadPicker lettering={threads.lettering} accent={threads.accent} onChange={chooseThreads} showAccent={second} />
          <p className="hint">Screen colours are approximate. Check against your physical thread card.</p>
        </>
      ),
    },
    {
      id: 'fabric',
      label: 'Fabric',
      value: `${fabricCount}-count`,
      panel: (
        <>
          <Segmented
            legend="Aida count"
            options={FABRIC_COUNTS.map((count) => ({ value: count, label: `${count}` }))}
            value={fabricCount}
            onChange={chooseFabric}
          />
          {size && (
            <p className="hint">
              Finished design: {size.cm.width.toFixed(1)} × {size.cm.height.toFixed(1)} cm ({size.inches.width.toFixed(1)} ×{' '}
              {size.inches.height.toFixed(1)} in)
            </p>
          )}
        </>
      ),
    },
    {
      id: 'width',
      label: 'Width',
      value: width === null ? `Auto · ${shownWidth}` : `${width} stitches`,
      panel: (
        <div className="width-control">
          <div className="field-row">
            <label htmlFor={ids.width} className="eyebrow">
              Stitches wide
            </label>
            <output htmlFor={ids.width} className="mono value">
              {shownWidth}
            </output>
          </div>
          <input
            id={ids.width}
            className="range"
            type="range"
            min={MIN_WIDTH}
            max={MAX_WIDTH}
            step={1}
            value={shownWidth}
            onChange={(e) => setWidth(Number(e.target.value))}
            style={{ '--fill': `${((shownWidth - MIN_WIDTH) / (MAX_WIDTH - MIN_WIDTH)) * 100}%` } as React.CSSProperties}
          />
          <div className="range-scale mono" aria-hidden="true">
            <span>{MIN_WIDTH}</span>
            <span>{MAX_WIDTH}</span>
          </div>
          <button type="button" className="width-auto" aria-pressed={width === null} onClick={() => setWidth(null)}>
            Auto
          </button>
          <p className="hint">
            {width === null
              ? 'Auto keeps the letters at their natural size, and the pattern as wide as your words. Drag to make them bigger.'
              : 'Wider makes the letters bigger. Auto puts them back to their natural size.'}
          </p>
        </div>
      ),
    },
    {
      id: 'letters',
      label: 'Letters',
      value: capitals ? 'Capitals' : CASE_LABELS[letterCase],
      panel: (
        <>
          <Segmented
            legend="Case"
            options={(['typed', 'upper', 'lower'] as LetterCase[]).map((value) => ({
              value,
              label: CASE_LABELS[value],
              disabled: capitals && value === 'lower',
            }))}
            value={letterCase}
            onChange={(next: LetterCase) => setLetterCase(next)}
          />
          {capitals && <p className="hint">{name} only has capitals, so your words are stitched in capitals.</p>}
        </>
      ),
    },
  ]
  if (!wide && keyProps) {
    items.push({
      id: 'threads',
      label: 'Threads',
      value: `${keyProps.legend.total.toLocaleString('en')} stitches`,
      panel: <ThreadKey {...keyProps} />,
    })
  }

  return (
    <div className="tool">
      <Stage
        pattern={pattern}
        colours={chartColours}
        label={
          pattern
            ? `Cross-stitch pattern of “${pattern.meta.text}” in ${name}, ${pattern.width} by ${pattern.height} stitches. Type to change the words.`
            : 'Cross-stitch pattern'
        }
        highlight={highlight}
        sewKey={`${style}|${letterCase}`}
        above=".site-header"
        below=".toolbar-wrap"
        input={input}
        focused={focused}
        text={text}
        letters={empty ? [] : (shown?.letters ?? [])}
        caretIndex={caretIndex}
        onPick={pickPosition}
        naturalRows={naturalRows(style)}
      >
        <div id={ids.hint} role="status" aria-live="polite">
          {empty ? (
            <p className="stage-hint">Type your own words · up to four</p>
          ) : !phrase.ok ? (
            <p className="stage-notice">{PHRASE_MESSAGES[phrase.reason]}</p>
          ) : failed ? (
            <p className="stage-notice">Something went wrong drawing that. Try again.</p>
          ) : download === 'failed' ? (
            <p className="stage-notice">The download didn't work. Try again.</p>
          ) : unsupported ? (
            // While it looks for a width that fits, say nothing; the pattern widens itself.
            searched ? (
              <p className="stage-notice">
                Too long for {name}, even at {MAX_WIDTH} stitches. Try fewer letters or another style.
              </p>
            ) : null
          ) : tooNarrow ? (
            <p className="stage-notice">
              “{tooNarrow.word}” is too long to read clearly at {shownWidth} stitches wide.{' '}
              {tooNarrow.suggestedWidth ? (
                <button type="button" className="link-button" onClick={() => setWidth(tooNarrow.suggestedWidth!)}>
                  Make it {tooNarrow.suggestedWidth} wide
                </button>
              ) : (
                'Try a shorter word.'
              )}
            </p>
          ) : hardToRead && searched ? (
            <p className="stage-notice">
              Hard to read in {name} at {shownWidth} stitches.{' '}
              {suggestedWidth ? (
                <button type="button" className="link-button" onClick={() => setWidth(suggestedWidth)}>
                  Make it {suggestedWidth} wide
                </button>
              ) : (
                'Try a wider pattern or another style.'
              )}
            </p>
          ) : pristine ? (
            <p className="stage-hint">Type your own words · up to four</p>
          ) : null}
        </div>
      </Stage>

      {wide && keyProps && <ThreadKey {...keyProps} card />}

      <Toolbar
        items={items}
        action={
          <button type="button" className="toolbar-download" onClick={downloadSheet} disabled={!pattern || download === 'busy'}>
            {download === 'busy' ? 'Preparing…' : 'Download'}
          </button>
        }
        compactAction={
          <button
            type="button"
            className="toolbar-download-icon"
            onClick={downloadSheet}
            disabled={!pattern || download === 'busy'}
            aria-label={download === 'busy' ? 'Preparing the download' : 'Download the chart as an image'}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" />
            </svg>
          </button>
        }
      />
    </div>
  )
}
