import { locationCatalog, timezoneFromLocation } from '../locationData.js'

export default function LocationSelector({ values, onChange }) {
  const continents = Object.keys(locationCatalog).sort()
  const countries = Object.keys(locationCatalog[values.continent] ?? {}).sort()
  const regions = Object.keys(locationCatalog[values.continent]?.[values.country] ?? {}).sort()
  const cities = Object.keys(locationCatalog[values.continent]?.[values.country]?.[values.state_region] ?? {}).sort()

  const updateContinent = (event) => {
    const continent = event.target.value
    const next = { ...values, continent, country: '', state_region: '', city: '', timezone: '' }
    onChange(next)
  }
  const updateCountry = (event) => {
    const country = event.target.value
    const next = { ...values, country, state_region: '', city: '', timezone: '' }
    onChange(next)
  }
  const updateRegion = (event) => {
    const state_region = event.target.value
    const next = { ...values, state_region, city: '', timezone: '' }
    onChange(next)
  }
  const updateCity = (event) => {
    const city = event.target.value
    const next = { ...values, city }
    next.timezone = timezoneFromLocation(next)
    onChange(next)
  }

  return (
    <section className="location-section" aria-labelledby="location-heading">
      <div className="section-heading">
        <h3 id="location-heading">Your location</h3>
        <p>Select your city. We’ll set the matching timezone automatically.</p>
      </div>
      <div className="field-grid field-grid-two">
        <div className="field-group">
          <label htmlFor="continent">Continent</label>
          <select id="continent" value={values.continent} onChange={updateContinent} required>
            <option value="">Choose a continent</option>
            {continents.map((continent) => <option key={continent} value={continent}>{continent}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="country">Country</label>
          <select id="country" value={values.country} onChange={updateCountry} required disabled={!values.continent}>
            <option value="">Choose a country</option>
            {countries.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="region">State or region</label>
          <select id="region" value={values.state_region} onChange={updateRegion} required disabled={!values.country}>
            <option value="">Choose a state or region</option>
            {regions.map((region) => <option key={region} value={region}>{region}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor="city">City</label>
          <select id="city" value={values.city} onChange={updateCity} required disabled={!values.state_region}>
            <option value="">Choose a city</option>
            {cities.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>
      </div>
      {values.city && <p className="location-hierarchy" aria-live="polite">
        {values.continent} → {values.country} → {values.state_region} → {values.city}
      </p>}
    </section>
  )
}
