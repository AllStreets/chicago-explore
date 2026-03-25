// FILE: WeatherPage.jsx
import { useEffect, useState } from 'react'
import {
  RiTempHotLine,
  RiWindyLine,
  RiWaterFlashLine,
  RiWifiLine,
  RiDropLine,
} from 'react-icons/ri'
import useMidnightRefresh from '../hooks/useMidnightRefresh'
import './WeatherPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function useBeaches() {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetch(`${API}/api/beach`).then(r => r.json()).then(setData).catch(() => {})
  }, [])
  return data
}

function useWeatherDetail(midnightTick) {
  const [weather, setWeather] = useState(null)
  const [lake, setLake]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
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
  }, [midnightTick])

  return { weather, lake, loading }
}

function windDir(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round((deg ?? 0) / 45) % 8]
}

function getLakeState(lake, description) {
  const desc = (description || '').toLowerCase()
  const tempC = lake?.tempC ?? 10
  const windMps = lake?.windMps ?? 0

  if (tempC <= 1) return 'frozen'
  if (desc.includes('thunder') || windMps > 12) return 'stormy'
  if (desc.includes('snow')) return 'snowy'
  if (desc.includes('rain') || desc.includes('drizzle')) return 'rainy'
  if (windMps > 8) return 'windy'
  if (desc.includes('overcast')) return 'overcast'
  if ((lake?.niceScore ?? 0) >= 75) return 'beautiful'
  return 'decent'
}

function WavesSVG({ state }) {
  const roughStates = ['stormy', 'windy']
  const mediumStates = ['decent', 'overcast', 'rainy']
  const flatStates = ['frozen', 'beautiful']

  let path1, path2
  if (roughStates.includes(state)) {
    path1 = 'M0,30 Q40,5 80,22 Q120,42 160,15 Q200,0 240,25 Q280,45 320,18 Q360,2 400,28 Q440,48 480,18 Q520,0 560,25 Q600,48 640,15 Q680,0 720,22 Q760,42 800,30 L800,60 L0,60 Z'
    path2 = 'M0,30 Q40,5 80,22 Q120,42 160,15 Q200,0 240,25 Q280,45 320,18 Q360,2 400,28 Q440,48 480,18 Q520,0 560,25 Q600,48 640,15 Q680,0 720,22 Q760,42 800,30 L800,60 L0,60 Z'
  } else if (mediumStates.includes(state)) {
    path1 = 'M0,25 Q80,8 160,25 Q240,42 320,25 Q400,8 480,25 Q560,42 640,25 Q720,8 800,25 L800,60 L0,60 Z'
    path2 = 'M0,25 Q80,8 160,25 Q240,42 320,25 Q400,8 480,25 Q560,42 640,25 Q720,8 800,25 L800,60 L0,60 Z'
  } else {
    path1 = 'M0,30 Q100,15 200,30 Q300,45 400,30 Q500,15 600,30 Q700,45 800,30 L800,60 L0,60 Z'
    path2 = 'M0,30 Q100,15 200,30 Q300,45 400,30 Q500,15 600,30 Q700,45 800,30 L800,60 L0,60 Z'
  }

  return (
    <svg
      className="lake-waves-svg"
      viewBox="0 0 800 60"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={path1} fill="var(--wave1)" />
      <path d={path2} fill="var(--wave2)" />
    </svg>
  )
}

function RainParticles({ stormy }) {
  const count = stormy ? 30 : 20
  return (
    <div className="lake-particles">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`lake-rain-drop${stormy ? ' lake-rain-drop--stormy' : ''}`}
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${(Math.random() * 0.8).toFixed(2)}s`,
            animationDuration: `${stormy ? (0.3 + Math.random() * 0.15).toFixed(2) : (0.55 + Math.random() * 0.25).toFixed(2)}s`,
            height: `${12 + Math.floor(Math.random() * 7)}px`,
          }}
        />
      ))}
    </div>
  )
}

function SnowParticles() {
  return (
    <div className="lake-particles">
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="lake-snow-flake"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 60}%`,
            animationDelay: `${(Math.random() * 3).toFixed(2)}s`,
            animationDuration: `${(2 + Math.random() * 2).toFixed(2)}s`,
            width: `${3 + Math.floor(Math.random() * 3)}px`,
            height: `${3 + Math.floor(Math.random() * 3)}px`,
          }}
        />
      ))}
    </div>
  )
}

