import { useEffect, useMemo, useState } from 'react'
import { getAdminBookings, getAdminMentorCapacity } from '../../shared/api/client.js'
import OperationsShell from './OperationsShell.jsx'
import LoadingState from '../booking/components/LoadingState.jsx'
import ErrorState from '../booking/components/ErrorState.jsx'

const loc = (value) => value.city === 'Not specified' ? 'Location not specified' : [value.continent, value.country, value.state_region, value.city].filter(Boolean).join(' → ')
const dt = (value) => value ? new Date(value).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' }) : '—'
export default function AdminDashboard() {
  const [rows, setRows] = useState([])
  const [capacityRows, setCapacityRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getAdminBookings({ signal: controller.signal }), getAdminMentorCapacity({ signal: controller.signal })])
      .then(([bookings, capacity]) => { setRows(bookings); setCapacityRows(capacity) })
      .catch(() => { if (!controller.signal.aborted) setError('We couldn’t load operations data. Sign in with a Django staff account and try again.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  const visibleRows = useMemo(() => statusFilter === 'all' ? rows : rows.filter((row) => row.status === statusFilter), [rows, statusFilter])
  const scheduled = rows.filter((row) => row.status === 'scheduled').length
  const sentParents = rows.filter((row) => row.confirmation_email_status === 'sent').length
  const failedDelivery = rows.filter((row) => row.confirmation_email_status === 'failed' || row.mentor_email_status === 'failed').length
  return <OperationsShell title="Operations overview" eyebrow="ADMIN · INTERNAL WORKSPACE">
    {loading && <LoadingState label="Loading bookings and capacity…" />}
    {!loading && error && <ErrorState title="Operations data unavailable" message={error} />}
    {!loading && !error && <>
      <section className="dashboard-summary admin-summary" aria-label="Booking overview">
        <article><span>TOTAL BOOKINGS</span><strong>{rows.length}</strong><p>All trial-class appointments</p></article>
        <article><span>SCHEDULED</span><strong>{scheduled}</strong><p>Upcoming or active classes</p></article>
        <article><span>PARENT CONFIRMATIONS</span><strong>{sentParents}<small> / {rows.length}</small></strong><p>Parent messages delivered</p></article>
        <article className={failedDelivery ? 'summary-alert' : ''}><span>EMAIL DELIVERY ISSUES</span><strong>{failedDelivery}</strong><p>Bookings with at least one failed email</p></article>
      </section>
      {capacityRows.length > 0 && <section className="capacity-panel"><div className="section-heading"><span className="step-kicker">LOCAL-DAY CAPACITY</span><h2>Mentor availability today</h2><p>Each count uses the mentor’s own local calendar date and timezone.</p></div>
        <div className="capacity-table-wrap"><table className="capacity-table"><thead><tr><th>Mentor</th><th>Location</th><th>IANA timezone</th><th>Local date</th><th>Classes today</th><th>Capacity</th></tr></thead><tbody>{capacityRows.map((mentor) => <tr key={mentor.id}><td>{mentor.name}</td><td>{[mentor.city, mentor.country].filter(Boolean).join(', ')}</td><td><code>{mentor.timezone}</code></td><td>{mentor.local_date}</td><td>{mentor.classes_today}</td><td>{mentor.classes_today} / {mentor.daily_capacity}</td></tr>)}</tbody></table></div>
      </section>}
      <section className="dashboard-booking-section"><div className="dashboard-section-title"><div><span className="section-eyebrow">APPOINTMENTS</span><h2>Recent bookings</h2></div><label className="filter-select">Filter status<select aria-label="Filter bookings by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All bookings</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label></div>
        {!visibleRows.length ? <div className="state-panel empty-panel"><strong>{rows.length ? 'No bookings match this filter' : 'No bookings yet'}</strong><span>Created trial classes will appear here.</span></div> : <div className="debug-bookings">{visibleRows.map((booking) => <article className="debug-card" key={booking.id}>
          <header><div><span className="slot-label">BOOKING ID</span><strong>#{booking.id}</strong></div><span className={'status-pill status-' + booking.status}>{booking.status}</span></header>
          <div className="delivery-mini"><span>Parent confirmation <strong className={'delivery-text ' + booking.confirmation_email_status}>{booking.confirmation_email_status || 'pending'}</strong></span><span>Mentor notification <strong className={'delivery-text ' + booking.mentor_email_status}>{booking.mentor_email_status || 'pending'}</strong></span></div>
          <div className="debug-grid"><section><h2>Parent</h2><dl><dt>Name</dt><dd>{booking.parent.name}</dd><dt>Email</dt><dd><a href={`mailto:${booking.parent.email}`}>{booking.parent.email}</a></dd><dt>Location</dt><dd>{loc(booking.parent.location ?? booking.parent)}</dd><dt>Timezone</dt><dd>{booking.parent.timezone}</dd><dt>Parent local time</dt><dd>{booking.parent.local_date} · {booking.parent.local_time}</dd></dl></section>
            <section><h2>Mentor</h2><dl><dt>Name</dt><dd>{booking.mentor.name}</dd><dt>Email</dt><dd>{booking.mentor.email}</dd><dt>Location</dt><dd>{loc(booking.mentor.location ?? booking.mentor)}</dd><dt>Timezone</dt><dd>{booking.mentor.timezone}</dd><dt>Mentor local time</dt><dd>{booking.mentor.local_date} · {booking.mentor.local_time}</dd></dl></section>
            <section className="debug-technical"><h2>Appointment</h2><dl><dt>UTC start</dt><dd>{dt(booking.start_time_utc)}</dd><dt>UTC end</dt><dd>{dt(booking.end_time_utc)}</dd><dt>Created</dt><dd>{dt(booking.created_at)}</dd><dt>Meeting link</dt><dd><a href={booking.meeting_link}>{booking.meeting_link}</a></dd></dl></section></div>
        </article>)}</div>}
      </section>
    </>}
  </OperationsShell>
}
