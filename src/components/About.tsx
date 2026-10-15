import { useEffect, useId, useRef } from 'react'
import './About.css'

interface Props {
  open: boolean
  onClose: () => void
}

/** What the tool is, who made it, and the credits the licences ask for. */
export function About({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="about"
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the dimmed backdrop lands on the dialog element itself.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="about-body">
        <div className="about-head">
          <h2 id={titleId}>About</h2>
          <button type="button" className="about-close" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="about-lead">
          Type a phrase and get a two-colour cross-stitch pattern. Generate again for the same words in a new style.
        </p>
        <dl className="about-credits">
          <div>
            <dt>Stitched by</dt>
            <dd>
              <a href="https://bertino.co">Jennie Bertino</a> for fun
            </dd>
          </div>
          <div>
            <dt>Colour data</dt>
            <dd>
              <a href="https://github.com/makebead/craft-color-codes">craft-color-codes</a> by MakeBead, CC BY 4.0
            </dd>
          </div>
        </dl>
      </div>
    </dialog>
  )
}
