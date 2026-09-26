const steps = [
  { number: '01', title: 'Choose a time', text: 'Find a class time that fits your family’s schedule.' },
  { number: '02', title: 'Meet your mentor', text: 'We match your child with an available coding mentor.' },
  { number: '03', title: 'Get your class link', text: 'A confirmation with both local times arrives by email.' },
  { number: '04', title: 'Make something', text: 'Join the complimentary demo and start creating.' },
]
const benefits = [
  { icon: '✳', title: 'Personal to your child', text: 'A mentor-led first class shaped around your child’s interests and pace.' },
  { icon: '⌘', title: 'Learn by making', text: 'Turn curiosity into a small, satisfying project from the very first session.' },
  { icon: '◷', title: 'Easy to schedule', text: 'Choose a convenient local time. We coordinate the mentor match for you.' },
]
export default function LandingPage() {
  return (
    <main className="marketing-page">
      <header className="marketing-nav-wrap"><nav className="marketing-nav" aria-label="Main navigation">
        <a className="brand" href="/" aria-label="CodeYoung home"><span className="brand-mark">C</span><span>codeyoung</span></a>
        <div className="marketing-links"><a href="#how-it-works">How it works</a><a href="#for-parents">For parents</a><a href="#for-mentors">For mentors</a></div>
        <div className="marketing-nav-actions"><a className="nav-login" href="/login">Log in</a><a className="button button-primary nav-cta" href="/register">Register for a free demo <span aria-hidden="true">↗</span></a></div>
      </nav></header>
      <section className="hero-section">
        <div className="hero-copy"><span className="hero-kicker"><i /> A first step into a world of possibility</span>
          <h1>Unlock your child’s potential with <em>CodeYoung.</em></h1>
          <p>Personalized, mentor-led coding classes that turn screen time into a chance to imagine, build, and grow.</p>
          <div className="hero-actions"><a className="button button-primary hero-primary" href="/register">Register for a free demo <span aria-hidden="true">→</span></a><a className="hero-secondary" href="#how-it-works"><span className="play-icon" aria-hidden="true">↓</span> Explore how it works</a></div>
          <div className="hero-proof"><div className="avatar-stack" aria-hidden="true"><span>A</span><span>M</span><span>R</span></div><span><strong>A thoughtful first class.</strong><br />A real mentor, matched for you.</span></div>
        </div>
        <div className="hero-art" aria-label="A preview of a creative coding lesson"><div className="art-glow" /><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <article className="code-window"><div className="code-window-bar"><span className="window-dots"><i /><i /><i /></span><span>my-first-project.js</span><span className="window-status">● LIVE CLASS</span></div>
            <div className="code-illustration"><p><span>01</span> <b>const</b> idea = <i>'something amazing'</i></p><p><span>02</span> <b>function</b> <strong>makeItReal</strong>() {'{'}</p><p><span>03</span> &nbsp; <b>create</b>(idea)</p><p><span>04</span> {'}'}</p>
              <div className="project-preview"><span className="preview-sun" /><span className="preview-hill hill-a" /><span className="preview-hill hill-b" /><span className="preview-caption">A world built by you</span></div></div>
            <div className="code-window-footer"><span><i /> Mentor connected</span><span>Creative coding · 30 min</span></div></article>
          <div className="art-note note-top"><span className="note-icon">✦</span><span><strong>Made for curious minds</strong><small>Learning that starts with wonder</small></span></div>
          <div className="art-note note-bottom"><span className="mentor-face">R</span><span><small>YOUR MENTOR</small><strong>Ready when you are</strong></span><span className="note-check">✓</span></div><span className="art-spark spark-a">✳</span><span className="art-spark spark-b">✦</span>
        </div>
      </section>
      <section className="trust-strip" aria-label="CodeYoung benefits"><span>Thoughtful learning</span><i /><span>Expert mentors</span><i /><span>Flexible scheduling</span><i /><span>Live, interactive classes</span></section>
      <section className="section-block how-section" id="how-it-works"><header className="section-intro"><span className="section-eyebrow">SIMPLE FROM THE START</span><h2>A little curiosity can<br /><em>go a long way.</em></h2><p>From choosing a time to meeting a mentor, we’ve made the first step easy for your family.</p></header>
        <div className="steps-grid">{steps.map((step) => <article className="step-card" key={step.number}><span className="step-number">{step.number}</span><span className="step-line" /><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
      </section>
      <section className="section-block value-section" id="for-parents"><div className="value-heading"><span className="section-eyebrow">WHY CODEYOUNG</span><h2>More than a class.<br /><em>A moment of possibility.</em></h2><p>Great learning feels personal. We bring together a caring mentor, a child’s curiosity, and the space to try something new.</p></div>
        <div className="benefit-grid">{benefits.map((benefit) => <article className="benefit-card" key={benefit.title}><span className="benefit-icon" aria-hidden="true">{benefit.icon}</span><h3>{benefit.title}</h3><p>{benefit.text}</p></article>)}</div>
      </section>
      <section className="audience-section" id="for-mentors"><article className="audience-card parent-audience"><span className="audience-icon">⌂</span><div><span className="section-eyebrow">FOR PARENTS</span><h2>A first class that feels easy.</h2><p>Pick a time in your timezone. We find the available mentor, send the details to your inbox, and make sure you know when to join.</p><a href="/register">Book your child’s free demo <span aria-hidden="true">→</span></a></div></article>
        <article className="audience-card mentor-audience"><span className="audience-icon">✦</span><div><span className="section-eyebrow">FOR MENTORS</span><h2>Bring a bright idea to life.</h2><p>See your schedule in your local time, meet curious young learners, and help them discover what they can create.</p><a href="/mentor">Explore the mentor schedule <span aria-hidden="true">→</span></a></div></article></section>
      <section className="final-cta"><span className="section-eyebrow">THE FIRST CLASS IS JUST THE BEGINNING</span><h2>Ready to start your child’s<br />coding journey?</h2><p>Give their curiosity somewhere to go.</p><a className="button button-light" href="/register">Register for a free demo <span aria-hidden="true">→</span></a><span className="cta-decoration" aria-hidden="true">✳</span></section>
      <footer className="marketing-footer"><a className="brand" href="/"><span className="brand-mark">C</span><span>codeyoung</span></a><p>Helping young minds find their next big idea.</p><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="/mentor">For mentors</a><a href="/login">Log in</a><a href="/register">Book a demo</a><a href="/register">Help &amp; booking</a></nav><small>© {new Date().getFullYear()} CodeYoung. All rights reserved.</small></footer>
    </main>
  )
}
