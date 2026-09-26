import { useEffect, useState } from 'react'
import { getDemoClass } from '../../shared/api/client.js'
import ErrorState from './components/ErrorState.jsx'
import LoadingState from './components/LoadingState.jsx'

export default function DemoClassPage({ meetingId }) {
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getDemoClass(meetingId, { signal: controller.signal })
      .then(setDetails)
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message || 'This demo class could not be found.')
      })
    return () => controller.abort()
  }, [meetingId])

  useEffect(() => {
    if (!details || details.access_available) return undefined
    const controller = new AbortController()
    const interval = window.setInterval(() => {
      getDemoClass(meetingId, { signal: controller.signal })
        .then(setDetails)
        .catch(() => {})
    }, 15000)
    return () => {
      controller.abort()
      window.clearInterval(interval)
    }
  }, [details, meetingId])
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
          <p className="demo-class-notice">This is a demo meeting. Your appointment details are shown in your local time and your mentor’s local time.</p>
          <div className="demo-class-details">
            <div><span>Mentor</span><strong>{details.mentor.name}</strong>
              {details.mentor.location && <small>{details.mentor.location.city === 'Not specified'
                ? 'Location not specified'
                : Object.values(details.mentor.location).join(' → ')}</small>}</div>
            <div><span>Appointment status</span><strong>{details.status}</strong></div>
            <div><span>Your local date and time</span><strong>{details.parent_time.local_date}</strong><strong>{details.parent_time.local_time}</strong><small>{details.parent_time.timezone}</small></div>
            <div><span>Mentor’s local date and time</span><strong>{details.mentor.local_date}</strong><strong>{details.mentor.local_time}</strong><small>{details.mentor.timezone}</small></div>
            <div><span>Class length</span><strong>{details.duration_minutes} minutes</strong></div>
          </div>
          {details.access_available
            ? <>
                <p className="demo-entered-message" role="status">Your demo class is ready. The video opens in a new tab.</p>
                <a className="button button-primary demo-enter-button" href={details.video_url} target="_blank" rel="noopener noreferrer">Open Demo Class Video <span aria-hidden="true">↗</span></a>
              </>
            : <p className="demo-locked-message" role="status">Your demo video is locked until your scheduled start time: {details.parent_time.local_date} at {details.parent_time.local_time}. This page will check again automatically.</p>}
        </>}
      </section>
    </main>
  )
}
