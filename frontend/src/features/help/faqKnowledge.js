const knowledgeBase = [
  {
    id: 'trial-definition', category: 'trial_class', question: 'What is a trial class?',
    patterns: [/what (?:is|does) (?:a )?trial class/, /trial class work/],
    answer: () => 'A trial class is an introductory session where you can experience the learning environment and understand how classes work before continuing with a program.',
  },
  {
    id: 'trial-duration', category: 'trial_class', question: 'How long is the trial class?',
    patterns: [/how long.*trial|trial.*(?:long|duration)|class duration|duration.*class/i],
    answer: (config) => config?.trial_class_duration_minutes
      ? `The configured trial-class duration is ${config.trial_class_duration_minutes} minutes.`
      : 'The trial class duration is based on the configured trial-class duration for the system.',
  },
  {
    id: 'trial-free', category: 'trial_class', question: 'Is the trial class free?',
    patterns: [/\bfree\b|\bcomplimentary\b|\bcost\b|\bprice\b|\bpricing\b/i],
    answer: () => 'The booking page describes the first class as complimentary. The demo does not provide additional pricing information.',
  },
  {
    id: 'trial-online', category: 'trial_class', question: 'Is the trial class online?',
    patterns: [/online|virtual|remote/],
    answer: () => 'Yes. The demo system provides an online class link for the trial session.',
  },
  {
    id: 'dummy-link', category: 'meeting_link', question: 'Is the class link real?',
    patterns: [/is (?:the )?(?:class|meeting) link real|real link|video provider|dummy link/],
    answer: () => 'For this demo system, the class link opens a demo meeting page. It is not connected to a real video provider.',
  },
  {
    id: 'book-how', category: 'booking', question: 'How do I book a trial class?',
    patterns: [/how (?:do|can) i book|book a trial|booking process/],
    answer: () => 'Enter your details, select your location and timezone, choose a convenient date and available time, then confirm. The system automatically assigns an available mentor.',
  },
  {
    id: 'book-time', category: 'booking', question: 'Can I choose a time?',
    patterns: [/choose (?:a )?(?:date|time)|pick (?:a )?(?:date|time)|any time|available time/],
    answer: () => 'Yes. Choose a suitable available date and time from the options shown. Availability depends on mentor schedules and existing bookings.',
  },
  {
    id: 'book-after', category: 'booking', question: 'What happens after I book?',
    patterns: [/after (?:i )?book|what happens after|booking confirmation|once i book/],
    answer: () => 'The appointment is created, an available mentor is assigned automatically, and the confirmation page shows your appointment details and class link. The system attempts to send a confirmation email to the address you entered; delivery status is shown on the confirmation page.',
  },
  {
    id: 'mentor-auto', category: 'mentor', question: 'How are mentors assigned?',
    patterns: [/how.*mentor.*(?:assign|select)|mentor selected|assigned mentor|different mentor|who.*mentor/i],
    answer: () => 'The system automatically selects an eligible mentor based on the requested time, mentor availability, working hours, existing bookings, and daily capacity.',
  },
  {
    id: 'mentor-location', category: 'mentor', question: 'Where is my mentor?',
    patterns: [/where (?:is|will).*mentor|mentor location|what country.*mentor/],
    answer: () => 'Mentors may be based in different countries. Your assigned mentor’s location and local timezone appear on your booking confirmation and class details.',
  },
  {
    id: 'mentor-choice', category: 'mentor', question: 'Can I choose my mentor?',
    patterns: [/choose.*mentor|select.*mentor|pick.*mentor|can i have.*mentor/],
    answer: () => 'Mentors are assigned automatically based on availability, so you do not need to choose one.',
  },
  {
    id: 'mentor-capacity', category: 'mentor', question: 'How many classes can a mentor take per day?',
    patterns: [/how many.*classes|classes.*per day|daily.*limit|two.*classes|mentor.*capacity/],
    answer: () => 'Each mentor can conduct at most two demo classes per mentor-local calendar day. The limit resets at midnight in that mentor’s timezone.',
  },
  {
    id: 'availability-slot', category: 'availability', question: 'Why can’t I see a time?',
    patterns: [/why.*(?:see|choose|book).*(?:time|slot)|particular time|slot.*unavailable|fully booked/],
    answer: () => 'That time may be unavailable because of existing bookings or mentor capacity. Please try another available slot.',
  },
  {
    id: 'availability-none', category: 'availability', question: 'What if no mentor is available?',
    patterns: [/no mentor|no available|no availability|no slots|all mentors|all.*booked/],
    answer: () => 'If no mentor is available, the booking system will prevent the booking and ask you to choose another available time. Try another date or slot.',
  },
  {
    id: 'availability-race', category: 'availability', question: 'What if the slot becomes unavailable?',
    patterns: [/slot.*(?:changed|taken|unavailable)|someone else|few minutes ago|during booking/],
    answer: () => 'Availability is checked again when you confirm. If another parent has taken that slot, the system will ask you to choose a different available time.',
  },
  {
    id: 'timezone-join', category: 'timezone', question: 'Which time should I join?',
    patterns: [/which time.*join|what time.*join|join.*time/i],
    answer: () => 'Join at the appointment time labeled “Your time”. Your mentor sees that same appointment at the time labeled “Mentor’s local time”.',
  },
  {
    id: 'timezone-how', category: 'timezone', question: 'How are timezones handled?',
    patterns: [/timezone|time zone|daylight|daylight saving|dst/],
    answer: () => 'Available times are shown in your local timezone. The appointment is stored in UTC internally and converted to the relevant IANA timezone for you and your mentor. Daylight-saving rules are handled automatically.',
  },
  {
    id: 'timezone-two', category: 'timezone', question: 'Why do I see two different times?',
    patterns: [/two different times|two times|times.*different|mentor.*time.*different/],
    answer: () => 'Your mentor may be located in a different timezone. We store one appointment time and automatically convert it into your local time and your mentor’s local time. They are two displays of the same appointment; join at the time labeled “Your time”.',
  },
  {
    id: 'timezone-detected', category: 'timezone', question: 'What timezone should I select?',
    patterns: [/what timezone|which timezone|timezone.*select|time zone.*select|timezone.*wrong|change.*timezone/],
    answer: () => 'The system detects your browser timezone automatically. If it is incorrect, you can correct your country, state or region, and city in the booking form; the timezone is derived from the selected location.',
  },
  {
    id: 'email-confirmation', category: 'email', question: 'Will I receive a confirmation email?',
    patterns: [/confirmation email|receive.*email|email.*confirmation/],
    answer: () => 'After a successful booking, the system attempts to send a confirmation to the email address you provided. Delivery status is shown on the confirmation page.',
  },
  {
    id: 'email-contents', category: 'email', question: 'What is included in the email?',
    patterns: [/what.*email|email.*include|email.*contain/],
    answer: () => 'The confirmation email includes your appointment details, your local time, the assigned mentor, the mentor’s local time, and the class link.',
  },
  {
    id: 'mentor-email', category: 'email', question: 'Will the mentor receive an email?',
    patterns: [/mentor.*email|email.*mentor|both emails|same.*link.*email/],
    answer: () => 'Yes. The assigned mentor has a separate notification created with the appointment details and the same class link; its delivery status is tracked separately.',
  },
  {
    id: 'email-missing', category: 'email', question: 'I didn’t receive my email. What should I do?',
    patterns: [/didn.t receive|haven.t received|missing.*email|email.*not arrive|spam|promotions/],
    answer: () => 'Please check your spam or promotions folder first. If you still cannot find it, submit a demo callback request for support to review.',
  },
  {
    id: 'class-link', category: 'meeting_link', question: 'How will I receive the class link?',
    patterns: [/class link|meeting link|join link|where.*link|receive.*link/],
    answer: () => 'Your class link appears on the confirmation page. The system also attempts to include it in a confirmation email sent to the address you entered.',
  },
  {
    id: 'reschedule', category: 'reschedule', question: 'Can I reschedule my class?',
    patterns: [/reschedul|change.*appointment|change.*booking|move.*class/],
    answer: () => 'The current demo does not provide self-service rescheduling. You can schedule a support call request for assistance.',
    offerCall: true,
  },
  {
    id: 'cancel', category: 'cancellation', question: 'Can I cancel my class?',
    patterns: [/cancel|cancellation/],
    answer: () => 'The current demo does not provide a self-service cancellation flow. You can schedule a support call request for assistance.',
    offerCall: true,
  },
  {
    id: 'missed', category: 'missed_class', question: 'What if I miss my class?',
    patterns: [/miss.*class|miss.*session|mentor.*doesn.t join|mentor.*not join/],
    answer: () => 'If you miss the session or your mentor does not join, please contact support. You can submit a demo callback request to record the issue.',
    offerCall: true,
  },
  {
    id: 'support-call', category: 'support_call', question: 'Can I schedule a support call?',
    patterns: [/schedule.*call|callback request|support call/],
    answer: () => 'You can choose a preferred time in the Schedule a Call form. This demo records a callback request only; it does not place a real phone call or send a callback email.',
    offerCall: true,
  },
  {
    id: 'privacy-collect', category: 'privacy', question: 'What information do you collect?',
    patterns: [/what.*information|what.*data|collect.*information|collect.*data|why.*timezone/],
    answer: () => 'The booking flow collects the information needed to arrange a trial class, such as your name, email, location and timezone, and appointment details.',
  },
]

