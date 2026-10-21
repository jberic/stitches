import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { pairPalette, patternColours } from '../data/palettes'
import {
  MAX_WIDTH,
  MIN_WIDTH,
  generateInStyle,
  readableWidthInStyle,
  startingWidth,
  type GenerateResult,
} from '../pattern/generate'
import {
  DEFAULT_MOTIF,
  capitalsOnly,
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
import { styleWidth } from '../pattern/styleWidths'
import { thread } from '../data/palettes'
import { readShareState, startingState, writeShareState } from '../state/url'
import { Segmented } from './Segmented'
import { Stage } from './Stage'
import { StylePicker } from './StylePicker'
import { ThreadKey } from './ThreadKey'
import { ThreadPicker } from './ThreadPicker'
import { Toolbar, type ToolbarItem } from './Toolbar'
import type { ChartColours } from './PatternChart'
import './Tool.css'

interface Props {
  inputRef?: React.RefObject<HTMLInputElement | null>
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
  const [download, setDownload] = useState<'idle' | 'busy' | 'failed'>('idle')
  const [preview, setPreview] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  const [readableAt, setReadableAt] = useState<{ for: GenerateResult; width: number | null } | null>(null)
  const request = useRef(0)
  const styleRequest = useRef<StyleId | null>(null)
  const historyMode = useRef<'replace' | 'push' | 'none'>('replace')
  const wide = useMedia('(min-width: 1440px)')
  const ids = { text: useId(), hint: useId(), width: useId() }

  const phrase = parsePhrase(text)
  const linesKey = phrase.ok ? phrase.lines.join('\n') : null

  useEffect(() => {
    if (linesKey === null) return
    const id = ++request.current
    const timer = window.setTimeout(() => {
      generateInStyle({ lines: linesKey.split('\n'), width, seed, style, choices })
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

  const chooseStyle = async (next: StyleId) => {
    if (next === style) return
    // Show the new style straight away at its usual width, then settle on the width that suits these words.
    historyMode.current = 'push'
    styleRequest.current = next
    setStyle(next)
    setWidth(styleWidth(next, width))
    if (!phrase.ok) return
    const fitted = await startingWidth(phrase.lines, seed, next, choices)
    // Only if no other style was picked meanwhile.
    if (styleRequest.current === next) setWidth(fitted)
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

  const pattern = shown?.pattern ?? null
  const legend = useMemo(() => pattern && legendFor(pattern, palette), [pattern, palette])
  const highlight = preview ?? (legend?.rows.some((r) => r.index === pinned) ? pinned : null)
  const unsupported = result?.check.unsupported
  const hardToRead = result && !result.check.ok && !unsupported && !result.tooNarrow
  const tooNarrow = result && !unsupported ? result.tooNarrow : undefined

  // When the pattern isn't readable at this width, look for a width in the same style that is.
  useEffect(() => {
    if (!result || result.check.ok || (result.tooNarrow && !result.check.unsupported)) return
    let alive = true
    readableWidthInStyle(result.pattern.meta.lines, seed, style, width, choices).then(
      (found) => alive && setReadableAt({ for: result, width: found }),
    )
    return () => {
      alive = false
    }
  }, [result, seed, style, width, choices])
  const suggestedWidth = readableAt?.for === result ? readableAt.width : null

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
  const capitals = capitalsOnly(style)
  const second = usesSecondThread(style)
  const name = styleName(style)
  const l = thread(threads.lettering)
  const a = thread(threads.accent)

  const onType = (value: string) => {
    setPristine(false)
    setText(value)
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
      onChange={(e) => onType(e.target.value)}
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
          lines={phrase.ok ? phrase.lines : ['Hello', 'sunshine']}
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
      value: `${width} stitches`,
      panel: (
        <div className="width-control">
          <div className="field-row">
            <label htmlFor={ids.width} className="eyebrow">
              Stitches wide
            </label>
            <output htmlFor={ids.width} className="mono value">
              {width}
            </output>
          </div>
          <input
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
      >
        <div id={ids.hint} role="status" aria-live="polite">
          {!phrase.ok ? (
            <p className="stage-notice">{PHRASE_MESSAGES[phrase.reason]}</p>
          ) : failed ? (
            <p className="stage-notice">Something went wrong drawing that. Try again.</p>
          ) : download === 'failed' ? (
            <p className="stage-notice">The download didn't work. Try again.</p>
          ) : unsupported ? (
            <p className="stage-notice">
              Too long for {name} at {width} stitches.{' '}
              {suggestedWidth ? (
                <button type="button" className="link-button" onClick={() => setWidth(suggestedWidth)}>
                  Make it {suggestedWidth} wide
                </button>
              ) : (
                'Try fewer letters or another style.'
              )}
            </p>
          ) : tooNarrow ? (
            <p className="stage-notice">
              “{tooNarrow.word}” is too long to read clearly at {width} stitches wide.{' '}
              {tooNarrow.suggestedWidth ? (
                <button type="button" className="link-button" onClick={() => setWidth(tooNarrow.suggestedWidth!)}>
                  Make it {tooNarrow.suggestedWidth} wide
                </button>
              ) : (
                'Try a shorter word.'
              )}
            </p>
          ) : hardToRead ? (
            <p className="stage-notice">
              Hard to read in {name} at {width} stitches.{' '}
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
      />
    </div>
  )
}
