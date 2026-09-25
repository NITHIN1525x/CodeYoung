import LocationSelector from './LocationSelector.jsx'
import TimezoneSelector from './TimezoneSelector.jsx'

export default function BookingForm({ values, onChange, onContinue, detectedTimezone, timezoneValid, onTimezoneValidityChange }) {
  const update = (field) => (event) => onChange({ ...values, [field]: event.target.value })
  return (
    <form className="booking-form" onSubmit={(event) => { event.preventDefault(); onContinue() }}>
      <div className="section-heading">
        <span className="step-kicker">STEP 01 · ABOUT YOU</span>
        <h2>Let’s get to know you.</h2>
        <p>We’ll use these details to prepare your child’s trial class.</p>
      </div>
      <div className="field-grid field-grid-two parent-fields">
        <div className="field-group">
          <label htmlFor="parent-name">Your name</label>
          <input id="parent-name" value={values.name} onChange={update('name')} autoComplete="name" placeholder="e.g. Jordan Lee" maxLength={160} required />
        </div>
        <div className="field-group">
          <label htmlFor="parent-email">Email address</label>
          <input id="parent-email" type="email" value={values.email} onChange={update('email')} autoComplete="email" placeholder="you@example.com" maxLength={254} required />
        </div>
      </div>
      <LocationSelector values={values} onChange={onChange} />
      <TimezoneSelector value={values.timezone}
        onChange={(timezone) => onChange({ ...values, timezone })}
        detectedTimezone={detectedTimezone} onValidityChange={onTimezoneValidityChange} />
      <div className="form-actions">
        <span className="privacy-note"><span aria-hidden="true">⌑</span> Your details stay private.</span>
        <button className="button button-primary" type="submit" disabled={!timezoneValid}>
          Choose a date <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  )
}
