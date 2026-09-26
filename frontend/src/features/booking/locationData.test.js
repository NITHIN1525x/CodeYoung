import assert from 'node:assert/strict'
import test from 'node:test'

import {
  availableIanaTimezones,
  canonicalTimezone,
  clearTimezoneSelection,
  detectBrowserTimezone,
  isValidTimezone,
  locationCatalog,
  selectAutomaticTimezone,
  selectManualTimezone,
  timezoneFromLocation,
} from './locationData.js'

test('location hierarchy derives the correct canonical IANA timezone', () => {
  const places = [
    { continent: 'Asia', country: 'India', state_region: 'Karnataka', city: 'Mangalore', timezone: 'Asia/Kolkata' },
    { continent: 'Europe', country: 'United Kingdom', state_region: 'England', city: 'London', timezone: 'Europe/London' },
    { continent: 'North America', country: 'United States', state_region: 'New York', city: 'New York City', timezone: 'America/New_York' },
    { continent: 'North America', country: 'United States', state_region: 'California', city: 'Los Angeles', timezone: 'America/Los_Angeles' },
    { continent: 'Oceania', country: 'Australia', state_region: 'New South Wales', city: 'Sydney', timezone: 'Australia/Sydney' },
    { continent: 'Asia', country: 'Japan', state_region: 'Tokyo', city: 'Tokyo', timezone: 'Asia/Tokyo' },
  ]
  for (const place of places) assert.equal(timezoneFromLocation(place), place.timezone)
})

test('location data is nested by continent and invalid combinations do not resolve', () => {
  assert.ok(locationCatalog.Asia.India.Karnataka.Mangalore)
  assert.equal(timezoneFromLocation({
    continent: 'Asia', country: 'India', state_region: 'California', city: 'London',
  }), '')
})

test('timezone detection does not infer an exact city', () => {
  const selection = selectAutomaticTimezone('America/New_York')
  assert.equal(selection.timezone, 'America/New_York')
  assert.equal(selection.city, 'Not specified')
  assert.equal(isValidTimezone(selection.timezone), true)
  assert.equal(canonicalTimezone('US/Eastern'), 'America/New_York')
})


test('browser timezone detection accepts valid IANA values and handles failure', () => {
  const browserIntl = {
    DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'America/New_York' }) }),
  }
  const unavailableIntl = {
    DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'Mars/Olympus' }) }),
  }
  assert.equal(detectBrowserTimezone(browserIntl), 'America/New_York')
  assert.equal(detectBrowserTimezone(unavailableIntl), '')
  assert.equal(detectBrowserTimezone({ DateTimeFormat: () => { throw new Error('unavailable') } }), '')
})

test('automatic and manual timezone choices accept only valid IANA identifiers', () => {
  const automatic = selectAutomaticTimezone('Europe/London')
  const manual = selectManualTimezone('America/New_York')
  assert.equal(automatic.timezone, 'Europe/London')
  assert.equal(automatic.city, 'Not specified')
  assert.equal(manual.timezone, 'America/New_York')
  assert.equal(selectManualTimezone('UTC-5'), null)
  assert.equal(selectAutomaticTimezone('not/a-timezone'), null)
  const options = availableIanaTimezones()
  assert.ok(options.includes('America/New_York'))
  assert.ok(options.every((zone) => !zone.startsWith('Etc/')))
})


test('switching between automatic and manual clears stale timezone/location state', () => {
  const selectedCity = {
    name: 'Parent',
    continent: 'Europe',
    country: 'United Kingdom',
    state_region: 'England',
    city: 'London',
    timezone: 'Europe/London',
  }
  const switchedToAutomatic = clearTimezoneSelection(selectedCity)
  assert.equal(switchedToAutomatic.name, 'Parent')
  assert.equal(switchedToAutomatic.city, '')
  assert.equal(switchedToAutomatic.timezone, '')

  const automaticSelection = selectAutomaticTimezone('America/New_York')
  const switchedToManual = clearTimezoneSelection({ ...selectedCity, ...automaticSelection })
  assert.equal(switchedToManual.timezone, '')
  assert.equal(switchedToManual.continent, '')
})
