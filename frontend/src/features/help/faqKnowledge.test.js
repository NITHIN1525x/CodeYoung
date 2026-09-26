import assert from 'node:assert/strict'
import test from 'node:test'

import { answerQuestion, quickQuestions, supportInfoFaqCount } from './faqKnowledge.js'

test('the FAQ knowledge base includes the required parent question chips', () => {
  assert.equal(quickQuestions.length, 12)
  assert.ok(supportInfoFaqCount() >= 20)
  for (const question of quickQuestions) assert.ok(!['irrelevant', 'unknown'].includes(answerQuestion(question).category), question)
})

test('booking and mentor questions return focused answers', () => {
  assert.equal(answerQuestion('How do I book a trial class?').category, 'booking')
  assert.match(answerQuestion('Can I choose my mentor?').answer, /automatically/i)
  assert.match(answerQuestion('How are mentors assigned?').answer, /availability/i)
  assert.match(answerQuestion('How many classes can a mentor take per day?').answer, /two demo classes/i)
})

test('timezone, join-time, email, and configured-duration questions are answered', () => {
  assert.equal(answerQuestion('How are timezones handled?').category, 'timezone')
  assert.equal(answerQuestion('Can I schedule a support call?').category, 'support_call')
  assert.match(answerQuestion('Which time should I join?').answer, /Your time/)
  assert.equal(answerQuestion('Will the mentor receive an email?').category, 'email')
  assert.match(answerQuestion('How long is the trial class?', { trial_class_duration_minutes: 45 }).answer, /45 minutes/)
  assert.match(answerQuestion('How long is the trial class?').answer, /configured trial-class duration/)
})


test('trial, online, link, cancellation, and privacy questions use their own intents', () => {
  assert.equal(answerQuestion('What is a trial class?').category, 'trial_class')
  assert.equal(answerQuestion('Is the trial class online?').category, 'trial_class')
  assert.equal(answerQuestion('Is the class link real?').category, 'meeting_link')
  assert.equal(answerQuestion('Can I cancel my class?').category, 'cancellation')
  assert.equal(answerQuestion('What information do you collect?').category, 'privacy')
  assert.equal(answerQuestion('Do you guarantee learning results?').category, 'unknown')
})

test('unsupported and irrelevant questions politely offer callback support', () => {
  for (const question of ['Who is the president?', 'Tell me a joke', 'What is the weather?', 'asdfghjk']) {
    const response = answerQuestion(question)
    assert.equal(response.category, 'irrelevant')
    assert.equal(response.offerCall, true)
    assert.doesNotMatch(response.answer, /irrelevant|invalid question/i)
  }
  assert.equal(answerQuestion('Can I get a refund?').category, 'unknown')
  assert.equal(answerQuestion('Can I get a refund?').offerCall, true)
})

test('rescheduling and missed-class answers are transparent about demo limits', () => {
  assert.match(answerQuestion('Can I reschedule my class?').answer, /does not provide self-service/i)
  assert.match(answerQuestion('What if I miss my class?').answer, /demo callback request/i)
})
