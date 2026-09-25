import { useEffect, useState } from 'react'
import { getEmailOutbox } from '../../shared/api/client.js'
import OperationsShell from './OperationsShell.jsx'
import LoadingState from '../booking/components/LoadingState.jsx'
import ErrorState from '../booking/components/ErrorState.jsx'
export default function EmailOutboxPage() {
  const [emails, setEmails] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => { const c = new AbortController(); getEmailOutbox({ signal: c.signal }).then(setEmails).catch((e) => { if (!c.signal.aborted) setError(e.message) }).finally(() => { if (!c.signal.aborted) setLoading(false) }); return () => c.abort() }, [])
  return <OperationsShell title="Email outbox" eyebrow="EMAIL DELIVERY RECORDS">
    {loading && <LoadingState label="Loading email delivery records…" />}
    {!loading && error && <ErrorState title="Outbox unavailable" message={`${error} Sign in with a Django staff account, then reload this page.`} />}
    {!loading && !error && emails.length === 0 && <div className="state-panel empty-panel"><strong>No generated emails</strong><span>Booking confirmation messages will appear here.</span></div>}
    {!loading && !error && <section className="outbox-list">{emails.map((email) => <article className="outbox-card" key={email.id}>
      <header><span className="status-pill">{email.status}</span><span>{email.email_type.replaceAll('_', ' ')}</span><time>{new Date(email.created_at).toLocaleString(undefined, { timeZone: 'UTC', timeZoneName: 'short' })}</time></header>
      <dl><dt>Recipient</dt><dd><a href={`mailto:${email.recipient}`}>{email.recipient}</a></dd><dt>Subject</dt><dd>{email.subject}</dd><dt>Appointment</dt><dd>#{email.appointment_id}</dd></dl>
      <div className="email-body"><span className="slot-label">MESSAGE BODY</span><p>{email.body}</p></div>
    </article>)}</section>}
  </OperationsShell>
}
