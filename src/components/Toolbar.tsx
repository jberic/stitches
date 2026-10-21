import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import './Toolbar.css'

export interface ToolbarItem {
  id: string
  label: string
  /** The current setting, shown small under the label. */
  value: React.ReactNode
  /** What opens above the bar. */
  panel: React.ReactNode
  /** Wider panels for richer tools (styles, colours). */
  wide?: boolean
}

interface Props {
  items: ToolbarItem[]
  /** The primary action at the end of the bar. */
  action: React.ReactNode
  /** The same action as an icon, for the compact bar on small screens. */
  compactAction: React.ReactNode
}

/** Below this width the bar collapses to one Adjust button that opens a bottom sheet. */
const COMPACT = '(max-width: 720px)'
/** Panels stay this far from the screen edges. */
const EDGE = 16

function useCompact() {
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT).matches)
  useEffect(() => {
    const list = window.matchMedia(COMPACT)
    const onChange = () => setCompact(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [])
  return compact
}

/** Focus the first control inside an element (skipping its close button), so keyboard users land on it. */
function focusFirst(root: HTMLElement | null) {
  root
    ?.querySelector<HTMLElement>(
      'button:not([disabled]):not(.toolbar-close):not([role="tab"]), input:not([disabled]), [tabindex="0"]',
    )
    ?.focus({ preventScroll: true })
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="toolbar-close" onClick={onClick} aria-label={`Close ${label}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" />
      </svg>
    </button>
  )
}

/**
 * The floating bar at the bottom: one button per setting, each opening its
 * panel above the bar, lined up with the button, like a design tool's
 * toolbar. On small screens it collapses to an Adjust button that opens a
 * bottom sheet with the settings as tabs. Escape, the close button or a
 * click outside closes either, and puts focus back where it was.
 */
export function Toolbar(props: Props) {
  return useCompact() ? <CompactBar {...props} /> : <WideBar {...props} />
}

function WideBar({ items, action }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const [left, setLeft] = useState<number | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const buttons = useRef(new Map<string, HTMLButtonElement>())
  const panelRef = useRef<HTMLDivElement>(null)
  const baseId = useId()

  const close = (returnFocus: boolean) => {
    if (returnFocus && open) buttons.current.get(open)?.focus()
    setOpen(null)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close(true)
      }
    }
    const onDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) close(false)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onDown)
    }
  })

  // Line the panel up with its button: same left edge, nudged in to stay on screen.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const button = buttons.current.get(open)
      const wrap = barRef.current
      const panel = panelRef.current
      if (!button || !wrap || !panel) return
      const b = button.getBoundingClientRect()
      const w = wrap.getBoundingClientRect()
      const width = panel.offsetWidth
      const x = Math.min(Math.max(b.left, EDGE), window.innerWidth - EDGE - width)
      setLeft(x - w.left)
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  useEffect(() => {
    if (open) focusFirst(panelRef.current)
  }, [open])

  const current = items.find((item) => item.id === open)

  return (
    <div ref={barRef} className="toolbar-wrap">
      {current && (
        <div
          ref={panelRef}
          id={`${baseId}-${current.id}`}
          className="toolbar-panel"
          data-wide={current.wide || undefined}
          data-placed={left !== null || undefined}
          style={left !== null ? { left } : undefined}
          role="dialog"
          aria-label={current.label}
        >
          <div className="toolbar-panel-head">
            <h2>{current.label}</h2>
            <CloseButton label={current.label} onClick={() => close(true)} />
          </div>
          {current.panel}
        </div>
      )}
      <nav className="toolbar" aria-label="Pattern settings">
        <ul className="toolbar-items">
          {items.map((item) => (
            <li key={item.id}>
              <button
                ref={(el) => {
                  if (el) buttons.current.set(item.id, el)
                }}
                type="button"
                className="toolbar-item"
                aria-expanded={open === item.id}
                aria-controls={open === item.id ? `${baseId}-${item.id}` : undefined}
                onClick={() => {
                  setLeft(null)
                  setOpen(open === item.id ? null : item.id)
                }}
              >
                <span className="toolbar-label">{item.label}</span>
                <span className="toolbar-value">{item.value}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="toolbar-action">{action}</div>
      </nav>
    </div>
  )
}

function CompactBar({ items, compactAction }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(items[0]?.id)
  // Which way the content slides when you change tab: forward from the right, back from the left.
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const bodyRef = useRef<HTMLDivElement>(null)
  const adjustRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const baseId = useId()
  const current = items.find((item) => item.id === tab) ?? items[0]

  const close = () => {
    setOpen(false)
    adjustRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKey, true)
    // The page behind the sheet doesn't scroll while it's open.
    const root = document.documentElement
    root.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, true)
      root.style.overflow = ''
    }
  })

  useEffect(() => {
    if (open) focusFirst(sheetRef.current)
  }, [open, tab])

  const chooseTab = (id: string, button: HTMLElement) => {
    if (id === current.id) return
    const from = items.findIndex((item) => item.id === current.id)
    const to = items.findIndex((item) => item.id === id)
    setDirection(to > from ? 'forward' : 'back')
    setTab(id)
    // Each section starts at its top, and its tab scrolls into view.
    bodyRef.current?.scrollTo({ top: 0 })
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    button.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <>
      {open && <div className="toolbar-scrim" aria-hidden="true" onClick={close} />}
      {open && (
        <div ref={sheetRef} className="toolbar-sheet" role="dialog" aria-modal="true" aria-label="Adjust the pattern">
          <div className="toolbar-sheet-grip" aria-hidden="true" />
          <div className="toolbar-panel-head">
            <h2>Adjust</h2>
            <CloseButton label="Adjust" onClick={close} />
          </div>
          <div className="toolbar-tabs" role="tablist" aria-label="Settings">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${item.id}`}
                aria-selected={item.id === current.id}
                aria-controls={`${baseId}-panel`}
                className="toolbar-tab"
                onClick={(e) => chooseTab(item.id, e.currentTarget)}
              >
                <span className="toolbar-label">{item.label}</span>
                <span className="toolbar-value">{item.value}</span>
              </button>
            ))}
          </div>
          <div
            id={`${baseId}-panel`}
            role="tabpanel"
            aria-labelledby={`${baseId}-tab-${current.id}`}
            className="toolbar-sheet-body"
            ref={bodyRef}
          >
            {/* Keyed by tab, so each change plays the slide. */}
            <div key={current.id} className="toolbar-sheet-pane" data-direction={direction}>
              {current.panel}
            </div>
          </div>
        </div>
      )}
      <div className="toolbar-wrap toolbar-wrap-compact">
        <nav className="toolbar toolbar-compact" aria-label="Pattern settings">
          <button
            ref={adjustRef}
            type="button"
            className="toolbar-adjust"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => (open ? close() : setOpen(true))}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
              <circle cx="16" cy="7" r="2" />
              <circle cx="10" cy="17" r="2" />
            </svg>
            <span>Adjust</span>
          </button>
          {compactAction}
        </nav>
      </div>
    </>
  )
}
