import { useEffect, useState } from 'react'
import LoadingState from './LoadingState.jsx'
import LocationSelector from './LocationSelector.jsx'
import TimezoneSelector from './TimezoneSelector.jsx'
import {
  friendlyTimezoneName,
  clearTimezoneSelection,
  isValidTimezone,
  selectAutomaticTimezone,
  selectManualTimezone,
} from '../locationData.js'

const hasLocation = (values) => values.city && values.city !== 'Not specified'

export default function TimezoneSetup({ values, onChange, detectionState, detectedTimezone }) {
  const [mode, setMode] = useState(detectionState === 'failed' ? 'manual' : 'automatic')
  const [modeTouched, setModeTouched] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!modeTouched && detectionState === 'failed') setMode('manual')
    if (!modeTouched && detectionState === 'detected') setMode('automatic')
  }, [detectionState, modeTouched])

  const selectMode = (nextMode) => {
    setModeTouched(true)
    setMode(nextMode)
    setConfirmed(false)
    onChange(clearTimezoneSelection(values))
  }

  const useAutomaticTimezone = () => {
    const selection = selectAutomaticTimezone(detectedTimezone)
    if (!selection) return
    onChange({ ...values, ...selection })
    setConfirmed(true)
  }

  const useManualTimezone = (timezone) => {
    const selection = selectManualTimezone(timezone)
    if (!selection) return
    onChange({ ...values, ...selection })
    setConfirmed(true)
  }

  const changeSelection = () => {
    setConfirmed(false)
    setModeTouched(true)
    setMode('manual')
    onChange(clearTimezoneSelection(values))
  }

  const valid = isValidTimezone(values.timezone)
  const confirmedSelection = confirmed && valid
  const summaryLocation = hasLocation(values)
    ? [values.continent, values.country, values.state_region, values.city].filter(Boolean).join(' → ')
    : 'Location not specified (timezone only)'

  return (
    <section className="timezone-setup" aria-labelledby="timezone-choice-heading">
      <div className="section-heading">
        <h3 id="timezone-choice-heading">How would you like to set your timezone?</h3>
        <p>We’ll use this to show appointment times in your local time.</p>
      </div>
      <div className="timezone-choice-grid" role="radiogroup" aria-labelledby="timezone-choice-heading">
        <label className={'timezone-choice-card ' + (mode === 'automatic' ? 'selected' : '')}>
          <input type="radio" name="timezone-mode" value="automatic" checked={mode === 'automatic'}
            onChange={() => selectMode('automatic')} />
          <span className="timezone-choice-icon" aria-hidden="true">🌐</span>
          <span><strong>Detect automatically</strong><small>Use the timezone set by your browser.</small></span>
        </label>
        <label className={'timezone-choice-card ' + (mode === 'manual' ? 'selected' : '')}>
          <input type="radio" name="timezone-mode" value="manual" checked={mode === 'manual'}
            onChange={() => selectMode('manual')} />
          <span className="timezone-choice-icon" aria-hidden="true">✋</span>
          <span><strong>Select manually</strong><small>Choose your continent, country, region, and city.</small></span>
        </label>
      </div>

      {mode === 'automatic' && !confirmedSelection && (
        <div className="timezone-detected-card" aria-live="polite">
          {detectionState === 'loading' && <LoadingState label="Detecting your timezone…" />}
          {detectionState === 'detected' && detectedTimezone && <>
            <span className="detected-badge">✓ Timezone detected</span>
            <h4>{friendlyTimezoneName(detectedTimezone)}</h4>
            <p className="canonical-timezone">{detectedTimezone}</p>
            <p>Your browser identifies a timezone, not your exact city. Your location will remain unspecified unless you select it manually.</p>
            <div className="timezone-detection-actions">
              <button className="button button-primary" type="button" onClick={useAutomaticTimezone}>Use this timezone</button>
              <button className="text-button" type="button" onClick={() => selectMode('manual')}>Select manually instead</button>
            </div>
          </>}
          {detectionState === 'failed' && <>
            <span className="detected-badge">Timezone not detected</span>
            <p>Choose your location manually, or use the timezone list below as a fallback.</p>
          </>}
        </div>
      )}

      {mode === 'manual' && !confirmedSelection && <>
        {detectionState === 'failed' && <p className="timezone-fallback-note" role="status">
          We couldn’t detect your timezone. Choose your location below, or use the timezone list if your city isn’t available.
        </p>}
        <LocationSelector values={values} onChange={(next) => {
          onChange(next)
          if (next.city && isValidTimezone(next.timezone)) setConfirmed(true)
        }} />
        <TimezoneSelector value={values.timezone} onChange={useManualTimezone} />
      </>}

      {confirmedSelection && <div className="location-timezone-summary" aria-live="polite">
        <div className="location-summary-heading"><span aria-hidden="true">📍</span><strong>Your Location</strong></div>
        <p>{summaryLocation}</p>
        <div className="timezone-summary-heading"><span aria-hidden="true">🕐</span><strong>Timezone</strong></div>
        <strong className="canonical-timezone">{values.timezone}</strong>
        <span className="friendly-timezone">{friendlyTimezoneName(values.timezone)}</span>
        <button type="button" className="text-button" onClick={changeSelection}>Change location/timezone</button>
      </div>}
    </section>
  )
}
