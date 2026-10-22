import { useEffect, useRef, useState } from 'react'
import { DEFAULT_WIDTH, MAX_WIDTH, generateInStyle } from '../pattern/generate'
import { STYLE_CHOICES, capitalsOnly, styleName, type Choices, type StyleId } from '../pattern/recipe'
import { styleWidth } from '../pattern/styleWidths'
import type { Pattern } from '../pattern/types'
import type { ChartColours } from './chartPaint'
import './StylePicker.css'

interface Props {
  lines: string[]
  seed: string
  choices: Choices
  colours: ChartColours
  value: StyleId
  onChange: (style: StyleId) => void
}

/** Previews already drawn, by words, case and style, so reopening the panel is instant. */
const cache = new Map<string, Pattern | null>()
/** Previews that couldn't be drawn (a font that didn't load). Not cached, so opening the panel again retries them. */
const failed = new Set<string>()

function Preview({ pattern, colours }: { pattern: Pattern | null | undefined; colours: ChartColours }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    if (!pattern) return
    const cell = Math.min((w - 8) / pattern.width, (h - 8) / pattern.height)
    const ox = (w - pattern.width * cell) / 2
    const oy = (h - pattern.height * cell) / 2
    const inks = ['', colours.lettering, colours.accent]
    for (let y = 0; y < pattern.height; y++) {
      for (let x = 0; x < pattern.width; x++) {
        const v = pattern.cells[y * pattern.width + x]
        if (!v) continue
        ctx.fillStyle = inks[v]
        ctx.fillRect(ox + x * cell, oy + y * cell, Math.ceil(cell), Math.ceil(cell))
      }
    }
  }, [pattern, colours])
  return <canvas ref={ref} className="style-preview" aria-hidden="true" />
}

/**
 * Typography: every style, each showing your own words, so you see what you'd
 * get before you pick. Previews are drawn one at a time in the background.
 */
export function StylePicker({ lines, seed, choices, colours, value, onChange }: Props) {
  const [, redraw] = useState(0)
  const words = lines.join('\n')
  const { letterCase } = choices
  const key = (style: StyleId) => `${words}|${letterCase}|${style}`

  useEffect(() => {
    let alive = true
    failed.clear()
    ;(async () => {
      // The chosen style first, so its tile fills straight away.
      const order = [value, ...STYLE_CHOICES.filter((s) => s !== value)]
      for (const style of order) {
        const id = `${words}|${letterCase}|${style}`
        if (!alive) return
        if (cache.has(id)) continue
        try {
          const draw = (width: number) =>
            generateInStyle({ lines: words.split('\n'), width, seed, style, choices: { ...choices, letterCase } })
          // At the style's usual width first; if the words don't fit, at the widest a pattern can be.
          let result = await draw(styleWidth(style, DEFAULT_WIDTH))
          if (result.check.unsupported) result = await draw(MAX_WIDTH)
          cache.set(id, result.check.unsupported ? null : result.pattern)
        } catch {
          failed.add(id)
        }
        if (alive) redraw((n) => n + 1)
      }
    })()
    return () => {
      alive = false
    }
    // Only the words, case and seed change what the previews look like; the chosen style just goes first.
  }, [words, letterCase, seed]) // eslint-disable-line react-hooks/exhaustive-deps

  // One Tab stop for the whole grid, on the chosen style; the arrow keys move around it, Enter or Space picks.
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const tiles = [...e.currentTarget.querySelectorAll<HTMLElement>('.style-tile')]
    const at = tiles.indexOf(document.activeElement as HTMLElement)
    if (at < 0) return
    // Columns as laid out: the tiles whose top matches the first one's.
    const top = tiles[0].offsetTop
    const columns = Math.max(1, tiles.filter((t) => t.offsetTop === top).length)
    const moves: Record<string, number> = {
      ArrowRight: at + 1,
      ArrowLeft: at - 1,
      ArrowDown: at + columns,
      ArrowUp: at - columns,
      Home: 0,
      End: tiles.length - 1,
    }
    const to = moves[e.key]
    if (to === undefined) return
    e.preventDefault()
    const tile = tiles[Math.min(Math.max(to, 0), tiles.length - 1)]
    tiles.forEach((t) => (t.tabIndex = t === tile ? 0 : -1))
    tile.focus({ preventScroll: true })
    tile.scrollIntoView({ block: 'nearest' })
  }

  return (
    <div className="styles" role="group" aria-label="Lettering styles" onKeyDown={onKey}>
      {STYLE_CHOICES.map((style) => {
        const preview = cache.get(key(style))
        return (
          <button
            key={style}
            type="button"
            className="style-tile"
            aria-pressed={style === value}
            tabIndex={style === value ? 0 : -1}
            onClick={() => onChange(style)}
          >
            <Preview pattern={preview} colours={colours} />
            <span className="style-name">
              {styleName(style)}
              {capitalsOnly(style) && <span className="style-tag">Capitals</span>}
            </span>
            {preview === null && <span className="style-note">Your words don't fit in {MAX_WIDTH} stitches</span>}
            {preview === undefined && failed.has(key(style)) && (
              <span className="style-note">Didn't load. Check your connection.</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
