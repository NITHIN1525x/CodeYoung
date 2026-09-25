import BookingFlow from '../features/booking/BookingFlow.jsx'
import MentorDashboard from '../features/operations/MentorDashboard.jsx'
import AdminDashboard from '../features/operations/AdminDashboard.jsx'
import EmailOutboxPage from '../features/operations/EmailOutboxPage.jsx'
import FloatingAssistant from '../features/help/FloatingAssistant.jsx'
import DemoClassPage from '../features/booking/DemoClassPage.jsx'

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  let page = <BookingFlow />
  if (path === '/mentor') page = <MentorDashboard />
  if (path === '/debug') page = <AdminDashboard />
  if (path === '/outbox') page = <EmailOutboxPage />
  const classMatch = path.match(/^\/class\/([a-f0-9]{32})$/i)
  if (classMatch) page = <DemoClassPage meetingId={classMatch[1]} />
  return <>{page}<FloatingAssistant /></>
}
