import { useEffect, useId, useRef, useState } from 'react'
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
}

/**
 * The floating bar at the bottom: one button per setting, each opening its
 * panel above the bar, like a design tool's toolbar. Escape or a click
 * outside closes it and puts focus back on the button.
 */
export function Toolbar({ items, action }: Props) {
  const [open, setOpen] = useState<string | null>(null)
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

  // Opening a panel moves focus into it, so keyboard users land on its controls.
  useEffect(() => {
    if (!open) return
    const first = panelRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]):not(.toolbar-close), input:not([disabled]), [tabindex="0"]',
    )
    first?.focus({ preventScroll: true })
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
          role="dialog"
          aria-label={current.label}
        >
          <div className="toolbar-panel-head">
            <h2>{current.label}</h2>
            <button type="button" className="toolbar-close" onClick={() => close(true)} aria-label={`Close ${current.label}`}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
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
                onClick={() => setOpen(open === item.id ? null : item.id)}
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
