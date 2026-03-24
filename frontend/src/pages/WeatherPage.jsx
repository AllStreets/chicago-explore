import { useEffect, useState } from 'react'
import { RiTempHotLine, RiWindyLine, RiWaterFlashLine, RiEyeLine, RiSunLine, RiMoonLine } from 'react-icons/ri'
import './WeatherPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function useWeatherDetail() {
  const [weather, setWeather] = useState(null)
  const [lake, setLake]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [wRes, lRes] = await Promise.all([
          fetch(`${API}/api/weather`),
          fetch(`${API}/api/lake`)
        ])
        const w = await wRes.json()
        const l = await lRes.json()
        if (!cancelled) { setWeather(w); setLake(l) }
      } catch { /* graceful */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { weather, lake, loading }
}

const SEASONS = [
  { name: 'Spring', months: 'Mar–May', desc: 'Variable. Warm days, cold snaps. Lake effect keeps temps low. Layer up.' },
  { name: 'Summer', months: 'Jun–Aug', desc: 'Hot and humid. Beach season. Navy Pier fireworks. Air quality warnings possible.' },
  { name: 'Fall',   months: 'Sep–Nov', desc: 'Best season. Crisp air, foliage, outdoor dining. Lake stays swimmable into Sept.' },
  { name: 'Winter', months: 'Dec–Feb', desc: 'Brutal wind chill off the lake. Polar vortex possible. Bundle up — locals do.' },
]

const SURVIVAL_TIPS = [
  'The wind chill on the Mag Mile is real — always check "feels like" not just temp',
  'Lake Michigan water is cold even in summer (60s°F) — serious swimmers only',
  'Winters routinely hit -20°F wind chill. Get a real winter coat before November.',
  '"Second Winter" hits in April. Don\'t put away your coat.',
  'Summer thunderstorms roll in fast from the west — check radar, not just hourly',
]

export default function WeatherPage() {
  const { weather, lake, loading } = useWeatherDetail()

  return (
    <div className="weather-page">
      <div className="weather-header">
        <span className="weather-title">Weather & Lake</span>
        <span className="weather-sub">Chicago-specific intelligence</span>
      </div>

      <div className="weather-grid">

        {/* Current conditions */}
        <div className="weather-card weather-card--main">
          <div className="weather-card-label">CURRENT CONDITIONS</div>
          {loading && <div className="weather-loading">Loading...</div>}
          {!loading && !weather && (
            <div className="weather-no-key">Add OPENWEATHER_KEY to see live data</div>
          )}
          {weather && (
            <>
              <div className="weather-temp">{weather.temp}°C</div>
              <div className="weather-feels">Feels like {weather.feelsLike ?? weather.temp}°C</div>
              <div className="weather-desc">{weather.description}</div>
              <div className="weather-stats">
                <div className="weather-stat">
                  <RiWindyLine />
                  <span>{weather.wind?.speed ?? weather.wind ?? 0} m/s</span>
                </div>
                <div className="weather-stat">
                  <RiWaterFlashLine />
                  <span>{weather.humidity ?? '--'}%</span>
                </div>
                <div className="weather-stat">
                  <RiEyeLine />
                  <span>{weather.visibility ? `${(weather.visibility / 1000).toFixed(1)} km` : '--'}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Lake conditions */}
        <div className="weather-card weather-card--lake">
          <div className="weather-card-label">LAKE MICHIGAN</div>
          {loading && <div className="weather-loading">Loading...</div>}
          {!loading && !lake && (
            <div className="weather-no-key">Add OPENWEATHER_KEY to see lake data</div>
          )}
          {lake && (
            <>
              <div className="weather-lake-temp">{lake.tempC ?? '--'}°C</div>
              <div className="weather-lake-label">{lake.niceLabel}</div>
              <div className="weather-lake-meta">
                <span>{lake.windMps != null ? `Wind ${lake.windMps} m/s` : 'Calm'}</span>
                <span>{lake.description || ''}</span>
              </div>
              <div className={`weather-lake-badge weather-lake-badge--${(lake.niceScore ?? 0) >= 60 ? 'safe' : 'caution'}`}>
                {(lake.niceScore ?? 0) >= 60 ? 'Good for outdoor activity' : 'Use caution outdoors'}
              </div>
            </>
          )}
        </div>

        {/* Seasonal guide */}
        <div className="weather-card weather-card--seasons">
          <div className="weather-card-label">SEASONAL GUIDE</div>
          <div className="weather-seasons">
            {SEASONS.map(s => (
              <div key={s.name} className="weather-season">
                <div className="weather-season-name">{s.name} <span className="weather-season-months">{s.months}</span></div>
                <div className="weather-season-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Survival tips */}
        <div className="weather-card weather-card--tips">
          <div className="weather-card-label">SURVIVAL TIPS FOR NEW RESIDENTS</div>
          <ul className="weather-tips">
            {SURVIVAL_TIPS.map((tip, i) => (
              <li key={i} className="weather-tip">
                <RiTempHotLine className="weather-tip-icon" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  )
}
