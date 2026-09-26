/**
 * Curated, maintainable location catalog used by the parent booking form.
 * City records carry canonical IANA zones; offsets are presentation-only.
 */
export const locationCatalog = {
  Asia: {
    India: {
      Karnataka: { Bengaluru: 'Asia/Kolkata', Mangalore: 'Asia/Kolkata', Mysuru: 'Asia/Kolkata' },
      Maharashtra: { Mumbai: 'Asia/Kolkata', Pune: 'Asia/Kolkata' },
      'Tamil Nadu': { Chennai: 'Asia/Kolkata' },
      Delhi: { 'New Delhi': 'Asia/Kolkata' },
      Kerala: { Kochi: 'Asia/Kolkata' },
    },
    Singapore: { Singapore: { Singapore: 'Asia/Singapore' } },
    Japan: { Tokyo: { Tokyo: 'Asia/Tokyo' } },
    'United Arab Emirates': { Dubai: { Dubai: 'Asia/Dubai' } },
    Nepal: { Bagmati: { Kathmandu: 'Asia/Kathmandu' } },
  },
  Europe: {
    'United Kingdom': {
      England: { London: 'Europe/London', Manchester: 'Europe/London' },
      Scotland: { Edinburgh: 'Europe/London' },
      Wales: { Cardiff: 'Europe/London' },
    },
    France: { 'Île-de-France': { Paris: 'Europe/Paris' } },
    Germany: { Berlin: { Berlin: 'Europe/Berlin' } },
  },
  'North America': {
    'United States': {
      'New York': { 'New York City': 'America/New_York', Buffalo: 'America/New_York' },
      Illinois: { Chicago: 'America/Chicago' },
      Colorado: { Denver: 'America/Denver' },
      California: { 'Los Angeles': 'America/Los_Angeles', 'San Francisco': 'America/Los_Angeles' },
      'District of Columbia': { Washington: 'America/New_York' },
    },
    Canada: {
      Ontario: { Toronto: 'America/Toronto', Ottawa: 'America/Toronto' },
      'British Columbia': { Vancouver: 'America/Vancouver' },
      Quebec: { Montreal: 'America/Toronto' },
    },
  },
  Oceania: {
    Australia: {
      'New South Wales': { Sydney: 'Australia/Sydney' },
      Victoria: { Melbourne: 'Australia/Melbourne' },
      Queensland: { Brisbane: 'Australia/Brisbane' },
      'Western Australia': { Perth: 'Australia/Perth' },
    },
    'New Zealand': { Auckland: { Auckland: 'Pacific/Auckland' } },
  },
}

const timezoneAliases = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'US/Eastern': 'America/New_York',
  'US/Central': 'America/Chicago',
  'US/Mountain': 'America/Denver',
  'US/Pacific': 'America/Los_Angeles',
}

export function canonicalTimezone(timezone) {
  return timezoneAliases[timezone] ?? timezone
}

export function timezoneFromLocation({ continent, country, state_region, city }) {
  return locationCatalog[continent]?.[country]?.[state_region]?.[city] ?? ''
}

export function isValidTimezone(timezone) {
  try {
    if (!timezone) return false
    new Intl.DateTimeFormat('en-US', { timeZone: canonicalTimezone(timezone) }).format()
    return true
  } catch {
    return false
  }
}

export function timezoneLabel(timezone, date = new Date()) {
  timezone = canonicalTimezone(timezone)
  if (!isValidTimezone(timezone)) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, timeZoneName: 'long',
  }).formatToParts(date)
  const longName = parts.find((part) => part.type === 'timeZoneName')?.value ?? timezone
  const abbreviation = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, timeZoneName: 'short',
  }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, timeZoneName: 'longOffset',
  }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value?.replace('GMT', 'UTC')
  return [longName, abbreviation, offset].filter(Boolean).join(' · ')
}

// Kept as an import-compatible alias for existing components.
export const timezoneSummary = timezoneLabel


export const UNSPECIFIED_LOCATION = {
  continent: 'Not specified',
  country: 'Not specified',
  state_region: 'Not specified',
  city: 'Not specified',
}

const friendlyNames = {
  'Asia/Kolkata': 'India Standard Time',
  'Asia/Singapore': 'Singapore Time',
  'Asia/Tokyo': 'Japan Standard Time',
  'Europe/London': 'United Kingdom Time',
  'Europe/Paris': 'Central European Time',
  'Europe/Berlin': 'Central European Time',
  'America/New_York': 'Eastern Time',
  'America/Chicago': 'Central Time',
  'America/Denver': 'Mountain Time',
  'America/Los_Angeles': 'Pacific Time',
  'Australia/Sydney': 'Australian Eastern Time',
  'Australia/Melbourne': 'Australian Eastern Time',
}

export function friendlyTimezoneName(timezone) {
  timezone = canonicalTimezone(timezone)
  if (!isValidTimezone(timezone)) return ''
  return friendlyNames[timezone] ?? new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'long',
  }).formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value ?? timezone
}

export function detectBrowserTimezone(intlApi = globalThis.Intl) {
  try {
    const timezone = intlApi.DateTimeFormat().resolvedOptions().timeZone
    const canonical = canonicalTimezone(timezone)
    return isValidTimezone(canonical) ? canonical : ''
  } catch {
    return ''
  }
}

export function availableIanaTimezones(intlApi = globalThis.Intl) {
  const zones = new Set()
  try {
    if (typeof intlApi.supportedValuesOf === 'function') {
      for (const zone of intlApi.supportedValuesOf('timeZone')) zones.add(canonicalTimezone(zone))
    }
  } catch {
    // Older browsers use the curated fallback list below.
  }
  for (const places of Object.values(locationCatalog)) {
    for (const regions of Object.values(places)) {
      for (const cities of Object.values(regions)) {
        for (const zone of Object.values(cities)) zones.add(canonicalTimezone(zone))
      }
    }
  }
  for (const zone of Object.keys(friendlyNames)) zones.add(zone)
  return [...zones].filter((zone) => isValidTimezone(zone) && !zone.startsWith('Etc/')).sort((a, b) => a.localeCompare(b))
}

export function selectAutomaticTimezone(timezone) {
  const canonical = canonicalTimezone(timezone)
  if (!isValidTimezone(canonical)) return null
  return { ...UNSPECIFIED_LOCATION, timezone: canonical }
}

export function selectManualTimezone(timezone) {
  const canonical = canonicalTimezone(timezone)
  if (!isValidTimezone(canonical)) return null
  return { ...UNSPECIFIED_LOCATION, timezone: canonical }
}


export function clearTimezoneSelection(values) {
  return { ...values, continent: '', country: '', state_region: '', city: '', timezone: '' }
}
