import { useEffect, useState } from 'react'
import { getDemoClass } from '../../shared/api/client.js'
import ErrorState from './components/ErrorState.jsx'
import LoadingState from './components/LoadingState.jsx'

export default function DemoClassPage({ meetingId }) {
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    getDemoClass(meetingId, { signal: controller.signal })
      .then(setDetails)
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message || 'This demo class could not be found.')
      })
    return () => controller.abort()
  }, [meetingId])

  const startClass = () => setEntered(true)
  return (
    <main className="demo-class-page">
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="/"><span className="brand-mark">C</span><span>codeyoung</span></a>
        <span className="phase-label">TRIAL CLASS</span>
      </nav>
      <section className="demo-class-card" aria-live="polite">
        {!details && !error && <LoadingState label="Loading your demo class…" />}
        {error && <ErrorState title="Demo class unavailable" message={error} />}
        {details && <>
          <span className="demo-class-icon" aria-hidden="true">✦</span>
          <p className="step-kicker">CODEYOUNG TRIAL CLASS</p>
          <h1>Demo Class</h1>
          <p className="demo-class-notice">This is a demo meeting. No video or microphone connection is required.</p>
          <div className="demo-class-details">
            <div><span>Mentor</span><strong>{details.mentor.name}</strong></div>
            <div><span>Appointment status</span><strong>{details.status}</strong></div>
            <div><span>Your local date and time</span><strong>{details.parent_time.local_date}</strong><strong>{details.parent_time.local_time}</strong><small>{details.parent_time.timezone}</small></div>
            <div><span>Mentor’s local date and time</span><strong>{details.mentor.local_date}</strong><strong>{details.mentor.local_time}</strong><small>{details.mentor.timezone}</small></div>
            <div><span>Class length</span><strong>{details.duration_minutes} minutes</strong></div>
          </div>
          {!entered
            ? <button className="button button-primary demo-enter-button" type="button" onClick={startClass}>Enter Demo Class <span aria-hidden="true">→</span></button>
            : <p className="demo-entered-message" role="status">You’ve entered the demo class. This demo meeting is ready.</p>}
        </>}
      </section>
    </main>
  )
}
