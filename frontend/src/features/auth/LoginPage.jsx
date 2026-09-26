import { useState } from 'react'
import { loginUser } from '../../shared/api/client.js'

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your email address.'); return }
    if (!validEmail(email.trim())) { setError('Enter a valid email address.'); return }
    if (!password) { setError('Please enter your password.'); return }
    setLoading(true)
    try {
      const result = await loginUser({ email: email.trim(), password, remember })
      setUser(result.user)
      setPassword('')
    } catch (requestError) {
      if (requestError.status === 401) setError('Email or password is incorrect.')
      else if (requestError.status) setError('We couldn’t sign you in. Please check your details and try again.')
      else setError('We couldn’t connect to the server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-page"><a className="brand auth-brand" href="/"><span className="brand-mark">C</span><span>codeyoung</span></a>
    <section className="auth-card" aria-live="polite">
      <div className="auth-mark" aria-hidden="true">✦</div>
      {user ? <div className="auth-success"><span className="auth-success-icon">✓</span><span className="section-eyebrow">SIGNED IN</span><h1>Welcome back, {user.display_name.split(' ')[0]}.</h1><p>You’re signed in as {user.email}.</p>
        {user.is_staff ? <a className="button button-primary auth-submit" href="/debug">Open operations dashboard <span aria-hidden="true">→</span></a> : <a className="button button-primary auth-submit" href="/">Continue to CodeYoung <span aria-hidden="true">→</span></a>}
      </div> : <>
        <span className="section-eyebrow">YOUR CODEYOUNG ACCOUNT</span><h1>Welcome back</h1><p className="auth-subtitle">Sign in to continue.</p>
        <form className="auth-form" onSubmit={submit} noValidate>
          <div className="field-group"><label htmlFor="login-email">Email address</label><input id="login-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" aria-invalid={Boolean(error && (!email.trim() || !validEmail(email.trim())))} /></div>
          <div className="field-group"><label htmlFor="login-password">Password</label><div className="password-input-wrap"><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" aria-invalid={Boolean(error && !password)} /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div></div>
          <div className="auth-options"><label className="remember-option"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> Remember me</label><a href="/forgot-password">Forgot password?</a></div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={loading}>{loading ? <><span className="button-spinner" /> Signing in…</> : <>Sign in <span aria-hidden="true">→</span></>}</button>
        </form>
        <p className="auth-register">New to CodeYoung? <a href="/register">Register for a free demo</a></p>
        <p className="auth-access-note">Account access is managed by the CodeYoung team. Demo-class registration does not require an account.</p>
      </>}
    </section><footer className="auth-footer"><a href="/">← Back to CodeYoung</a><span>Secure account access</span></footer>
  </main>
}
