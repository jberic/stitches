import { useEffect, useRef, useState } from 'react'
import { DEFAULT_WIDTH, generatePattern, letterformOf, nextStyle, renderRecipe, type GenerateResult } from '../pattern/generate'
import type { Grid } from '../pattern/cleanup'
import { MAX_ATTEMPTS, describeRecipe } from '../pattern/recipe'
import { hashString } from '../pattern/random'
import { parsePhrase } from '../pattern/text'
import { TEST_PHRASES } from './phrases'
import './dev.css'

/**
 * Dev-only page (not in the production build). Runs the brief's acceptance
 * checks on 30 phrases and shows every attempt, so failures can be read,
 * tuned, and screenshotted.
 */

interface Row {
  phrase: string
  seed: string
  result: GenerateResult
  raw: Grid
  deterministic: boolean
  newFontOnGenerate: boolean
}

/** A fixed, readable seed per phrase, so a run can be repeated exactly. */
function seedFor(phrase: string, salt: string) {
  return (hashString(`${salt}:${phrase}`) >>> 0).toString(36).slice(0, 5)
}

async function runPhrase(phrase: string, width: number, salt: string): Promise<Row> {
  const parsed = parsePhrase(phrase)
  if (!parsed.ok) throw new Error(`Bad test phrase: ${phrase}`)
  const seed = seedFor(phrase, salt)
  const result = await generatePattern({ lines: parsed.lines, width, seed })
  const again = await generatePattern({ lines: parsed.lines, width, seed })
  const raw = (await renderRecipe(parsed.lines, width, result.recipe, seed)).raw

  // "Generate again" from here, judged by the finished pattern.
  let n = 0
  const next = (
    await nextStyle({
      lines: parsed.lines,
      recent: [letterformOf(result.recipe)],
      fallbackWidth: width,
      makeSeed: () => seedFor(phrase, `${salt}:next:${n++}`),
    })
  ).result

  return {
    phrase,
    seed,
    result,
    raw,
    deterministic: result.pattern.cells.join('') === again.pattern.cells.join(''),
    newFontOnGenerate:
      (next.recipe.alphabet ?? next.recipe.font) !== (result.recipe.alphabet ?? result.recipe.font) ||
      next.recipe.effect !== result.recipe.effect,
  }
}

function MiniGrid({ grid, label }: { grid: Grid; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const cell = 4
    const dpr = window.devicePixelRatio || 1
    canvas.width = grid.width * cell * dpr
    canvas.height = grid.height * cell * dpr
    canvas.style.width = `${grid.width * cell}px`
    canvas.style.height = `${grid.height * cell}px`
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#fff6f1'
    ctx.fillRect(0, 0, grid.width * cell, grid.height * cell)
    ctx.fillStyle = '#5f051c'
    for (let i = 0; i < grid.cells.length; i++) {
      if (grid.cells[i]) ctx.fillRect((i % grid.width) * cell, Math.floor(i / grid.width) * cell, cell, cell)
    }
  }, [grid])
  return (
    <figure className="mini">
      <canvas ref={ref} role="img" aria-label={label} />
      <figcaption>{label}</figcaption>
    </figure>
  )
}

export function DevPage() {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [salt, setSalt] = useState('run-1')
  const runKey = `${width}|${salt}`
  // Results are tagged with the settings that made them; a new run starts empty.
  const [run, setRun] = useState<{ key: string; rows: Row[]; done: boolean }>({ key: '', rows: [], done: false })
  const rows = run.key === runKey ? run.rows : []
  const running = run.key !== runKey || !run.done

  useEffect(() => {
    let alive = true
    ;(async () => {
      const done: Row[] = []
      for (const phrase of TEST_PHRASES) {
        done.push(await runPhrase(phrase, width, salt))
        if (!alive) return
        setRun({ key: runKey, rows: [...done], done: false })
      }
      if (alive) setRun({ key: runKey, rows: done, done: true })
    })()
    return () => {
      alive = false
    }
  }, [width, salt, runKey])

  const passed = rows.filter((r) => r.result.check.ok).length
  const attempts = rows.reduce((n, r) => n + r.result.attempts.length, 0)
  const deterministic = rows.filter((r) => r.deterministic).length
  const changedFont = rows.filter((r) => r.newFontOnGenerate).length
  const firstTry = rows.filter((r) => r.result.attempts.length === 1 && r.result.check.ok).length
  // One short code for every stitch of every pattern. Compare it across browsers:
  // if Safari and Chrome show the same code, shared links give identical patterns.
  const fingerprint =
    rows.length === TEST_PHRASES.length
      ? hashString(rows.map((r) => `${r.seed}:${r.result.pattern.cells.join('')}`).join('|')).toString(36)
      : '–'

  return (
    <main className="dev">
      <header>
        <h1>Test phrases</h1>
        <p>Dev only. Each phrase gets a fixed seed from the run name, so a run can be repeated exactly.</p>
        <div className="dev-controls">
          <label>
            Width <input type="number" min={40} max={80} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          </label>
          <label>
            Run name <input value={salt} onChange={(e) => setSalt(e.target.value)} />
          </label>
          <button type="button" onClick={() => setSalt(`run-${Math.floor(Math.random() * 1e6)}`)}>
            New seeds
          </button>
        </div>
      </header>

      <section className="summary" aria-live="polite">
        <Stat label="Readable within 5 attempts" value={`${passed} / ${rows.length}`} ok={passed === rows.length} />
        <Stat label="Readable on the first try" value={`${firstTry} / ${rows.length}`} />
        <Stat label="Average attempts" value={rows.length ? (attempts / rows.length).toFixed(2) : '–'} />
        <Stat label="Same seed, same pattern" value={`${deterministic} / ${rows.length}`} ok={deterministic === rows.length} />
        <Stat
          label="Generate again changes letters or effect"
          value={`${changedFont} / ${rows.length}`}
          ok={changedFont >= rows.length * 0.9}
        />
        <Stat label="Pattern fingerprint (compare across browsers)" value={fingerprint} />
        {running && <p className="running">Running…</p>}
      </section>

      <ol className="rows">
        {rows.map((row) => (
          <li key={row.phrase} className={row.result.check.ok ? 'pass' : 'fail'}>
            <h2>
              {row.phrase} <span>seed {row.seed}</span>
            </h2>
            <div className="grids">
              <MiniGrid grid={row.raw} label="Before tidy-up" />
              <MiniGrid grid={row.result.pattern} label={describeRecipe(row.result.recipe)} />
            </div>
            <ol className="attempts">
              {row.result.attempts.map((a, i) => (
                <li key={i} className={a.check.ok ? 'pass' : 'fail'}>
                  <strong>
                    {i + 1}/{MAX_ATTEMPTS}
                  </strong>{' '}
                  {describeRecipe(a.recipe)}: {a.check.ok ? 'readable' : a.check.reasons.join('; ')}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </main>
  )
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="stat" data-ok={ok === undefined ? undefined : String(ok)}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
