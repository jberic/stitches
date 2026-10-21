import type { Legend as LegendData } from '../pattern/legend'
import type { FabricCount } from '../pattern/size'
import { Legend } from './Legend'
import './ThreadKey.css'

interface Props {
  legend: LegendData
  size: { cm: { width: number; height: number } }
  stitchesWide: number
  stitchesHigh: number
  fabricCount: FabricCount
  highlight: number | null
  pinned: number | null
  onPreview: (index: number | null) => void
  onPin: (index: number | null) => void
  /** In the corner on wide screens; inside a toolbar panel otherwise. */
  card?: boolean
}

/** The thread key: every thread's DMC code, name and stitch count, the total and the finished size. */
export function ThreadKey({ legend, size, stitchesWide, stitchesHigh, fabricCount, card, ...legendProps }: Props) {
  const body = (
    <>
      <Legend legend={legend} {...legendProps} />
      <p className="thread-key-size">
        <span className="mono">
          {size.cm.width.toFixed(1)} × {size.cm.height.toFixed(1)} cm
        </span>
        <span className="mono thread-key-muted">
          {stitchesWide} × {stitchesHigh} stitches · {fabricCount}-count Aida
        </span>
      </p>
    </>
  )
  return card ? (
    <aside className="thread-key" aria-label="Threads">
      {body}
    </aside>
  ) : (
    <div className="thread-key-inline">{body}</div>
  )
}
