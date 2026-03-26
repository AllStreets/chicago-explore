// backend/routes/tonight.js
// Uses shared event/games logic from home-feed.js and beach data from lib/beaches.js
// so the Tonight page always matches what the Home page shows.

const router = require('express').Router()
const db = require('../db')
const { fetchTonightEvents, fetchTonightGames } = require('./home-feed')
const { BEACHES, swimAdvisory } = require('../lib/beaches')
const { fetchWeather } = require('../lib/weather')

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

const TTL = 5 * 60 * 1000   // 5 min cache

// Fetch all 4 beach advisories using a single shared OWM call for city-center
// then per-beach calls (same as beach.js route) — uses shared swimAdvisory
async function fetchBeaches(owKey) {
  if (!owKey) return []
  try {
    const results = await Promise.all(BEACHES.map(async b => {
      const r = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${b.lat}&lon=${b.lon}&appid=${owKey}&units=metric`,
        { signal: AbortSignal.timeout(6000) }
      )
      const d = await r.json()
      const tempC   = d.main?.temp ?? 15
      const windMps = d.wind?.speed ?? 0
      const desc    = d.weather?.[0]?.description || ''
      return {
        id:       b.id,
        name:     b.name,
        advisory: swimAdvisory(tempC, windMps, desc),
        weather: {
          tempF:    Math.round(tempC * 9/5 + 32),
          windMph:  Math.round(windMps * 2.237 * 10) / 10,
          humidity: d.main?.humidity ?? null,
        },
      }
    }))
    return results
  } catch { return [] }
}

router.get('/', async (_req, res) => {
  const key = 'tonight_v5'
  const cached = stmtGet.get(key)
  if (cached && Date.now() - cached.cached_at < TTL) {
    // Always refresh game state — games share a cache with the home page so
    // this is cheap and ensures Tonight and Home always agree on Final/Live
    const freshGames = await fetchTonightGames().catch(() => null)
    const data = JSON.parse(cached.data)
    return res.json({ ...data, games: freshGames ?? data.games })
  }

  const result = {}
  const owKey = process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_KEY

  // Weather + beaches + event + games + trains — all in parallel
  const [weatherResult, beachResults, events, tonightGames, trainCount] = await Promise.all([
    // Weather — shared cache, same data as homepage
    fetchWeather().catch(() => null),

    // Beaches (all 4, same logic as beach.js)
    fetchBeaches(owKey),

    // Tonight's events — same filter/sort logic as home-feed, returns up to 8
    fetchTonightEvents().catch(() => []),

    // Tonight's games — same logic as home-feed
    fetchTonightGames().catch(() => []),

    // CTA train count
    process.env.CTA_API_KEY
      ? fetch(
          `https://lapi.transitchicago.com/api/1.0/ttpositions.aspx?key=${process.env.CTA_API_KEY}&rt=Red,Blue,Brn,G,Org,P,Pink,Y&outputType=JSON`,
          { signal: AbortSignal.timeout(5000) }
        )
          .then(r => r.json())
          .then(json => {
            let count = 0
            for (const rt of (json?.ctatt?.route || [])) {
              const trains = Array.isArray(rt.train) ? rt.train : rt.train ? [rt.train] : []
              count += trains.length
            }
            return count
          })
          .catch(() => null)
      : Promise.resolve(null),
  ])

  result.weather    = weatherResult
  result.beaches    = beachResults
  result.events     = events   // null = key missing, [] = none found, [...] = list
  result.games      = tonightGames
  result.trainCount = trainCount

  stmtSet.run(key, JSON.stringify(result), Date.now())
  res.json(result)
})

module.exports = router
