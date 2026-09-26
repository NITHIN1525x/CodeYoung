import assert from 'node:assert/strict'
import test from 'node:test'

import { createBookingPayload } from './bookingPayload.js'

test('booking payload carries the selected IANA timezone and parent-local date/time', () => {
  const payload = createBookingPayload({
    name: 'Parent',
    email: 'parent@example.com',
    timezone: 'America/New_York',
  }, {
    parent_local_time: '2026-04-10T08:00:00-04:00',
    fold: 0,
  })
  assert.equal(payload.timezone, 'America/New_York')
  assert.equal(payload.selected_date, '2026-04-10')
  assert.equal(payload.selected_time, '08:00')
  assert.equal(payload.fold, 0)
})
