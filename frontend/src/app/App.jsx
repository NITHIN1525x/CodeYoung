import { useEffect, useState } from 'react'
import BookingFlow from '../features/booking/BookingFlow.jsx'
import DemoClassPage from '../features/booking/DemoClassPage.jsx'
import FloatingAssistant from '../features/help/FloatingAssistant.jsx'
import LandingPage from '../features/home/LandingPage.jsx'
import LoginPage from '../features/auth/LoginPage.jsx'
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage.jsx'
import MentorDashboard from '../features/operations/MentorDashboard.jsx'
import AdminDashboard from '../features/operations/AdminDashboard.jsx'
import EmailOutboxPage from '../features/operations/EmailOutboxPage.jsx'

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname.replace(/\/$/, '') || '/')
  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname.replace(/\/$/, '') || '/')
    window.addEventListener('popstate', updatePath)
    return () => window.removeEventListener('popstate', updatePath)
  }, [])

  let page = <LandingPage />
  if (path === '/register' || path.startsWith('/booking/confirmation/')) page = <BookingFlow />
  if (path === '/login') page = <LoginPage />
  if (path === '/forgot-password') page = <ForgotPasswordPage />
  if (path === '/mentor') page = <MentorDashboard />
  if (path === '/debug') page = <AdminDashboard />
  if (path === '/outbox') page = <EmailOutboxPage />
  const classMatch = path.match(/^\/class\/([a-f0-9]{32})$/i)
  if (classMatch) page = <DemoClassPage meetingId={classMatch[1]} />
  return <>{page}<FloatingAssistant /></>
}
