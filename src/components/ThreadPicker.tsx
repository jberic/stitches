import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { contrast, hexToHsv, hsvToHex } from '../data/colour'
import { FABRIC, isThreadCode, nearestThreads, thread, type Thread } from '../data/palettes'
import './ThreadPicker.css'

type Role = 'lettering' | 'accent'

interface Props {
  lettering: string
  accent: string
  onChange: (lettering: string, accent: string) => void
  /** Offer the second thread too: only for styles that stitch part of the pattern in it. */
  showAccent: boolean
}

/** Where to warn: the lettering must read on the fabric, the two threads must look different. */
const MIN_LETTERING_ON_FABRIC = 3
const MIN_BETWEEN_THREADS = 1.8
const MIN_ACCENT_ON_FABRIC = 1.25

/** The saturation and brightness square for one hue. */
function Field({ hue }: { hue: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const { width, height } = canvas
    ctx.fillStyle = hsvToHex(hue, 1, 1)
    ctx.fillRect(0, 0, width, height)
    const white = ctx.createLinearGradient(0, 0, width, 0)
    white.addColorStop(0, '#fff')
    white.addColorStop(1, 'rgb(255 255 255 / 0)')
    ctx.fillStyle = white
    ctx.fillRect(0, 0, width, height)
    const black = ctx.createLinearGradient(0, 0, 0, height)
    black.addColorStop(0, 'rgb(0 0 0 / 0)')
    black.addColorStop(1, '#000')
    ctx.fillStyle = black
    ctx.fillRect(0, 0, width, height)
  }, [hue])
  return <canvas ref={ref} width={240} height={180} aria-hidden="true" />
}

/**
 * Colours: a colour wheel for the lettering thread, and for the second thread
 * when the style uses one. Wherever you point, the pattern uses the closest
 * real thread (CIEDE2000), and the five closest are offered to choose between.
 */
export function ThreadPicker({ lettering, accent, onChange, showAccent }: Props) {
  const ids = { field: useId(), hue: useId(), code: useId(), notes: useId() }
  const [chosenRole, setEditing] = useState<Role>('lettering')
  const editing: Role = showAccent ? chosenRole : 'lettering'
  const code = editing === 'lettering' ? lettering : accent
  const current = thread(code)
  // The handle follows the pointer while you pick; otherwise it sits on the thread's own colour.
  const [picked, setPicked] = useState<{ key: string; hsv: [number, number, number] } | null>(null)
  const key = `${editing}:${code}`
  const hsv = picked?.key === key ? picked.hsv : hexToHsv(current.hex)
  const [h, s, v] = hsv
  const near = useMemo(() => nearestThreads(hsvToHex(h, s, v), 5), [h, s, v])
  const [draft, setDraft] = useState<string | null>(null)

  const setThread = (next: string) => {
    if (editing === 'lettering') onChange(next, accent)
    else onChange(lettering, next)
  }
  const pick = (next: [number, number, number]) => {
    const [t] = nearestThreads(hsvToHex(...next), 1)
    setPicked({ key: `${editing}:${t.code}`, hsv: next })
    if (t.code !== code) setThread(t.code)
  }
  const choose = (t: Thread) => {
    setPicked(null)
    setThread(t.code)
  }

  const fieldRef = useRef<HTMLDivElement>(null)
  const pickAt = (clientX: number, clientY: number) => {
    const box = fieldRef.current!.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (clientX - box.left) / box.width))
    const y = Math.min(1, Math.max(0, (clientY - box.top) / box.height))
    pick([h, x, 1 - y])
  }
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.03
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    pick([h, Math.min(1, Math.max(0, s + move[0])), Math.min(1, Math.max(0, v + move[1]))])
  }

  const submitDraft = () => {
    if (draft === null) return
    const value = draft.trim().replace(/^#/, '')
    setDraft(null)
    if (isThreadCode(value)) choose(thread(value))
    else if (/^[0-9a-f]{6}$/i.test(value)) pick(hexToHsv(`#${value.toLowerCase()}`))
  }

  const l = thread(lettering)
  const a = thread(accent)
  const notes = [
    contrast(l.hex, FABRIC.hex) < MIN_LETTERING_ON_FABRIC &&
      'The lettering thread is pale on the cream fabric, so the words may be hard to read.',
    showAccent && contrast(l.hex, a.hex) < MIN_BETWEEN_THREADS && 'These two threads are hard to tell apart.',
    showAccent && contrast(a.hex, FABRIC.hex) < MIN_ACCENT_ON_FABRIC && 'The second thread barely shows on the cream fabric.',
  ].filter(Boolean) as string[]

  return (
    <fieldset className="threads" aria-describedby={notes.length ? ids.notes : undefined}>
      <legend className="visually-hidden">Colours</legend>

      <div className="threads-tabs" role="group" aria-label="Thread to change">
        {(showAccent ? (['lettering', 'accent'] as Role[]) : (['lettering'] as Role[])).map((role) => {
          const t = role === 'lettering' ? l : a
          return (
            <button
              key={role}
              type="button"
              className="threads-tab"
              aria-pressed={editing === role}
              onClick={() => setEditing(role)}
            >
              <span className="threads-chip" style={{ background: t.hex }} aria-hidden="true" />
              <span className="threads-tab-text">
                <span className="threads-role">{role === 'lettering' ? 'Lettering' : 'Second thread'}</span>
                <span className="mono">
                  {t.code} {t.name}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div
        ref={fieldRef}
        id={ids.field}
        className="threads-field"
        role="slider"
        tabIndex={0}
        aria-label={editing === 'lettering' ? 'Colour for the lettering' : 'Colour for the second thread'}
        aria-valuetext={`${current.code} ${current.name}`}
        aria-valuenow={Math.round(s * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          pickAt(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => e.buttons && pickAt(e.clientX, e.clientY)}
      >
        <Field hue={h} />
        <span className="threads-handle" style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: current.hex }} />
      </div>

      <label className="visually-hidden" htmlFor={ids.hue}>
        Hue
      </label>
      <input
        id={ids.hue}
        className="threads-hue"
        type="range"
        min={0}
        max={359}
        value={Math.round(h)}
        onChange={(e) => pick([Number(e.target.value), s, v])}
      />

      <div className="threads-entry">
        <label htmlFor={ids.code} className="threads-entry-label">
          Hex or thread code
        </label>
        <input
          id={ids.code}
          className="threads-code mono"
          value={draft ?? current.code}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={submitDraft}
          onKeyDown={(e) => e.key === 'Enter' && submitDraft()}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div className="threads-near" role="group" aria-label="Closest threads">
        {near.map((t) => (
          <button
            key={t.code}
            type="button"
            className="threads-near-option"
            aria-pressed={t.code === code}
            onClick={() => choose(t)}
          >
            <span className="threads-chip" style={{ background: t.hex }} aria-hidden="true" />
            <span className="mono">{t.code}</span>
            <span className="visually-hidden">{t.name}</span>
          </button>
        ))}
      </div>

      {notes.length > 0 && (
        <div id={ids.notes} className="threads-notes" role="status">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}
    </fieldset>
  )
}
