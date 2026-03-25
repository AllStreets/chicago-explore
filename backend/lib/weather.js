// backend/lib/weather.js
// Shared weather fetch with 5-minute cache so all routes return identical data.

const LAT = 41.8919
const LON = -87.6197
const OWM_BASE = 'https://api.openweathermap.org/data/2.5'

let _cached = null
let _cachedAt = 0
const TTL = 5 * 60 * 1000

async function fetchWeather() {
  if (_cached && Date.now() - _cachedAt < TTL) return _cached

  const key = process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_KEY
  if (!key) return null

  const [wr, fr] = await Promise.all([
    fetch(`${OWM_BASE}/weather?lat=${LAT}&lon=${LON}&units=metric&appid=${key}`, { signal: AbortSignal.timeout(6000) }),
    fetch(`${OWM_BASE}/forecast?lat=${LAT}&lon=${LON}&cnt=8&units=metric&appid=${key}`, { signal: AbortSignal.timeout(6000) }),
  ])
  const d  = await wr.json()
  const fd = await fr.json()

  const tempC  = d.main?.temp ?? 0
  const feelsC = d.main?.feels_like ?? tempC
  const windMps = d.wind?.speed ?? 0

  // True daily high/low: include current temp so NOW never exceeds HIGH or falls below LOW
  const entries = Array.isArray(fd.list) ? fd.list : []
  const forecastHighs = entries.map(e => e.main.temp_max ?? e.main.temp)
  const forecastLows  = entries.map(e => e.main.temp_min ?? e.main.temp)
  const dailyHighC = Math.max(tempC, ...forecastHighs, d.main.temp_max ?? tempC)
  const dailyLowC  = Math.min(tempC, ...forecastLows,  d.main.temp_min ?? tempC)

  _cached = {
    temp:        Math.round(tempC),
    tempF:       Math.round(tempC * 9/5 + 32),
    dailyHighF:  Math.round(dailyHighC * 9/5 + 32),
    dailyLowF:   Math.round(dailyLowC * 9/5 + 32),
    feelsLike:   Math.round(feelsC),
    feelsLikeF:  Math.round(feelsC * 9/5 + 32),
    feelsF:      Math.round(feelsC * 9/5 + 32),   // alias used by TonightPage
    humidity:    d.main?.humidity ?? null,
    windMph:     Math.round(windMps * 2.237 * 10) / 10,
    wind:        { speed: windMps, deg: d.wind?.deg ?? 0 },
    visibility:  d.visibility ? Math.round(d.visibility / 1609.34 * 10) / 10 : null,
    description: d.weather?.[0]?.description || '',
    icon:        d.weather?.[0]?.icon || '',
    city:        d.name || 'Chicago',
  }
  _cachedAt = Date.now()
  return _cached
}

module.exports = { fetchWeather }
