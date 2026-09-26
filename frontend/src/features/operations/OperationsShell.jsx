export default function OperationsShell({ title, eyebrow, children }) {
  return <main className="operations-page">
    <nav className="topbar operations-topbar" aria-label="Main navigation"><a className="brand" href="/"><span className="brand-mark">C</span><span>codeyoung</span></a>
      <div className="operations-nav"><a href="/">Home</a><a href="/register">Book a demo</a><a href="/mentor">Mentor schedule</a><a href="/debug">Operations</a><a href="/outbox">Email outbox</a><a href="/login">Log in</a></div>
    </nav>
    <header className="operations-heading"><span className="step-kicker">{eyebrow}</span><h1>{title}</h1><p>CodeYoung trial-class operations at a glance.</p></header>
    {children}<footer className="operations-footer">CodeYoung · Trial class operations</footer>
  </main>
}
