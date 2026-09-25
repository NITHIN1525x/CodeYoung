export const locationCatalog = {
  India: {
    continent: 'Asia',
    regions: {
      Karnataka: { Bengaluru: 'Asia/Kolkata', Mangalore: 'Asia/Kolkata', Mysuru: 'Asia/Kolkata' },
      Maharashtra: { Mumbai: 'Asia/Kolkata', Pune: 'Asia/Kolkata' },
      'Tamil Nadu': { Chennai: 'Asia/Kolkata' },
      'Delhi': { 'New Delhi': 'Asia/Kolkata' },
    },
  },
  'United States': {
    continent: 'North America',
    regions: {
      'New York': { 'New York City': 'America/New_York', Buffalo: 'America/New_York' },
      California: { 'Los Angeles': 'America/Los_Angeles', 'San Francisco': 'America/Los_Angeles' },
      Illinois: { Chicago: 'America/Chicago' },
      'District of Columbia': { Washington: 'America/New_York' },
    },
  },
  Canada: {
    continent: 'North America',
    regions: {
      Ontario: { Toronto: 'America/Toronto', Ottawa: 'America/Toronto' },
      'British Columbia': { Vancouver: 'America/Vancouver' },
      Quebec: { Montreal: 'America/Toronto' },
    },
  },
  'United Kingdom': {
    continent: 'Europe',
    regions: {
      England: { London: 'Europe/London', Manchester: 'Europe/London' },
      Scotland: { Edinburgh: 'Europe/London' },
      Wales: { Cardiff: 'Europe/London' },
    },
  },
  Australia: {
    continent: 'Oceania',
    regions: {
      'New South Wales': { Sydney: 'Australia/Sydney' },
      Victoria: { Melbourne: 'Australia/Melbourne' },
      Queensland: { Brisbane: 'Australia/Brisbane' },
      'Western Australia': { Perth: 'Australia/Perth' },
    },
  },
  Singapore: { continent: 'Asia', regions: { Singapore: { Singapore: 'Asia/Singapore' } } },
  'United Arab Emirates': { continent: 'Asia', regions: { Dubai: { Dubai: 'Asia/Dubai' } } },
  Nepal: { continent: 'Asia', regions: { Bagmati: { Kathmandu: 'Asia/Kathmandu' } } },
  'New Zealand': { continent: 'Oceania', regions: { Auckland: { Auckland: 'Pacific/Auckland' } } },
  France: { continent: 'Europe', regions: { 'Île-de-France': { Paris: 'Europe/Paris' } } },
  Germany: { continent: 'Europe', regions: { Berlin: { Berlin: 'Europe/Berlin' } } },
}

const inferredLocations = {
  'Asia/Kolkata': ['India', 'Karnataka', 'Mangalore'],
  'America/New_York': ['United States', 'New York', 'New York City'],
  'America/Los_Angeles': ['United States', 'California', 'Los Angeles'],
  'America/Chicago': ['United States', 'Illinois', 'Chicago'],
  'America/Toronto': ['Canada', 'Ontario', 'Toronto'],
  'America/Vancouver': ['Canada', 'British Columbia', 'Vancouver'],
  'Europe/London': ['United Kingdom', 'England', 'London'],
  'Europe/Paris': ['France', 'Île-de-France', 'Paris'],
  'Europe/Berlin': ['Germany', 'Berlin', 'Berlin'],
  'Asia/Singapore': ['Singapore', 'Singapore', 'Singapore'],
  'Asia/Dubai': ['United Arab Emirates', 'Dubai', 'Dubai'],
  'Asia/Kathmandu': ['Nepal', 'Bagmati', 'Kathmandu'],
  'Australia/Sydney': ['Australia', 'New South Wales', 'Sydney'],
  'Australia/Melbourne': ['Australia', 'Victoria', 'Melbourne'],
  'Pacific/Auckland': ['New Zealand', 'Auckland', 'Auckland'],
}

const timezoneAliases = { 'Asia/Calcutta': 'Asia/Kolkata', 'US/Eastern': 'America/New_York', 'US/Central': 'America/Chicago', 'US/Pacific': 'America/Los_Angeles' }

export function canonicalTimezone(timezone) {
  return timezoneAliases[timezone] ?? timezone
}

export function locationFromTimezone(timezone) {
  const match = inferredLocations[canonicalTimezone(timezone)]
  if (!match) return { continent: '', country: '', state_region: '', city: '' }
  const [country, state_region, city] = match
  return { continent: locationCatalog[country].continent, country, state_region, city }
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

export function timezoneSummary(timezone) {
  timezone = canonicalTimezone(timezone)
  if (!isValidTimezone(timezone)) return ''
  const abbreviation = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'short' })
    .formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  }).formatToParts(new Date()).find((part) => part.type === 'timeZoneName')?.value?.replace('GMT', 'UTC')
  return [abbreviation, offset].filter(Boolean).join(', ')
}
