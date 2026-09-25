import { canonicalTimezone, isValidTimezone, timezoneSummary } from '../locationData.js'

export default function TimezoneSelector({ value, onChange, detectedTimezone, onValidityChange }) {
  const valid = isValidTimezone(value)
  const detected = Boolean(detectedTimezone && isValidTimezone(detectedTimezone))
  const summary = timezoneSummary(value)

  return (
    <div className="field-group timezone-field">
      <div className="timezone-detected-card" aria-live="polite">
        <span className="detected-badge">{detected ? 'Location detected' : 'Set your location'}</span>
        {valid ? (
          <p><strong>Timezone:</strong> {value} <span>({summary})</span></p>
        ) : (
          <p className="field-error">We couldn’t detect a timezone. Enter a city above to set it.</p>
        )}
      </div>
      <details className="timezone-override">
        <summary>Timezone incorrect? Enter an IANA timezone</summary>
        <label htmlFor="parent-timezone">Timezone name</label>
        <input id="parent-timezone" type="text" value={value} placeholder="e.g. America/New_York"
          onChange={(event) => { const timezone = canonicalTimezone(event.target.value.trim()); onChange(timezone); onValidityChange(isValidTimezone(timezone)) }}
          aria-describedby="timezone-help" aria-invalid={!valid} />
        <span id="timezone-help" className={valid ? 'field-hint' : 'field-error'}>
          {valid ? 'Use an IANA name such as America/New_York, Europe/London, or Asia/Kolkata.' : 'Enter a valid IANA timezone name.'}
        </span>
      </details>
    </div>
  )
}
