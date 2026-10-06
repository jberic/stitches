import { useId } from 'react'
import { PALETTES, patternColours, type Palette } from '../data/palettes'
import './PalettePicker.css'

interface Props {
  value: string
  onChange: (id: string) => void
}

/** A swatch: one lettering stitch and one accent stitch on the fabric. */
function Swatch({ palette }: { palette: Palette }) {
  const { fabric, lettering, accent } = patternColours(palette)
  const cross = (x: number, colour: string) => (
    <path d={`M${x} 6.5L${x + 7} 13.5M${x + 7} 6.5L${x} 13.5`} stroke={colour} strokeWidth="2.6" strokeLinecap="round" />
  )
  return (
    <svg viewBox="0 0 24 20" aria-hidden="true">
      <rect width="24" height="20" fill={fabric} />
      {cross(3.5, lettering.hex)}
      {cross(13.5, accent.hex)}
    </svg>
  )
}

/** Radio buttons styled as fabric swatches: arrow keys move between them, as in any radio group. */
export function PalettePicker({ value, onChange }: Props) {
  const name = useId()
  const selected = PALETTES.find((p) => p.id === value) ?? PALETTES[0]
  const { lettering, accent } = patternColours(selected)

  return (
    <fieldset className="palettes">
      <div className="field-row">
        <legend className="eyebrow">Colours</legend>
        <span className="palettes-current">{selected.name}</span>
      </div>
      <div className="palettes-grid">
        {PALETTES.map((palette) => (
          <label key={palette.id} className="palette" title={palette.name}>
            <input
              type="radio"
              name={name}
              value={palette.id}
              checked={palette.id === selected.id}
              onChange={() => onChange(palette.id)}
            />
            <span className="visually-hidden">{palette.name}</span>
            <Swatch palette={palette} />
          </label>
        ))}
      </div>
      <p className="palettes-threads mono">
        <span>
          {lettering.code} {lettering.name}
        </span>
        <span>
          {accent.code} {accent.name}
        </span>
      </p>
    </fieldset>
  )
}
