export default function OperationsShell({ title, eyebrow, children }) {
  return (
    <main className="operations-page">
      <nav className="topbar operations-topbar" aria-label="Main navigation">
        <a className="brand" href="/"><span className="brand-mark">C</span><span>codeyoung</span></a>
        <div className="operations-nav">
          <a href="/mentor">Mentors</a><a href="/debug">Debug bookings</a><a href="/outbox">Email outbox</a>
        </div>
      </nav>
      <header className="operations-heading"><span className="step-kicker">{eyebrow}</span><h1>{title}</h1></header>
      {children}
      <footer className="operations-footer">CodeYoung · Trial class operations</footer>
    </main>
  )
}
