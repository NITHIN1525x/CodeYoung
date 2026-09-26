const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload?.detail
      ?? Object.values(payload ?? {}).flatMap((value) => Array.isArray(value) ? value : [value]).join(' ')
      ?? `Request failed (${response.status})`
    throw new Error(typeof detail === 'string' ? detail : `Request failed (${response.status})`)
  }
  return payload
}

export const getHealth = () => request('/api/health/')
export function getAvailability({ date, timezone }, { signal } = {}) {
  return request(`/api/availability/?${new URLSearchParams({ date, timezone })}`, { signal })
}
export function createBooking(booking, idempotencyKey) {
  return request('/api/bookings/', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(booking),
  })
}
export function getBooking(id, email, { signal } = {}) {
  return request(`/api/bookings/${encodeURIComponent(id)}/?${new URLSearchParams({ email })}`, { signal })
}
export function getDemoClass(meetingId, { signal } = {}) {
  return request(`/api/demo-classes/${encodeURIComponent(meetingId)}/`, { signal })
}

export function getMentors({ signal } = {}) {
  return request('/api/mentors/', { signal })
}
export function getMentorBookings(mentorId, { signal } = {}) {
  return request(`/api/mentors/${encodeURIComponent(mentorId)}/bookings/`, { signal })
}
export function getAdminBookings({ signal } = {}) {
  return request('/api/admin/bookings/', { signal })
}
export function getAdminMentorCapacity({ signal } = {}) {
  return request('/api/admin/mentor-capacity/', { signal })
}
export function getEmailOutbox({ signal } = {}) {
  return request('/api/admin/email-outbox/', { signal })
}
export const createSupportCallback = (requestData) => request('/api/support/callbacks/', {
  method: 'POST',
  body: JSON.stringify(requestData),
})
