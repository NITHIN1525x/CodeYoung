import { useEffect, useState } from 'react'
import { getMentorBookings, getMentors } from '../../shared/api/client.js'
import OperationsShell from './OperationsShell.jsx'
import LoadingState from '../booking/components/LoadingState.jsx'
import ErrorState from '../booking/components/ErrorState.jsx'

const location = (person) => [person.continent, person.country, person.state_region, person.city].filter(Boolean).join(' → ')

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
    }).catch((err) => { if (!controller.signal.aborted) { setError(err.message); setLoading(false) } })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!selectedId) return undefined
    const controller = new AbortController()
    setLoading(true); setError(''); setData(null)
    getMentorBookings(selectedId, { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) { setData(result); setLoading(false) }
    }).catch((err) => { if (!controller.signal.aborted) { setError(err.message); setLoading(false) } })
    return () => controller.abort()
  }, [selectedId])
  const mentor = data?.mentor ?? mentors.find((item) => String(item.id) === selectedId)
  return <OperationsShell title="Mentor schedule" eyebrow="READ-ONLY DASHBOARD">
    <section className="operations-panel">
      <div className="operations-toolbar">
        <div><span className="slot-label">SELECT MENTOR</span><select aria-label="Select mentor" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {mentors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></div>
        {mentor && <div className="mentor-overview"><strong>{mentor.name}</strong><span>{location(mentor)}</span><small>{mentor.timezone}</small></div>}
      </div>
      {loading && <LoadingState label="Loading mentor schedule…" />}
      {!loading && error && <ErrorState title="Could not load schedule" message={error} />}
      {!loading && !error && data?.bookings?.length === 0 && <div className="state-panel empty-panel"><strong>No trial classes booked</strong><span>Booked classes will appear here.</span></div>}
      {!loading && !error && data?.bookings?.length > 0 && <div className="class-list">{data.bookings.map((booking) => <article className="class-card" key={booking.id}>
        <div className="class-card-heading"><div><span className="slot-label">MENTOR’S LOCAL TIME</span><strong>{booking.mentor.local_time}</strong><small>{booking.mentor.local_date}</small></div><span className="status-pill">{booking.status}</span></div>
        <div className="class-parent"><strong>Parent: {booking.parent.name}</strong><span>Parent’s time: {booking.parent.local_time}</span><small>{booking.parent.local_date}</small></div>
        <a className="button button-primary" href={booking.meeting_link} target="_blank" rel="noreferrer">Join class ↗</a>
      </article>)}</div>}
    </section>
  </OperationsShell>
}