function LakeScene({ lake, weather }) {
  if (!lake) return null

  const description = weather?.description || lake?.description || ''
  const state = getLakeState(lake, description)

  const stateLabels = {
    beautiful: 'Beautiful',
    frozen:    'Frozen',
    stormy:    'Stormy',
    rainy:     'Rainy',
    snowy:     'Snowy',
    windy:     'Windy',
    overcast:  'Overcast',
    decent:    'Decent',
  }

  const showSun = state === 'beautiful' || state === 'decent'
  const frozenSun = state === 'frozen'
  const showClouds = state === 'overcast' || state === 'stormy'
  const showRain = state === 'rainy' || state === 'stormy'
  const showSnow = state === 'snowy'
  const showLightning = state === 'stormy'

  const lakeWindMph = lake.windMps != null ? Math.round(lake.windMps * 2.237 * 10) / 10 : '--'
  const overlayDesc = `${stateLabels[state]} — niceScore ${lake.niceScore ?? '--'} · ${lake.tempC ?? '--'}°C water · ${lakeWindMph} mph wind`

  return (
    <div className={`lake-scene lake-scene--${state}`}>
      <div className="lake-sky">
        {(showSun || frozenSun) && (
          <div className={`lake-sun${frozenSun ? ' lake-sun--frozen' : ''}`} />
        )}
        {showClouds && (
          <div className="lake-clouds">
            <div className={`lake-cloud lake-cloud--1${state === 'stormy' ? ' lake-cloud--stormy' : ''}`} />
            <div className={`lake-cloud lake-cloud--2${state === 'stormy' ? ' lake-cloud--stormy' : ''}`} />
            <div className={`lake-cloud lake-cloud--3${state === 'stormy' ? ' lake-cloud--stormy' : ''}`} />
          </div>
        )}
      </div>

      {showRain && <RainParticles stormy={state === 'stormy'} />}
      {showSnow && <SnowParticles />}
      {showLightning && <div className="lake-lightning" />}

      <div className="lake-waves-wrap">
        <WavesSVG state={state} />
      </div>

      <div className="lake-water" />

      <div className="lake-overlay">
        <div className="lake-state-label">{stateLabels[state]}</div>
        <div className="lake-state-desc">{overlayDesc}</div>
        <div className="lake-metrics">
          <span>niceScore {lake.niceScore ?? '--'}</span>
          <span>{lake.tempC ?? '--'}°C water</span>
          <span>{lakeWindMph} mph wind</span>
        </div>
        <div className="lake-badge">
          {lake.niceLabel || (state === 'beautiful' ? 'Excellent conditions' : 'Check before going out')}
        </div>
      </div>
    </div>
  )
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
  const midnightTick = useMidnightRefresh()
  const { weather, lake, loading } = useWeatherDetail(midnightTick)
  const beachData = useBeaches()

  const tempF      = weather?.tempF ?? (weather?.temp != null ? Math.round(weather.temp * 9 / 5 + 32) : null)
  const highF      = weather?.dailyHighF ?? weather?.highF ?? null
  const lowF       = weather?.dailyLowF  ?? weather?.lowF  ?? null
  const feelsLikeF = weather?.feelsLikeF ?? (weather?.feelsLike != null ? Math.round(weather.feelsLike * 9 / 5 + 32) : null)
  const windSpeed  = Math.round((weather?.wind?.speed ?? weather?.wind ?? 0) * 2.237 * 10) / 10
  const windDeg    = weather?.wind?.deg ?? 0
  const humidity   = weather?.humidity ?? null

  return (
    <div className="weather-page">
      <div className="weather-header">
        <div className="weather-header-left">
          <span className="weather-title">Weather &amp; Lake</span>
          <span className="weather-sub">Chicago-specific intelligence</span>
        </div>
        {!loading && weather && (
          <span className="weather-api-badge">
            <RiWifiLine size={9} />
            LIVE WEATHER DATA
          </span>
        )}
        {!loading && !weather && (
          <span className="weather-api-badge weather-api-badge--offline">
            <RiWifiLine size={9} />
            NO API KEY
          </span>
        )}
      </div>

      <div className="weather-grid">

        {/* Temperature row */}
        <div className="weather-card weather-card--temps">
          <div className="weather-card-label">CURRENT CONDITIONS</div>
          {loading && <div className="weather-loading">Loading...</div>}
          {!loading && !weather && (
            <div className="weather-no-key">Add OPENWEATHER_KEY to see live data</div>
          )}
          {weather && (
            <>
              <div className="weather-temp-row">
                <div className="weather-temp-tile">
                  <span className="weather-temp-label">HIGH</span>
                  <span className="weather-temp-value weather-temp-value--high">
                    {highF != null ? `${highF}°` : '--°'}
                  </span>
                </div>
                <div className="weather-temp-tile weather-temp-tile--center">
                  <span className="weather-temp-label">NOW</span>
                  <span className="weather-temp-value weather-temp-value--now">
                    {tempF != null ? `${tempF}°` : '--°'}
                  </span>
                  {feelsLikeF != null && (
                    <span className="weather-temp-sub">feels {feelsLikeF}°F</span>
                  )}
                </div>
                <div className="weather-temp-tile">
                  <span className="weather-temp-label">LOW</span>
                  <span className="weather-temp-value weather-temp-value--low">
                    {lowF != null ? `${lowF}°` : '--°'}
                  </span>
                </div>
              </div>

              <div className="weather-stats-row">
                <div className="weather-stat">
                  <RiWindyLine />
                  <span>{windSpeed} mph {windDir(windDeg)}</span>
                </div>
                <div className="weather-stat">
                  <RiWaterFlashLine />
                  <span>{humidity != null ? `${humidity}%` : '--'} humidity</span>
                </div>
                <div className="weather-stat">
                  <RiTempHotLine />
                  <span>{feelsLikeF != null ? `${feelsLikeF}°F` : '--'} feels like</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Lake visual tile */}
        <div className="weather-card weather-card--lake-scene">
          <div className="weather-card-label">LAKE MICHIGAN</div>
          {loading && <div className="weather-loading">Loading...</div>}
          {!loading && !lake && (
            <div className="weather-no-key">Add OPENWEATHER_KEY to see lake data</div>
          )}
          {lake && <LakeScene lake={lake} weather={weather} />}
        </div>

        {/* Beach tiles */}
        <div className="weather-card weather-card--beaches">
          <div className="weather-card-label">LAKE MICHIGAN BEACHES</div>
          {!beachData && <div className="weather-loading">Loading beach conditions...</div>}
          {beachData?.keyMissing && <div className="weather-no-key">Add OPENWEATHER_KEY to enable beach conditions</div>}
          {beachData?.beaches && (
            <div className="weather-beach-row">
              {beachData.beaches.map(b => (
                <div key={b.id} className="weather-beach-tile">
                  <div className="weather-beach-name">{b.name}</div>
                  <div className="weather-beach-advisory" style={{ color: b.advisory.color }}>{b.advisory.label}</div>
                  {b.weather && (
                    <div className="weather-beach-stats">
                      <span><RiTempHotLine /> {b.weather.tempF}°F</span>
                      <span><RiWindyLine /> {b.weather.windMph} mph</span>
                      <span><RiDropLine /> {b.weather.humidity}%</span>
                    </div>
                  )}
                  {b.advisory.score != null && (
                    <div className="weather-beach-bar">
                      <div className="weather-beach-fill" style={{ width: `${b.advisory.score}%`, background: b.advisory.color }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seasonal guide */}
        <div className="weather-card weather-card--seasons">
          <div className="weather-card-label">SEASONAL GUIDE</div>
          <div className="weather-seasons">
            {SEASONS.map(s => (
              <div key={s.name} className="weather-season">
                <div className="weather-season-name">
                  {s.name} <span className="weather-season-months">{s.months}</span>
                </div>
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
