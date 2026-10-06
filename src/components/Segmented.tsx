import { useId } from 'react'
import './Segmented.css'

interface Option<T extends string | number> {
  value: T
  label: string
}

interface Props<T extends string | number> {
  legend: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  /** Shown to the right of the legend, like the current palette name. */
  aside?: React.ReactNode
}

/** A small choice of a few options: a real radio group, styled as one row of segments. */
export function Segmented<T extends string | number>({ legend, options, value, onChange, aside }: Props<T>) {
  const name = useId()
  return (
    <fieldset className="segmented">
      <div className="field-row">
        <legend className="eyebrow">{legend}</legend>
        {aside}
      </div>
      <div className="segmented-options">
        {options.map((option) => (
          <label key={String(option.value)} className="segmented-option">
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