export const quickQuestions = [
  'How does the trial class work?',
  'How do I book a trial class?',
  'How are mentors assigned?',
  'Can I choose my mentor?',
  'What happens after I book?',
  'What if no mentor is available?',
  'How are timezones handled?',
  'Can I reschedule my class?',
  'What happens if I miss my class?',
  'Is the trial class free?',
  'How long is the trial class?',
  'How will I receive the class link?',
]

export const quickActions = [
  { label: '📅 See available times', action: 'book' },
  { label: '🕐 Explain timezones', action: 'question', question: 'Why do I see two different times?' },
  { label: '👨‍🏫 Mentor assignment', action: 'question', question: 'How are mentors assigned?' },
  { label: '📧 Email help', action: 'question', question: 'Will I receive a confirmation email?' },
  { label: '📞 Schedule a call', action: 'call' },
]

const irrelevantPatterns = [
  /\bpresident\b/, /\bweather\b/, /\b(?:tell|make|write).{0,12}\bjoke\b/, /\bcricket\b/, /\bmovie|film\b/,
  /\bsolve\b.{0,20}\bmath|\bmath problem\b/, /\bwrite my assignment\b/, /\bwho will win\b/,
]
const supportContextPattern = /\b(trial|class|booking|book|mentor|availability|slot|timezone|time zone|daylight|email|confirmation|meeting|link|reschedul|cancel|miss|schedule|callback|call|privacy|data|price|pricing|refund|policy|program|curriculum|coding|guarantee|outcome|result|safe|age|level)\b/i
const nonsensePattern = /^[^a-z0-9]*$|^(.)\1{5,}$/i

