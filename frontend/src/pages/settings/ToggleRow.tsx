type ToggleRowProps = {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="toggle-row">
      <div className="toggle-copy">
        <span className="toggle-label">{label}</span>
        <span className="toggle-description">{description}</span>
      </div>

      <span className="switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="slider" aria-hidden="true" />
      </span>
    </label>
  )
}

export default ToggleRow
