import { locationCatalog } from '../locationData.js'

const countryNames = Object.keys(locationCatalog).sort((a, b) => a.localeCompare(b))

export default function LocationSelector({ values, onChange }) {
  const regions = values.country ? Object.keys(locationCatalog[values.country]?.regions ?? {}) : []
  const cities = values.country && values.state_region
    ? Object.keys(locationCatalog[values.country]?.regions?.[values.state_region] ?? {})
    : []

  const updateCountry = (event) => {
    const country = event.target.value
    const region = Object.keys(locationCatalog[country]?.regions ?? {})[0] ?? ''
    const city = Object.keys(locationCatalog[country]?.regions?.[region] ?? {})[0] ?? ''
    const timezone = locationCatalog[country]?.regions?.[region]?.[city] ?? ''
    onChange({ ...values, continent: locationCatalog[country]?.continent ?? '', country, state_region: region, city, timezone })
  }
  const updateRegion = (event) => {
    const state_region = event.target.value
    const city = Object.keys(locationCatalog[values.country]?.regions?.[state_region] ?? {})[0] ?? ''
    const timezone = locationCatalog[values.country]?.regions?.[state_region]?.[city] ?? values.timezone
    onChange({ ...values, state_region, city, timezone })
  }
  const updateCity = (event) => {
    const city = event.target.value
    const timezone = locationCatalog[values.country]?.regions?.[values.state_region]?.[city] ?? values.timezone
    onChange({ ...values, city, timezone })
  }

  return (
    <section className="location-section" aria-labelledby="location-heading">
      <div className="section-heading">
        <h3 id="location-heading">Where are you joining from?</h3>
        <p>We detected an approximate location from your timezone. You can correct it below.</p>
      </div>
      <div className="field-grid field-grid-two">
        <div className="field-group">
          <label htmlFor="country">Country</label>
          <select id="country" value={values.country} onChange={updateCountry} autoComplete="country-name" required>
            <option value="">Choose a country</option>
            {countryNames.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="region">State or region</label>
          <select id="region" value={values.state_region} onChange={updateRegion} autoComplete="address-level1" required disabled={!values.country}>
            <option value="">Choose a state or region</option>
            {regions.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="city">City</label>
          <select id="city" value={values.city} onChange={updateCity} autoComplete="address-level2" required disabled={!values.state_region}>
            <option value="">Choose a city</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>
      </div>
      <p className="location-hierarchy" aria-live="polite">
        {values.continent || 'Continent'}{values.country && ` → ${values.country}`}{values.state_region && ` → ${values.state_region}`}{values.city && ` → ${values.city}`}
      </p>
    </section>
  )
}
