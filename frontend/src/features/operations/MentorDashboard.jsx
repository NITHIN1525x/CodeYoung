import { useEffect, useState } from 'react'
import { getMentorBookings, getMentors } from '../../shared/api/client.js'
import OperationsShell from './OperationsShell.jsx'
import LoadingState from '../booking/components/LoadingState.jsx'
import ErrorState from '../booking/components/ErrorState.jsx'

const location = (person) => [person.continent, person.country, person.state_region, person.city].filter(Boolean).join(' → ')
function localToday(timezone) {
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' }).format(new Date())
}

export default function MentorDashboard() {
  const [mentors, setMentors] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    getMentors({ signal: controller.signal }).then((items) => {
      setMentors(items)
      if (items.length) setSelectedId(String(items[0].id))
      setLoading(false)
    }).catch((err) => { if (!controller.signal.aborted) { setError('We couldn’t load the mentor list. Please try again.'); setLoading(false) } })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!selectedId) return undefined
    const controller = new AbortController()
    setLoading(true); setError(''); setData(null)
    getMentorBookings(selectedId, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) { setData(result); setLoading(false) }
    }).catch(() => { if (!controller.signal.aborted) { setError('We couldn’t load this schedule. Please try again.'); setLoading(false) } })
    return () => controller.abort()
  }, [selectedId])
  const mentor = data?.mentor ?? mentors.find((item) => String(item.id) === selectedId)
  const bookings = data?.bookings ?? []
  const today = mentor ? localToday(mentor.timezone) : ''
  const todayCount = bookings.filter((booking) => booking.mentor.local_date === today && booking.status !== 'cancelled').length
  const scheduledCount = bookings.filter((booking) => booking.status === 'scheduled').length
  return <OperationsShell title={mentor ? `Welcome, ${mentor.name.split(' ')[0]}` : 'Mentor schedule'} eyebrow="MENTOR WORKSPACE">
    <section className="operations-panel mentor-panel">
      <div className="operations-toolbar"><div><label className="slot-label" htmlFor="mentor-select">VIEW A MENTOR SCHEDULE</label><select id="mentor-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{mentors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        {mentor && <div className="mentor-overview"><strong>{mentor.name}</strong><span>{location(mentor)}</span><small>{mentor.timezone}</small></div>}</div>
      {loading && <LoadingState label="Loading mentor schedule…" />}
      {!loading && error && <ErrorState title="Could not load schedule" message={error} />}
      {!loading && !error && data && <>
        <div className="dashboard-summary"><article><span>TODAY · {today || 'LOCAL TIME'}</span><strong>{todayCount} <small>/ 2</small></strong><p>Classes booked in your local day</p><div className="capacity-meter"><i style={{ width: `${Math.min(todayCount, 2) * 50}%` }} /></div></article><article><span>TRIAL CLASSES</span><strong>{scheduledCount}</strong><p>Currently scheduled on your calendar</p></article><article><span>YOUR LOCATION</span><strong className="summary-location">{mentor?.city}, {mentor?.country}</strong><p>All times are displayed in {mentor?.timezone}</p></article></div>
        <div className="dashboard-section-title"><div><span className="section-eyebrow">YOUR CALENDAR</span><h2>Booked trial classes</h2></div><span>{bookings.length} total</span></div>
        {bookings.length === 0 ? <div className="state-panel empty-panel"><span className="state-icon" aria-hidden="true">◷</span><strong>No trial classes booked yet</strong><span>Newly assigned classes will appear here.</span></div> : <div className="class-list">{bookings.map((booking) => <article className="class-card" key={booking.id}>
          <div className="class-card-heading"><div><span className="slot-label">YOUR LOCAL TIME</span><strong>{booking.mentor.local_time}</strong><small>{booking.mentor.local_date}</small></div><span className={'status-pill status-' + booking.status}>{booking.status}</span></div>
          <div className="class-parent"><strong>Parent: {booking.parent.name}</strong><span>Parent’s local time: {booking.parent.local_time}</span><small>{booking.parent.local_date}</small></div>
          <a className="button button-primary" href={booking.meeting_link}>Open class details <span aria-hidden="true">→</span></a>
        </article>)}</div>}
      </>}
    </section>
  </OperationsShell>
}
