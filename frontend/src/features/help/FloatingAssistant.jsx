import { useEffect, useRef, useState } from 'react'

const topics = [
  { id: 'book', label: 'How do I book?', match: /book|booking|reserve|schedule|trial class/i,
    answer: 'Enter your name, email, location, and timezone. Then choose a date and an available time. We assign a mentor for you automatically.' },
  { id: 'time', label: 'Why two times?', match: /two times|different times|timezone|time zone|both times|8\s?am|5:30/i,
    answer: 'The first time is your local time. The second is your mentor’s local time. For example, 8:00 AM and 5:30 PM can be the same class, shown in two IANA timezones. Daylight-saving changes are handled automatically. Join at the time shown as “Your time”.' },
  { id: 'join', label: 'Which time should I join?', match: /join|which time|what time/i,
    answer: 'Join at the time labeled “Your time”. Your mentor sees that same class at the time labeled “Mentor’s local time”.' },
  { id: 'after', label: 'What happens after booking?', match: /after booking|after i book|what happens|confirmation/i,
    answer: 'After you confirm, the page shows your assigned mentor, both local times, and the class link. CodeYoung sends a confirmation email to the exact email address you entered, including the class link.' },
  { id: 'link', label: 'Where is my class link?', match: /link|email|receive|sent/i,
    answer: 'Your class link appears on the confirmation page and in the confirmation email sent to the exact email address you entered.' },
  { id: 'change-zone', label: 'Can I change my timezone?', match: /change.*time ?zone|time ?zone.*change|override|wrong time ?zone/i,
    answer: 'Your browser timezone is detected automatically. To correct your location, choose your country, state or region, and city on the first step; the timezone updates from the selected city. If needed, you can also enter an IANA timezone name such as America/New_York.' },
  { id: 'mentor', label: 'Can I choose a mentor?', match: /choose.*mentor|select.*mentor|pick.*mentor|which mentor/i,
    answer: 'Parents choose a date and time, not a mentor. CodeYoung assigns an available mentor automatically.' },
  { id: 'unavailable', label: 'What if no mentor is free?', match: /no mentor|unavailable|fully booked|no availability|no slots|no times/i,
    answer: 'Try another time or date. If no mentors are free for a time, it cannot be booked. Availability is checked again when you confirm.' },
  { id: 'daily-limit', label: 'How many classes per day?', match: /how many|per day|daily|limit|classes.*day/i,
    answer: 'Each mentor can take up to two trial classes per mentor-local calendar day. The limit resets at midnight in that mentor’s timezone.' },
]

function getAnswer(question) {
  const normalized = question.trim()
  if (!normalized) return 'Type a booking question and I’ll help with the CodeYoung trial class flow.'
  const changeTimezone = topics.find((topic) => topic.id === 'change-zone')
  const match = changeTimezone.match.test(normalized)
    ? changeTimezone
    : topics.find((topic) => topic.match.test(normalized))
  return match?.answer ?? 'I can help with booking a trial class, timezones, mentor assignment, availability, and the class link. Try asking one of those.'
}

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([
    { from: 'assistant', text: 'Hi! I can help with booking a CodeYoung trial class. What would you like to know?' },
  ])
  const inputRef = useRef(null)
  const launcherRef = useRef(null)
  const messagesRef = useRef(null)

  const closeAssistant = () => {
    setOpen(false)
    requestAnimationFrame(() => launcherRef.current?.focus())
  }

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeAssistant()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  const send = (question = draft) => {
    const text = question.trim()
    if (!text) return
    setMessages((current) => [...current,
      { from: 'parent', text },
      { from: 'assistant', text: getAnswer(text) },
    ])
    setDraft('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="help-assistant">
      {open && <section className="help-panel" id="codeyoung-help-panel" role="dialog" aria-label="CodeYoung booking help" aria-modal="false">
        <header className="help-header">
          <span className="help-avatar" aria-hidden="true">C</span>
          <div><strong>CodeYoung help</strong><small>Trial class booking assistant</small></div>
          <button className="help-close" type="button" onClick={closeAssistant} aria-label="Close help">×</button>
        </header>
        <div className="help-messages" ref={messagesRef} aria-live="polite" aria-relevant="additions text">
          {messages.map((message, index) => <p key={`${index}-${message.from}`} className={`help-message ${message.from}`}>
            <span className="visually-hidden">{message.from === 'parent' ? 'You asked: ' : 'CodeYoung help: '}</span>{message.text}
          </p>)}
        </div>
        {messages.length === 1 && <div className="help-suggestions" aria-label="Common questions">
          {topics.slice(0, 4).map((topic) => <button type="button" key={topic.id} onClick={() => send(topic.label)}>{topic.label}</button>)}
        </div>}
        <form className="help-compose" onSubmit={(event) => { event.preventDefault(); send() }}>
          <label className="visually-hidden" htmlFor="help-question">Ask a booking question</label>
          <input id="help-question" ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about booking…" maxLength={240} />
          <button type="submit" disabled={!draft.trim()} aria-label="Send question">Send</button>
        </form>
      </section>}
      <button className="help-launcher" ref={launcherRef} type="button" aria-expanded={open} aria-controls={open ? 'codeyoung-help-panel' : undefined}
        onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">{open ? '×' : '?'}</span><span>{open ? 'Close help' : 'Need help?'}</span>
      </button>
    </div>
  )
}
