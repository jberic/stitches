import { useEffect, useRef, useState } from 'react'
import { ALPHABETS, type AlphabetId } from '../data/alphabets'
import { FABRIC, paletteById, patternColours } from '../data/palettes'
import { PATTERN_FONTS, type DisplayFont } from '../fonts'
import { MAX_WIDTH, MIN_WIDTH, renderRecipe, type Rendered } from '../pattern/generate'
import { recipeFor, textCase, type Recipe } from '../pattern/recipe'
import { parsePhrase } from '../pattern/text'
import './dev.css'

/**
 * Dev only: every lettering style in the mix on one phrase, each at its own
 * width, with the narrowest width at which it draws the phrase readably by
 * itself (no fallback). Set a width per style and copy the list.
 */

type Style = { id: string; label: string; recipe: Partial<Recipe> }

const STYLES: Style[] = [
  ...(Object.keys(ALPHABETS) as AlphabetId[]).map((id) => ({
    id,
    label: `${ALPHABETS[id].name}${ALPHABETS[id].initial ? ' initial' : ''}`,
    recipe: { alphabet: id, letterGap: 1 } as Partial<Recipe>,
  })),
  ...PATTERN_FONTS.map((font: DisplayFont) => ({
    id: font,
    label: `${font} (font)`,
    recipe: { alphabet: null, font, letterGap: 2, lineGap: 2 } as Partial<Recipe>,
  })),
]

function recipeFor_(style: Style, lines: string[]): Recipe {
  const typed = textCase(lines, 'typed')
  const base = recipeFor('fonts', 0, undefined, { motif: 'none', letterCase: typed })
  // The phrase's own case: the base recipe may have been set in capitals for some other alphabet.
  const recipe: Recipe = {
    ...base,
    effect: 'none',
    icon: null,
    letterCase: typed,
    capitalsFrom: null,
    letterAspect: 1.5,
    lineGap: 1,
    ...style.recipe,
  }
  const alphabet = recipe.alphabet && ALPHABETS[recipe.alphabet]
  if (alphabet && !alphabet.lowercase && recipe.letterCase !== 'upper') {
    recipe.capitalsFrom = recipe.letterCase
    recipe.letterCase = 'upper'
  }
  if (!alphabet && recipe.font === 'Rubik Mono One') recipe.letterCase = 'upper'
  return recipe
}

const fits = (r: Rendered) => !r.check.unsupported && r.check.ok

async function narrowest(style: Style, lines: string[]): Promise<number | null> {
  for (let w = MIN_WIDTH; w <= MAX_WIDTH; w += 2) {
    if (fits(await renderRecipe(lines, w, recipeFor_(style, lines), 'fonts'))) return w
  }
  return null
}

function Mini({ rendered }: { rendered: Rendered }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { pattern } = rendered
    const { lettering, accent } = patternColours(paletteById('01'))
    const cell = 4
    const dpr = window.devicePixelRatio || 1
    canvas.width = (pattern.width + 4) * cell * dpr
    canvas.height = (pattern.height + 4) * cell * dpr
    canvas.style.width = `${(pattern.width + 4) * cell}px`
    ctx.scale(dpr, dpr)
    ctx.fillStyle = FABRIC.hex
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        const v = pattern.cells[y * pattern.width + x]
        if (!v) continue
        ctx.fillStyle = v === 1 ? lettering.hex : accent.hex
        ctx.fillRect((x + 2) * cell, (y + 2) * cell, cell - 0.5, cell - 0.5)
      }
    }
  }, [rendered])
  return <canvas ref={ref} role="img" aria-label={rendered.pattern.meta.text} />
}

function Row({
  style,
  lines,
  width,
  onWidth,
}: {
  style: Style
  lines: string[]
  width: number | undefined
  onWidth: (w: number) => void
}) {
  const [least, setLeast] = useState<number | null | undefined>(undefined)
  const [shown, setShown] = useState<Rendered | null>(null)

  useEffect(() => {
    let alive = true
    setLeast(undefined)
    narrowest(style, lines).then((w) => {
      if (!alive) return
      setLeast(w)
      if (width === undefined) onWidth(w ?? MAX_WIDTH)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, lines.join('\n')])

  useEffect(() => {
    if (width === undefined) return
    let alive = true
    renderRecipe(lines, width, recipeFor_(style, lines), 'fonts').then((r) => alive && setShown(r))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, lines.join('\n'), width])

  const status = !shown
    ? '…'
    : shown.check.unsupported
      ? 'Too wide at this width'
      : shown.check.ok
        ? 'Readable'
        : `Not readable: ${shown.check.reasons[0]}`
  return (
    <section className="font-row">
      <div className="font-row-head">
        <h2>{style.label}</h2>
        <p className="mono">
          Narrowest that works:{' '}
          {least === undefined ? 'measuring…' : least === null ? `not even at ${MAX_WIDTH}` : `${least} stitches`}
        </p>
        <label className="font-row-width">
          Width{' '}
          <input
            type="range"
            min={MIN_WIDTH}
            max={MAX_WIDTH}
            value={width ?? MAX_WIDTH}
            onChange={(e) => onWidth(Number(e.target.value))}
          />
          <span className="mono">{width ?? '—'}</span>
        </label>
        <p className={shown && fits(shown) ? 'font-ok' : 'font-bad'}>{status}</p>
      </div>
      <div className="font-row-sample" style={{ background: FABRIC.hex }}>
        {shown && !shown.check.unsupported && <Mini rendered={shown} />}
      </div>
    </section>
  )
}

export function FontList() {
  const [text, setText] = useState('Say it with stitches')
  const phrase = parsePhrase(text)
  const lines = phrase.ok ? phrase.lines : ['Say', 'it', 'with', 'stitches']
  const [widths, setWidths] = useState<Record<string, number>>({})
  const [copied, setCopied] = useState(false)

  const list = STYLES.map((s) => `${s.label}: ${widths[s.id] ?? '—'}`).join('\n')
  return (
    <main className="dev">
      <header>
        <h1>All styles</h1>
        <p>
          Dev only. Every lettering style in the mix, drawn by itself on one phrase. "Narrowest that works" is the smallest width
          at which the style draws the phrase readably without falling back to another style. Set a width for each, then copy the
          list.
        </p>
        <label>
          Phrase <input value={text} onChange={(e) => setText(e.target.value)} />
        </label>{' '}
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(`Phrase: ${text}\n${list}`)
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          }}
        >
          {copied ? 'Copied' : 'Copy list'}
        </button>
        <pre className="font-list mono">{list}</pre>
      </header>
      {STYLES.map((style) => (
        <Row
          key={style.id}
          style={style}
          lines={lines}
          width={widths[style.id]}
          onWidth={(w) => setWidths((all) => ({ ...all, [style.id]: w }))}
        />
      ))}
    </main>
  )
}
