export default function BookingForm({ values, onChange, onContinue }) {
  const update = (field) => (event) => onChange({ ...values, [field]: event.target.value })
  return <form className="booking-form" onSubmit={(event) => { event.preventDefault(); onContinue() }}>
    <div className="section-heading"><span className="step-kicker">STEP 01 · ABOUT YOU</span><h2>Let’s get to know you.</h2><p>Share a few details so we can prepare your child’s trial class.</p></div>
    <div className="field-grid field-grid-two parent-fields">
      <div className="field-group"><label htmlFor="parent-name">Your name</label><input id="parent-name" value={values.name} onChange={update('name')} autoComplete="name" placeholder="e.g. Jordan Lee" maxLength={160} required /></div>
      <div className="field-group"><label htmlFor="parent-email">Email address</label><input id="parent-email" type="email" value={values.email} onChange={update('email')} autoComplete="email" placeholder="you@example.com" maxLength={254} required /></div>
    </div>
    <div className="form-actions"><span className="privacy-note"><span aria-hidden="true">⌑</span> Your details stay private.</span><button className="button button-primary" type="submit">Continue <span aria-hidden="true">→</span></button></div>
  </form>
}
