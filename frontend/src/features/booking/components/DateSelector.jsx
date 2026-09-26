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
  return <div className="date-picker-panel">
    <div className="field-group date-field"><label htmlFor="booking-date">Choose a class date</label><input id="booking-date" type="date" min={localToday(timezone)} value={value} onChange={(event) => onChange(event.target.value)} required /><span className="field-hint">Dates are based on your local calendar in {timezone}.</span></div>
    {value && <div className="date-preview"><span className="date-preview-icon" aria-hidden="true">◷</span><span><strong>{formatSelectedDate(value)}</strong><small>Shown in {timezone}</small></span></div>}
  </div>
}
