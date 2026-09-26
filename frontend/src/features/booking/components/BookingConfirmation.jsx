function deliveryLabel(status) {
  if (status === 'sent') return 'Sent'
  if (status === 'failed') return 'Delivery failed'
  return 'Delivery pending'
}
function DeliveryStatus({ label, email, status }) {
  return <div className={'delivery-status ' + (status === 'sent' ? 'delivery-sent' : status === 'failed' ? 'delivery-failed' : '')}>
    <span className="delivery-icon" aria-hidden="true">{status === 'sent' ? '✓' : status === 'failed' ? '!' : '◷'}</span>
    <span><strong>{label} · {deliveryLabel(status)}</strong><a href={`mailto:${email}`}>{email}</a></span>
  </div>
}

export default function BookingConfirmation({ booking, onStartOver }) {
  const parentTime = booking.parent.local_time
  const mentorTime = booking.mentor.local_time
  const locationLabel = (person) => {
    const location = person.location ?? person
    return location.city === 'Not specified' ? 'Location not specified' : [location.continent, location.country, location.state_region, location.city].filter(Boolean).join(' → ')
  }
  return <main className="confirmation-page">
    <nav className="topbar confirmation-topbar" aria-label="Main navigation"><a className="brand" href="/" onClick={(event) => { event.preventDefault(); onStartOver() }}><span className="brand-mark">C</span><span>codeyoung</span></a><span className="phase-label">TRIAL CLASS CONFIRMED</span></nav>
    <section className="confirmation-card">
      <div className="confirmation-check" aria-hidden="true">✓</div><p className="step-kicker">YOUR FIRST CLASS IS ON THE CALENDAR</p><h1>You’re all set!</h1>
      <p className="confirmation-intro">Your trial class has been successfully booked.</p>
      <div className="confirmation-people"><p><span>Parent</span><strong>{booking.parent.name}</strong><small>{booking.parent.location ? locationLabel(booking.parent) : ''}</small></p><p><span>Mentor</span><strong>{booking.mentor.name}</strong><small>{booking.mentor.location ? locationLabel(booking.mentor) : ''}</small></p></div>
      <div className="confirmation-details">
        <div className="confirmation-time primary-confirmation-time"><span className="slot-label">YOUR LOCAL TIME</span><strong>{parentTime}</strong><small>{booking.parent.local_date}</small><small>{booking.parent.timezone}</small></div>
        <div className="confirmation-time"><span className="slot-label">MENTOR’S LOCAL TIME</span><strong>{mentorTime}</strong><small>{booking.mentor.local_date}</small><small>{booking.mentor.timezone}</small></div>
      </div>
      <div className="confirmation-instructions"><p>Your mentor will see this class at <strong>{mentorTime}</strong>.</p><p>Please join at <strong>{parentTime}</strong>.</p></div>
      <a className="button button-primary meeting-link" href={booking.meeting_link}>Open trial class details <span aria-hidden="true">→</span></a>
      <div className="delivery-status-list" aria-label="Email delivery status"><DeliveryStatus label="Parent confirmation" email={booking.parent.email} status={booking.confirmation_email_status} /><DeliveryStatus label="Mentor notification" email={booking.mentor.email} status={booking.mentor_email_status} /></div>
      {booking.confirmation_email_status === 'failed' && <p className="confirmation-email-note" role="status">Your booking is confirmed, but the parent confirmation email could not be delivered. Save your class link above and contact CodeYoung for help.</p>}
      <button className="text-button start-over" type="button" onClick={onStartOver}>Book another trial class</button>
    </section>
  </main>
}
