import { useMemo, useState } from 'react'
import { createSupportCallback } from '../../shared/api/client.js'
import { canonicalTimezone, isValidTimezone, locationCatalog, timezoneFromLocation, timezoneSummary } from '../booking/locationData.js'

function browserTimezone() {
  try {
    const zone = canonicalTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? '')
    return isValidTimezone(zone) ? zone : ''
  } catch {
    return ''
  }
}

function localDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function initialDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return localDateString(date)
}

const continents = Object.keys(locationCatalog).sort((a, b) => a.localeCompare(b))

export default function SupportCallForm({ onBack }) {
  const detectedTimezone = useMemo(browserTimezone, [])
  const [parent, setParent] = useState(() => ({
    parent_name: '',
    parent_email: '',
    preferred_date: initialDate(),
    preferred_time: '10:00',
    timezone: detectedTimezone,
    topic: '',
    continent: '',
    country: '',
    state_region: '',
    city: '',
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const timezoneValid = isValidTimezone(parent.timezone)
  const countryNames = Object.keys(locationCatalog[parent.continent] ?? {})
  const regions = Object.keys(locationCatalog[parent.continent]?.[parent.country] ?? {})
  const cities = Object.keys(locationCatalog[parent.continent]?.[parent.country]?.[parent.state_region] ?? {})
  const zoneSummary = timezoneSummary(parent.timezone)

  const changeContinent = (continent) => {
    setParent((current) => ({ ...current, continent, country: '', state_region: '', city: '', timezone: '' }))
  }

  const changeCountry = (country) => {
    setParent((current) => ({ ...current, country, state_region: '', city: '', timezone: '' }))
  }

  const changeRegion = (state_region) => {
    setParent((current) => ({ ...current, state_region, city: '', timezone: '' }))
  }

  const changeCity = (city) => {
    const timezone = timezoneFromLocation({ ...parent, city })
    setParent((current) => ({ ...current, city, timezone }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (busy || !timezoneValid) return
    setBusy(true)
    setError('')
    try {
      const result = await createSupportCallback({
        parent_name: parent.parent_name,
        parent_email: parent.parent_email,
        preferred_date: parent.preferred_date,
        preferred_time: parent.preferred_time,
        timezone: parent.timezone,
        topic: parent.topic,
      })
      setConfirmation(result)
    } catch (requestError) {
      setError(requestError.message || 'We could not save the callback request. Please try another time.')
    } finally {
      setBusy(false)
    }
  }

  if (confirmation) {
    return (
      <section className="support-confirmation" aria-live="polite">
        <span className="support-confirmation-icon" aria-hidden="true">✓</span>
        <p className="support-eyebrow">CALLBACK REQUEST</p>
        <h3>Your callback has been scheduled!</h3>
        <div className="support-confirmation-details">
          <p><span>Parent</span><strong>{confirmation.parent_name}</strong></p>
          <p><span>Date</span><strong>{confirmation.date}</strong></p>
          <p><span>Your local time</span><strong>{confirmation.local_time}</strong></p>
          <p><span>Topic</span><strong>{confirmation.topic}</strong></p>
          <p><span>Status</span><strong className="support-status">Scheduled · demo request</strong></p>
          <p><span>Reference</span><strong>{confirmation.reference}</strong></p>
        </div>
        <p className="support-demo-notice">This is a demo callback request. No real phone call or callback email will be sent.</p>
        <button className="support-secondary-button" type="button" onClick={onBack}>Back to support</button>
      </section>
    )
  }

  return (
    <form className="support-call-form" onSubmit={submit}>
      <div className="support-form-heading">
        <button type="button" className="support-back-button" onClick={onBack} aria-label="Back to support options">←</button>
        <div><p className="support-eyebrow">SCHEDULE A CALL</p><h3>Choose a time that suits you</h3></div>
      </div>
      <p className="support-form-intro">Share your details and preferred callback time. This demo records a request for the support team.</p>
      <div className="support-form-grid">
        <label className="support-field">
          <span>Your name</span>
          <input required autoFocus maxLength={160} autoComplete="name" value={parent.parent_name}
            onChange={(event) => setParent({ ...parent, parent_name: event.target.value })} />
        </label>
        <label className="support-field">
          <span>Email address</span>
          <input required type="email" maxLength={254} autoComplete="email" value={parent.parent_email}
            onChange={(event) => setParent({ ...parent, parent_email: event.target.value })} />
        </label>
        <label className="support-field">
          <span>Preferred date</span>
          <input required type="date" min={localDateString(new Date())} value={parent.preferred_date}
            onChange={(event) => setParent({ ...parent, preferred_date: event.target.value })} />
        </label>
        <label className="support-field">
          <span>Preferred time</span>
          <input required type="time" value={parent.preferred_time}
            onChange={(event) => setParent({ ...parent, preferred_time: event.target.value })} />
        </label>
      </div>

      <div className="support-location-box">
        <div className="support-detected-zone">
          <span className="support-detected-icon" aria-hidden="true">⌖</span>
          <span><strong>{detectedTimezone ? 'Timezone detected' : 'Set your timezone'}</strong>
            <small>{timezoneValid ? `${parent.timezone}${zoneSummary ? ` · ${zoneSummary}` : ''}` : 'Please choose a location or enter a valid IANA timezone.'}</small></span>
        </div>
        <div className="support-form-grid support-location-grid">
          <label className="support-field"><span>Continent</span>
            <select value={parent.continent} onChange={(event) => changeContinent(event.target.value)} required>
              <option value="">Choose a continent</option>
              {continents.map((continent) => <option key={continent} value={continent}>{continent}</option>)}
            </select>
          </label>
          <label className="support-field"><span>Country</span>
            <select value={parent.country} onChange={(event) => changeCountry(event.target.value)} required disabled={!parent.continent}>
              <option value="">Choose a country</option>
              {countryNames.map((country) => <option key={country} value={country}>{country}</option>)}
            </select>
          </label>
          <label className="support-field"><span>State or region</span>
            <select value={parent.state_region} onChange={(event) => changeRegion(event.target.value)} required disabled={!parent.country}>
              <option value="">Choose a state or region</option>
              {regions.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </label>
          <label className="support-field"><span>City</span>
            <select value={parent.city} onChange={(event) => changeCity(event.target.value)} required disabled={!parent.state_region}>
              <option value="">Choose a city</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
          </label>
          <label className="support-field"><span>Timezone (IANA)</span>
            <input id="support-timezone" required maxLength={64} value={parent.timezone} placeholder="e.g. Europe/London"
              aria-invalid={!timezoneValid} onChange={(event) => setParent({ ...parent, timezone: canonicalTimezone(event.target.value.trim()) })} />
          </label>
        </div>
        {parent.country && <p className="support-location-hierarchy">{parent.continent} → {parent.country} → {parent.state_region} → {parent.city}</p>}
      </div>

      <label className="support-field support-topic-field">
        <span>What would you like help with?</span>
        <textarea required maxLength={200} rows={2} value={parent.topic} placeholder="For example, a question about your trial class"
          onChange={(event) => setParent({ ...parent, topic: event.target.value })} />
      </label>
      {error && <p className="support-form-error" role="alert">{error}</p>}
      <p className="support-form-demo-note">Demo only — this saves a callback request, but does not place a real call or send an email.</p>
      <button type="submit" className="support-primary-button" disabled={busy || !timezoneValid}>
        {busy ? <><span className="support-button-spinner" aria-hidden="true" /> Saving request…</> : 'Schedule demo callback'}
      </button>
    </form>
  )
}
