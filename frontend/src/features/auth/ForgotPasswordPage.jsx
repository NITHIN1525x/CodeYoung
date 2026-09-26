import { useState } from 'react'
import { requestPasswordReset } from '../../shared/api/client.js'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your email address.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return }
    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch {
      setError('We couldn’t connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  return <main className="auth-page"><a className="brand auth-brand" href="/"><span className="brand-mark">C</span><span>codeyoung</span></a>
    <section className="auth-card"><div className="auth-mark" aria-hidden="true">↗</div><span className="section-eyebrow">ACCOUNT SUPPORT</span><h1>Reset your password</h1>
      {sent ? <div className="auth-reset-success" role="status"><strong>Check your inbox</strong><p>If an active CodeYoung account uses that email, password reset instructions will be sent.</p></div> : <><p className="auth-subtitle">Enter the email linked to your account and we’ll send reset instructions if it’s registered.</p>
        <form className="auth-form" onSubmit={submit} noValidate><div className="field-group"><label htmlFor="reset-email">Email address</label><input id="reset-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div>
          {error && <p className="auth-error" role="alert">{error}</p>}<button className="button button-primary auth-submit" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send reset instructions'}</button></form></>}
      <a className="auth-back-link" href="/login">← Back to sign in</a>
    </section><footer className="auth-footer"><a href="/">← Back to CodeYoung</a><span>Secure account access</span></footer></main>
}
