import { useEffect, useState } from 'react'
import { getAdminBookings, getAdminMentorCapacity } from '../../shared/api/client.js'
import OperationsShell from './OperationsShell.jsx'
import LoadingState from '../booking/components/LoadingState.jsx'
import ErrorState from '../booking/components/ErrorState.jsx'
const loc = (v) => v.city === 'Not specified' ? 'Location not specified' : [v.continent, v.country, v.state_region, v.city].filter(Boolean).join(' → ')
const dt = (v) => v ? new Date(v).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' }) : '—'
export default function AdminDashboard() {
  const [rows, setRows] = useState([]); const [capacityRows, setCapacityRows] = useState([])
  const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => {
    const c = new AbortController()
    Promise.all([getAdminBookings({ signal: c.signal }), getAdminMentorCapacity({ signal: c.signal })])
      .then(([bookings, capacity]) => { setRows(bookings); setCapacityRows(capacity) })
      .catch((e) => { if (!c.signal.aborted) setError(e.message) })
      .finally(() => { if (!c.signal.aborted) setLoading(false) })
    return () => c.abort()
  }, [])
  return <OperationsShell title="Booking debug dashboard" eyebrow="ADMIN · READ ONLY">
    {loading && <LoadingState label="Loading bookings…" />}
    {!loading && error && <ErrorState title="Bookings unavailable" message={`${error} Sign in with a Django staff account, then reload this page.`} />}
    {!loading && !error && capacityRows.length > 0 && <section className="capacity-panel">
      <div className="section-heading"><span className="step-kicker">LOCAL-DAY CAPACITY</span><h2>Mentor availability today</h2>
        <p>Each count uses the mentor’s own local calendar date and timezone.</p></div>
      <div className="capacity-table-wrap"><table className="capacity-table">
        <thead><tr><th>Mentor</th><th>Location</th><th>IANA timezone</th><th>Local date</th><th>Classes today</th><th>Capacity</th></tr></thead>
        <tbody>{capacityRows.map((mentor) => <tr key={mentor.id}>
          <td>{mentor.name}</td><td>{[mentor.city, mentor.country].filter(Boolean).join(', ')}</td>
          <td><code>{mentor.timezone}</code></td><td>{mentor.local_date}</td>
          <td>{mentor.classes_today}</td><td>{mentor.classes_today} / {mentor.daily_capacity}</td>
        </tr>)}</tbody>
      </table></div>
    </section>}
    {!loading && !error && !rows.length && <div className="state-panel empty-panel"><strong>No bookings yet</strong><span>Created trial classes will appear here.</span></div>}
    {!loading && !error && rows.length > 0 && <div className="debug-bookings">{rows.map((b) => <article className="debug-card" key={b.id}>
      <header><div><span className="slot-label">BOOKING ID</span><strong>#{b.id}</strong></div><span className="status-pill">{b.status}</span></header>
      <div className="debug-grid">
        <section><h2>Parent</h2><dl><dt>Name</dt><dd>{b.parent.name}</dd><dt>Email</dt><dd><a href={`mailto:${b.parent.email}`}>{b.parent.email}</a></dd><dt>Location</dt><dd>{loc(b.parent.location ?? b.parent)}</dd><dt>Timezone</dt><dd>{b.parent.timezone}</dd><dt>Parent local time</dt><dd>{b.parent.local_date} · {b.parent.local_time}</dd></dl></section>
        <section><h2>Mentor</h2><dl><dt>Name</dt><dd>{b.mentor.name}</dd><dt>Email</dt><dd>{b.mentor.email}</dd><dt>Location</dt><dd>{loc(b.mentor.location ?? b.mentor)}</dd><dt>Timezone</dt><dd>{b.mentor.timezone}</dd><dt>Mentor local time</dt><dd>{b.mentor.local_date} · {b.mentor.local_time}</dd></dl></section>
        <section className="debug-technical"><h2>Appointment</h2><dl><dt>UTC start</dt><dd>{dt(b.start_time_utc)}</dd><dt>UTC end</dt><dd>{dt(b.end_time_utc)}</dd><dt>Created</dt><dd>{dt(b.created_at)}</dd><dt>Meeting link</dt><dd><a href={b.meeting_link} target="_blank" rel="noreferrer">{b.meeting_link}</a></dd></dl></section>
      </div>
    </article>)}</div>}
  </OperationsShell>
}
