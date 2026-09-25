function localToday(timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return values.year + '-' + values.month + '-' + values.day
}

export function formatSelectedDate(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    .format(new Date(year, month - 1, day, 12))
}

export default function DateSelector({ value, onChange, timezone }) {
  return (
    <div className="date-picker-panel">
      <div className="section-heading compact-heading">
        <span className="step-kicker">STEP 02 · PICK A DAY</span>
        <h2>Find a time that works.</h2>
        <p>Choose a date and we’ll show class times in your timezone.</p>
      </div>
      <div className="field-group date-field">
        <label htmlFor="booking-date">Trial class date</label>
        <input id="booking-date" type="date" min={localToday(timezone)} value={value}
          onChange={(event) => onChange(event.target.value)} required />
      </div>
      {value && (
        <div className="date-preview">
          <span className="date-preview-icon" aria-hidden="true">◷</span>
          <span><strong>{formatSelectedDate(value)}</strong><small>Shown in {timezone}</small></span>
        </div>
      )}
      <div className="form-actions date-actions">
        <span className="privacy-note">30-minute complimentary class</span>
        <button className="button button-primary" type="submit" disabled={!value}>
          See available times <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  )
}
