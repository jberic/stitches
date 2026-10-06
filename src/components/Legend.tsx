import { luminance } from '../data/colour'
import type { Legend as LegendData } from '../pattern/legend'
import './Legend.css'

interface Props {
  legend: LegendData
  /** The colour index currently shown alone on the chart. */
  highlight: number | null
  /** The colour pinned by a click or tap; hover and focus preview without pinning. */
  pinned: number | null
  onPreview: (index: number | null) => void
  onPin: (index: number | null) => void
}

/** The chart's symbols, drawn the same way: × for lettering, ● for the accent. */
function Symbol({ index, hex }: { index: number; hex: string }) {
  const mark = luminance(hex) > 0.25 ? 'rgb(0 0 0 / 0.55)' : 'rgb(255 255 255 / 0.8)'
  return (
    <svg className="legend-symbol" viewBox="0 0 20 20" aria-hidden="true">
      <rect width="20" height="20" rx="2" fill={hex} />
      {index === 1 ? (
        <path d="M5.6 5.6L14.4 14.4M14.4 5.6L5.6 14.4" stroke={mark} strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <circle cx="10" cy="10" r="4" fill={mark} />
      )}
    </svg>
  )
}

export function Legend({ legend, highlight, pinned, onPreview, onPin }: Props) {
  return (
    <div className="legend">
      <ul className="legend-rows" aria-label="Threads">
        {legend.rows.map((row) => (
          <li key={row.index}>
            <button
              type="button"
              className="legend-row"
              data-active={highlight === row.index || undefined}
              aria-pressed={pinned === row.index}
              aria-label={`${row.thread.code} ${row.thread.name}, ${row.use.toLowerCase()}, ${row.stitches} stitches. Show only these on the chart.`}
              onMouseEnter={() => onPreview(row.index)}
              onMouseLeave={() => onPreview(null)}
              onFocus={() => onPreview(row.index)}
              onBlur={() => onPreview(null)}
              onClick={() => onPin(pinned === row.index ? null : row.index)}
            >
              <Symbol index={row.index} hex={row.thread.hex} />
              <span className="legend-thread">
                <span className="mono legend-code">{row.thread.code}</span> {row.thread.name}
              </span>
              <span className="legend-use">{row.use}</span>
              <span className="mono legend-count">{row.stitches.toLocaleString('en')}</span>
            </button>
          </li>
        ))}
        <li className="legend-row legend-fabric">
          <svg className="legend-symbol" viewBox="0 0 20 20" aria-hidden="true">
            <rect x="0.5" y="0.5" width="19" height="19" rx="2" fill={legend.fabric.hex} stroke="rgb(0 0 0 / 0.15)" />
          </svg>
          <span className="legend-thread">{legend.fabric.name} fabric</span>
          <span className="legend-use">Background</span>
          <span className="mono legend-count" aria-hidden="true">
            –
          </span>
        </li>
      </ul>
      <p className="legend-total">
        <span>Total</span>
        <span className="mono">{legend.total.toLocaleString('en')} stitches</span>
      </p>
    </div>
  )
}