export function answerQuestion(input, configuration = {}) {
  const text = String(input ?? '').trim()
  const normalized = text.toLocaleLowerCase()
  if (!text) return { category: 'unknown', answer: 'Please type a question about your CodeYoung trial class, booking, mentor, schedule, or class link.', offerCall: false }

  if (irrelevantPatterns.some((pattern) => pattern.test(normalized)) || nonsensePattern.test(text)) {
    return {
      category: 'irrelevant',
      answer: 'I’d be happy to help with your CodeYoung trial class, booking, mentor, schedule, or class-link questions. I’m not able to help with that topic. If you prefer personal assistance, you can schedule a call request.',
      offerCall: true,
    }
  }

  for (const item of knowledgeBase) {
    if (item.patterns.some((pattern) => pattern.test(normalized))) {
      return { category: item.category, answer: item.answer(configuration), offerCall: Boolean(item.offerCall), faqId: item.id }
    }
  }

  if (supportContextPattern.test(text)) {
    return {
      category: 'unknown',
      answer: 'I want to make sure I give you correct information. I don’t have enough information to answer that accurately. Would you like to schedule a call request with the support team?',
      offerCall: true,
    }
  }

  return {
    category: 'irrelevant',
    answer: 'I’d be happy to help with your CodeYoung trial class, booking, mentor, schedule, or class-link questions. I’m not able to help with that topic. If you prefer personal assistance, you can schedule a call request.',
    offerCall: true,
  }
}

export function supportInfoFaqCount() {
  return knowledgeBase.length
}
