import { useEffect, useRef, useState } from 'react'
import { ALPHABETS } from '../data/alphabets'
import { FABRIC, PALETTES, paletteById, patternColours } from '../data/palettes'
import { renderRecipe, type Rendered } from '../pattern/generate'
import { recipeFor, type Recipe } from '../pattern/recipe'
import './dev.css'

/**
 * Dev only: each candidate style on the same phrases, forced through the real
 * generator, so a new effect or alphabet can be judged before it joins the mix.
 */

const PHRASES = [
  ['GET', 'SHIT', 'DONE'],
  ['Be', 'happy'],
  ['Bless', 'this', 'mess'],
  ['Hello', 'sunshine'],
]

const STYLES: { label: string; recipe: Partial<Recipe> }[] = [
  { label: 'Block', recipe: { alphabet: 'block' } },
  { label: 'Block · shadow', recipe: { alphabet: 'block', effect: 'shadow' } },
  { label: 'Block · 3D side', recipe: { alphabet: 'block', effect: 'block3d' } },
  { label: 'Block · outline', recipe: { alphabet: 'block', effect: 'outline' } },
  { label: 'Serif · leaf row', recipe: { alphabet: 'serif', icon: 'leaf', iconRow: true } },
  { label: 'Serif · 3D side', recipe: { alphabet: 'serif', effect: 'block3d' } },
  { label: 'Slab', recipe: { alphabet: 'slab' } },
  { label: 'Slab · 3D side', recipe: { alphabet: 'slab', effect: 'block3d' } },
  { label: 'Slab · outline', recipe: { alphabet: 'slab', effect: 'outline' } },
  { label: 'Sampler', recipe: { alphabet: 'sampler' } },
  { label: 'Sampler · leaf row', recipe: { alphabet: 'sampler', icon: 'leaf', iconRow: true } },
  { label: 'Sampler · cherry row', recipe: { alphabet: 'sampler', icon: 'cherry', iconRow: true } },
  { label: 'Sprig', recipe: { alphabet: 'sprig' } },
  { label: 'Daisy', recipe: { alphabet: 'daisy' } },
  { label: 'Bagel Fat One · outline', recipe: { font: 'Bagel Fat One', threshold: 0.47, effect: 'outline' } },
  { label: 'Shrikhand · outline', recipe: { font: 'Shrikhand', threshold: 0.49, effect: 'outline' } },
]

const WIDTH = 50

function Mini({ rendered, paletteId }: { rendered: Rendered; paletteId: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { pattern } = rendered
    const { lettering, accent } = patternColours(paletteById(paletteId))
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
  }, [rendered, paletteId])
  return <canvas ref={ref} role="img" aria-label={rendered.pattern.meta.text} />
}

export function StyleGallery() {
  const [paletteId, setPaletteId] = useState('01')
  const [rows, setRows] = useState<{ label: string; results: Rendered[] }[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const out = []
      for (const style of STYLES) {
        const results = []
        for (const lines of PHRASES) {
          const base = recipeFor('styles', 0, undefined, { motif: 'none', letterCase: 'mixed' })
          const recipe: Recipe = {
            ...base,
            layout: 'stacked-block',
            wave: null,
            alphabet: null,
            effect: 'none',
            icon: null,
            iconRow: false,
            letterGap: style.recipe.alphabet ? 1 : 2,
            lineGap: 2,
            letterAspect: 1.5,
            ...style.recipe,
          }
          // A capitals-only alphabet is only ever offered for capitals.
          if (recipe.alphabet && !ALPHABETS[recipe.alphabet].lowercase) recipe.letterCase = 'upper'
          results.push(await renderRecipe(lines, WIDTH, recipe, 'styles'))
        }
        out.push({ label: style.label, results })
      }
      if (alive) setRows(out)
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <main className="dev">
      <header>
        <h1>Styles</h1>
        <p>Dev only. Candidate styles on the same phrases at {WIDTH} stitches, before they join the mix.</p>
        <label>
          Palette{' '}
          <select value={paletteId} onChange={(e) => setPaletteId(e.target.value)}>
            {PALETTES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} {p.name}
              </option>
            ))}
          </select>
        </label>
      </header>
      {rows.map((row) => (
        <section key={row.label} className="icon-sheet">
          <h2>{row.label}</h2>
          <div className="style-row" style={{ background: FABRIC.hex }}>
            {row.results.map((r, i) => (
              <figure key={i} className="glyph-cell">
                <Mini rendered={r} paletteId={paletteId} />
                <figcaption>{r.check.ok ? 'readable' : r.check.reasons.join('; ')}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
