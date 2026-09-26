import TimezoneSetup from './components/TimezoneSetup.jsx'
import { isValidTimezone } from './locationData.js'

export default function LocationStep({ values, onChange, detectionState, detectedTimezone, onBack, onContinue }) {
  return <section className="location-step">
    <div className="section-heading"><span className="step-kicker">STEP 02 · WHERE ARE YOU?</span><h2>Let’s get your local time right.</h2><p>We’ll show your appointment in your timezone. You can confirm the detected location or choose it manually.</p></div>
    <TimezoneSetup values={values} onChange={onChange} detectionState={detectionState} detectedTimezone={detectedTimezone} />
    <div className="form-actions"><button type="button" className="text-button" onClick={onBack}>← Back</button><button className="button button-primary" type="button" disabled={!isValidTimezone(values.timezone)} onClick={onContinue}>Choose your time <span aria-hidden="true">→</span></button></div>
  </section>
}
