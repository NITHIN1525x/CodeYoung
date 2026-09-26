import { useEffect, useRef, useState } from 'react'
import { createBooking, getAvailability, getBooking } from '../../shared/api/client.js'
import BookingConfirmation from './components/BookingConfirmation.jsx'
import { createBookingPayload } from './bookingPayload.js'
import BookingForm from './components/BookingForm.jsx'
import DateSelector, { formatSelectedDate } from './components/DateSelector.jsx'
import ErrorState from './components/ErrorState.jsx'
import LoadingState from './components/LoadingState.jsx'
import SlotList from './components/SlotList.jsx'
import LocationStep from './LocationStep.jsx'
import { detectBrowserTimezone, isValidTimezone } from './locationData.js'

function newIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'booking-' + Date.now() + '-' + Math.random().toString(36).slice(2)
}
function nextRoute(path, state = {}) {
  window.history.pushState(state, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
const emptyParent = () => ({ name: '', email: '', continent: '', country: '', state_region: '', city: '', timezone: '' })
const steps = [
  ['01', 'About you', 'Your contact details'],
  ['02', 'Your location', 'Timezone and local time'],
  ['03', 'Choose a time', 'Pick a day and slot'],
  ['04', 'Confirm', 'Review your class'],
]

export default function BookingFlow() {
  const [detection, setDetection] = useState({ state: 'loading', timezone: '' })
  const [route, setRoute] = useState(() => window.location.pathname)
  const [stage, setStage] = useState(1)
  const [parent, setParent] = useState(emptyParent)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState([])
  const [availabilityState, setAvailabilityState] = useState('idle')
  const [availabilityError, setAvailabilityError] = useState('')
  const [availabilityRetry, setAvailabilityRetry] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmation, setConfirmation] = useState(() => window.history.state?.booking ?? null)
  const [confirmationRetry, setConfirmationRetry] = useState(0)
  const submitLock = useRef(false)
  const idempotencyKey = useRef('')
  const detectedTimezone = detection.timezone

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const timezone = detectBrowserTimezone()
      setDetection({ state: timezone ? 'detected' : 'failed', timezone })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  const confirmationMatch = route.match(/^\/booking\/confirmation\/(\d+)\/?$/)
  const confirmationId = confirmationMatch?.[1]

  useEffect(() => {
    if (!confirmationId || confirmation) return undefined
    let email = null
    try { email = sessionStorage.getItem('codeyoung:confirmation-email:' + confirmationId) } catch { email = null }
    if (!email) {
      setSubmitError('This confirmation is not available in this browser session. Check your email for the booking details.')
      return undefined
    }
    const controller = new AbortController()
    getBooking(confirmationId, email, { signal: controller.signal }).then(setConfirmation).catch((error) => {
      if (!controller.signal.aborted) setSubmitError(error.message || 'Check your email for the class details.')
    })
    return () => controller.abort()
  }, [confirmationId, confirmation, confirmationRetry])

  useEffect(() => {
    if (stage !== 3 || !selectedDate) return undefined
    const controller = new AbortController()
    setAvailabilityState('loading')
    setAvailabilityError('')
    setSlots([])
    setSelectedSlot(null)
    getAvailability({ date: selectedDate, timezone: parent.timezone }, { signal: controller.signal }).then((payload) => {
      if (controller.signal.aborted) return
      setSlots(Array.isArray(payload.slots) ? payload.slots : [])
      setAvailabilityState('loaded')
    }).catch((error) => {
      if (controller.signal.aborted) return
      setAvailabilityError(error.message || 'Please check your connection and try again.')
      setAvailabilityState('error')
    })
    return () => controller.abort()
  }, [stage, selectedDate, parent.timezone, availabilityRetry])

  const changeParent = (values) => {
    if (values.timezone !== parent.timezone) {
      setSelectedSlot(null)
      idempotencyKey.current = ''
    }
    setParent(values)
  }
  const selectSlot = (slot) => { setSelectedSlot(slot); setSubmitError(''); idempotencyKey.current = '' }
  const submitBooking = async (event) => {
    event.preventDefault()
    if (!selectedSlot || submitLock.current || submitting) return
    submitLock.current = true
    setSubmitting(true)
    setSubmitError('')
    if (!idempotencyKey.current) idempotencyKey.current = newIdempotencyKey()
    try {
      const booking = await createBooking(createBookingPayload(parent, selectedSlot), idempotencyKey.current)
      setConfirmation(booking)
      try { sessionStorage.setItem('codeyoung:confirmation-email:' + booking.id, booking.parent.email) } catch { /* in-memory confirmation remains available */ }
      nextRoute('/booking/confirmation/' + booking.id, { booking })
    } catch (error) {
      setSubmitError(error.message || 'We could not complete the booking. Your selection is still here.')
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }
  const startOver = () => {
    setConfirmation(null); setParent(emptyParent()); setSelectedDate(''); setSlots([]); setSelectedSlot(null); setStage(1); setSubmitError(''); idempotencyKey.current = ''
    nextRoute('/', {})
  }

  if (confirmationId) {
    if (confirmation) return <BookingConfirmation booking={confirmation} onStartOver={startOver} />
    return <main className="booking-page confirmation-loading-page"><header className="topbar"><a className="brand" href="/"><span className="brand-mark">C</span><span>codeyoung</span></a></header>{submitError ? <ErrorState title="Confirmation unavailable" message={submitError} onRetry={() => { setSubmitError(''); setConfirmationRetry((count) => count + 1) }} /> : <LoadingState label="Loading your confirmation…" />}</main>
  }

  return <main className="booking-page">
    <nav className="topbar booking-topbar" aria-label="Main navigation"><a className="brand" href="/"><span className="brand-mark">C</span><span>codeyoung</span></a><div className="topbar-right"><span className="secure-label"><span aria-hidden="true">✦</span> A complimentary first class</span><a className="booking-home-link" href="/">← Home</a></div></nav>
    <div className="booking-layout">
      <aside className="booking-aside"><p className="eyebrow"><span className="eyebrow-dot" /> A little curiosity goes a long way</p><h1>Big ideas start<br />with a <em>first class.</em></h1><p className="aside-copy">A thoughtful first step into coding, creativity, and the confidence to build something of their own.</p>
        <div className="journey-steps" aria-label="Booking progress">{steps.map(([number, title, description], index) => <div className={'journey-step ' + (stage === index + 1 ? 'active' : '') + (stage > index + 1 ? 'complete' : '')} key={number} aria-current={stage === index + 1 ? 'step' : undefined}><span className="journey-number">{stage > index + 1 ? '✓' : number}</span><span><strong>{title}</strong><small>{description}</small></span></div>)}</div>
        <div className="aside-quote"><span className="quote-stars" aria-hidden="true">✦ ✦ ✦ ✦ ✦</span><p>“The best way to learn is to make something you’re proud of.”</p><small>Let’s make their first project happen.</small></div><div className="aside-orbit" aria-hidden="true"><span>✳</span></div>
      </aside>
      <section className="booking-card" aria-live="polite">
        {stage === 1 && <BookingForm values={parent} onChange={changeParent} onContinue={() => setStage(2)} />}
        {stage === 2 && <LocationStep values={parent} onChange={changeParent} detectionState={detection.state} detectedTimezone={detectedTimezone} onBack={() => setStage(1)} onContinue={() => setStage(3)} />}
        {stage === 3 && <div className="availability-step"><div className="availability-heading"><div><span className="step-kicker">STEP 03 · CHOOSE YOUR TIME</span><h2>Find a time that works.</h2><p>Times are shown in your local timezone, <strong>{parent.timezone}</strong>.</p></div><button type="button" className="date-edit-button" onClick={() => setStage(2)}>Change location</button></div>
          <DateSelector value={selectedDate} onChange={(value) => { setSelectedDate(value); setSelectedSlot(null); setSubmitError(''); idempotencyKey.current = '' }} timezone={parent.timezone} />
          {!selectedDate && <div className="state-panel empty-panel"><span className="state-icon" aria-hidden="true">◷</span><strong>Choose a date to see available times.</strong><span>We’ll show times in your timezone and match a mentor automatically.</span></div>}
          {availabilityState === 'loading' && selectedDate && <LoadingState label="Finding available class times…" />}
          {availabilityState === 'error' && <ErrorState title="Availability unavailable" message={availabilityError} onRetry={() => setAvailabilityRetry((count) => count + 1)} />}
          {availabilityState === 'loaded' && slots.length === 0 && <div className="state-panel empty-panel"><span className="state-icon" aria-hidden="true">◷</span><strong>No mentors are available for this time.</strong><span>Please choose another date.</span></div>}
          {availabilityState === 'loaded' && slots.length > 0 && <><div className="slot-legend"><span><i className="legend-primary" /> Your local time</span><span><i className="legend-secondary" /> Mentor’s local time</span></div><SlotList slots={slots} selectedSlot={selectedSlot} onSelect={selectSlot} /></>}
          <div className="form-actions"><button type="button" className="text-button" onClick={() => setStage(2)}>← Back</button><button type="button" className="button button-primary" disabled={!selectedSlot || availabilityState !== 'loaded'} onClick={() => { setSubmitError(''); setStage(4) }}>Review your class <span aria-hidden="true">→</span></button></div>
        </div>}
        {stage === 4 && selectedSlot && <section className="booking-review"><div className="section-heading"><span className="step-kicker">STEP 04 · CONFIRM</span><h2>One last look.</h2><p>We’ll automatically match your child with an available mentor.</p></div>
          <div className="review-card"><div><span className="slot-label">CLASS DATE</span><strong>{formatSelectedDate(selectedDate)}</strong></div><div className="review-times"><div><span className="slot-label">YOUR LOCAL TIME</span><strong>{selectedSlot.parent_local_display}</strong><small>{parent.timezone}</small></div><div><span className="slot-label">AVAILABLE MENTOR LOCAL TIME</span><strong>{selectedSlot.mentor_local_time}</strong><small>The mentor is assigned automatically</small></div></div><div className="review-match"><span className="review-match-icon">✦</span><span><strong>{selectedSlot.available_mentor_count} mentors available</strong><small>You won’t need to choose a mentor.</small></span></div></div>
          {submitError && <ErrorState title="Booking not completed" message={submitError} />}
          <form className="form-actions review-actions" onSubmit={submitBooking}><button type="button" className="text-button" onClick={() => { setStage(3); setSubmitError('') }} disabled={submitting}>← Choose a different time</button><button className="button button-primary confirm-button" type="submit" disabled={submitting}>{submitting ? <><span className="button-spinner" /> Confirming…</> : <>Confirm trial class <span aria-hidden="true">→</span></>}</button></form>
        </section>}
      </section>
    </div><footer className="booking-footer"><span>© {new Date().getFullYear()} CodeYoung · A little curiosity goes a long way</span><span>Secure, private booking</span></footer>
  </main>
}
