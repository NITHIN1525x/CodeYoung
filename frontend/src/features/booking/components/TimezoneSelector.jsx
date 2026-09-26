import { availableIanaTimezones, friendlyTimezoneName, isValidTimezone } from '../locationData.js'

const timezones = availableIanaTimezones()

export default function TimezoneSelector({ value, onChange }) {
  const valid = isValidTimezone(value)
  return (
    <details className="timezone-override">
      <summary>Can’t find your location? Select timezone manually</summary>
      <div className="field-group">
        <label htmlFor="timezone-fallback">Timezone</label>
        <select id="timezone-fallback" value={valid ? value : ''} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choose a timezone</option>
          {timezones.map((timezone) => (
            <option key={timezone} value={timezone}>{friendlyTimezoneName(timezone)} · {timezone}</option>
          ))}
        </select>
        <span className="field-hint">Choose your local timezone. This list is only needed when your city is not available.</span>
      </div>
    </details>
  )
}
