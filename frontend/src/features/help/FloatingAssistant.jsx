import { useEffect, useRef, useState } from 'react'
import { getHealth } from '../../shared/api/client.js'
import SupportCallForm from './SupportCallForm.jsx'
import { answerQuestion, quickActions, quickQuestions } from './faqKnowledge.js'

function currentTime() {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date())
}

export default function FloatingAssistant() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('landing')
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([])
  const [configuration, setConfiguration] = useState(null)
  const inputRef = useRef(null)
  const launcherRef = useRef(null)
  const messagesRef = useRef(null)
  const messageCounter = useRef(0)
  const timers = useRef(new Set())

  const close = () => {
    setOpen(false)
    requestAnimationFrame(() => launcherRef.current?.focus())
  }

  useEffect(() => {
    let alive = true
    getHealth()
      .then((data) => { if (alive) setConfiguration(data) })
      .catch(() => { if (alive) setConfiguration({}) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (open && mode === 'chat') inputRef.current?.focus()
  }, [open, mode])

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!open) return undefined
    const handleKey = (event) => { if (event.key === 'Escape') close() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), [])

  const startChat = () => {
    setMode('chat')
    if (!messages.length) {
      setMessages([{ id: 'welcome', from: 'assistant', text: 'Hi! I’m here to help with your CodeYoung trial class. What would you like to know?', time: currentTime() }])
    }
  }

  const send = (question = draft) => {
    const text = question.trim()
    if (!text) return
    const id = `answer-${++messageCounter.current}`
    const result = answerQuestion(text, configuration ?? {})
    setMessages((current) => [
      ...current,
      { id: `question-${messageCounter.current}`, from: 'parent', text, time: currentTime() },
      { id, from: 'assistant', typing: true, time: currentTime() },
    ])
    setDraft('')
    const timer = window.setTimeout(() => {
      timers.current.delete(timer)
      setMessages((current) => current.map((message) => message.id === id
        ? { ...message, typing: false, text: result.answer, offerCall: result.offerCall, category: result.category, time: currentTime() }
        : message))
    }, 420)
    timers.current.add(timer)
  }

  const runAction = (action, question) => {
    if (action === 'call') setMode('call')
    else if (action === 'book') window.location.assign('/register')
    else if (action === 'question') send(question)
  }

  const chooseQuickQuestion = (question) => {
    setMode('chat')
    if (!messages.length) {
      setMessages([{ id: 'welcome', from: 'assistant', text: 'Hi! I’m here to help with your CodeYoung trial class. What would you like to know?', time: currentTime() }])
      window.setTimeout(() => send(question), 0)
    } else {
      send(question)
    }
  }

  return (
    <div className="help-assistant">
      {open && (
        <section className="help-panel" id="codeyoung-help-panel" role="dialog" aria-label="CodeYoung parent support" aria-modal="false">
          <header className="help-header">
            <span className="help-avatar" aria-hidden="true">C</span>
            <div className="help-brand-copy"><strong>CodeYoung Support</strong><small><span className="help-online-dot" /> Here to help with your trial class</small></div>
            {mode !== 'landing' && <button className="help-header-back" type="button" onClick={() => setMode('landing')} aria-label="Back to support home">Back</button>}
            <button className="help-close" type="button" onClick={close} aria-label="Close support">×</button>
          </header>

          {mode === 'landing' && (
            <div className="help-landing">
              <div className="help-welcome"><span className="support-eyebrow">PARENT SUPPORT</span><h2>How can we help you?</h2><p>Get a quick answer or tell us when you’d like a callback.</p></div>
              <div className="help-support-options">
                <button type="button" className="help-option-card chat-option" onClick={() => startChat()}>
                  <span className="help-option-icon" aria-hidden="true">💬</span>
                  <span className="help-option-content"><strong>Chat with us</strong><small>Ask about trial classes, scheduling, mentors, availability, or timings.</small></span>
                  <span className="help-option-arrow" aria-hidden="true">→</span>
                </button>
                <button type="button" className="help-option-card call-option" onClick={() => setMode('call')}>
                  <span className="help-option-icon" aria-hidden="true">📞</span>
                  <span className="help-option-content"><strong>Schedule a call</strong><small>Choose a convenient time for a demo callback request.</small></span>
                  <span className="help-option-arrow" aria-hidden="true">→</span>
                </button>
              </div>
              <div className="help-quick-section">
                <div className="help-quick-heading"><strong>Popular questions</strong><span>Tap to ask</span></div>
                <div className="help-quick-list">
                  {quickQuestions.map((question) => <button type="button" key={question} onClick={() => chooseQuickQuestion(question)}>{question}<span aria-hidden="true">›</span></button>)}
                </div>
              </div>
            </div>
          )}

          {mode === 'chat' && (
            <div className="help-chat-view">
              <div className="help-chat-context"><span aria-hidden="true">✦</span><p>Ask us anything about your trial class. I’ll point you to a person if I’m not sure.</p></div>
              <div className="help-messages" ref={messagesRef} aria-live="polite" aria-relevant="additions text">
                {messages.map((message) => (
                  <div key={message.id} className={`help-message-wrap ${message.from}`}>
                    <p className={`help-message ${message.from}`}>
                      <span className="visually-hidden">{message.from === 'parent' ? 'You asked: ' : 'CodeYoung support: '}</span>
                      {message.typing ? <span className="help-typing" aria-label="Support is typing"><i /><i /><i /></span> : message.text}
                    </p>
                    {!message.typing && <time className="help-message-time">{message.time}</time>}
                    {message.offerCall && <button className="help-inline-call" type="button" onClick={() => setMode('call')}>📞 Schedule a call request</button>}
                  </div>
                ))}
              </div>
              {messages.length <= 1 && <div className="help-chat-suggestions" aria-label="Quick questions">
                {quickQuestions.slice(0, 4).map((question) => <button key={question} type="button" onClick={() => chooseQuickQuestion(question)}>{question}</button>)}
              </div>}
              <div className="help-chat-actions" aria-label="Helpful actions">
                {quickActions.map((action) => <button key={action.label} type="button" onClick={() => runAction(action.action, action.question)}>{action.label}</button>)}
              </div>
              <form className="help-compose" onSubmit={(event) => { event.preventDefault(); send() }}>
                <label className="visually-hidden" htmlFor="help-question">Ask CodeYoung support</label>
                <input id="help-question" ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type your question…" maxLength={240} />
                <button type="submit" disabled={!draft.trim()} aria-label="Send question">Send</button>
              </form>
              <p className="help-chat-disclaimer">I can answer common questions; I can’t view your booking or live availability.</p>
            </div>
          )}

          {mode === 'call' && <div className="help-call-view"><SupportCallForm onBack={() => setMode('landing')} /></div>}
        </section>
      )}
      <button className="help-launcher" ref={launcherRef} type="button" aria-expanded={open} aria-controls={open ? 'codeyoung-help-panel' : undefined}
        onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">{open ? '×' : '✦'}</span><span>{open ? 'Close support' : 'Need help?'}</span>
      </button>
    </div>
  )
}
