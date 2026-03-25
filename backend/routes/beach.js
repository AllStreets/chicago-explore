// backend/routes/beach.js
const { Router } = require('express')
const router = Router()
const { BEACHES, swimAdvisory } = require('../lib/beaches')

const BEACH_DESCRIPTIONS = {
  oak:      'Closest to Streeterville. Scenic skyline views.',
  north:    'Volleyball, concessions, boathouse. Most popular in summer.',
  '31st':   'South Side gem. Calmer, less crowded.',
  montrose: 'Dog beach and birding area. Most natural feel.',
}

router.get('/', async (_req, res) => {
  const key = process.env.OPENWEATHER_KEY
  if (!key) {
    return res.json({
      beaches: BEACHES.map(b => ({ ...b, description: BEACH_DESCRIPTIONS[b.id] || '', advisory: { label: 'Add OPENWEATHER_KEY', color: '#64748b', score: null }, weather: null })),
      keyMissing: true,
    })
  }

  try {
    const results = await Promise.all(BEACHES.map(async b => {
      const r = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${b.lat}&lon=${b.lon}&appid=${key}&units=metric`,
        { signal: AbortSignal.timeout(8000) }
      )
      const d = await r.json()
      const tempC   = d.main?.temp ?? 15
      const windMps = d.wind?.speed ?? 0
      const desc    = d.weather?.[0]?.description || ''
      return {
        ...b,
        description: BEACH_DESCRIPTIONS[b.id] || '',
        weather: {
          tempF:    Math.round(tempC * 9/5 + 32),
          windMph:  Math.round(windMps * 2.237 * 10) / 10,
          humidity: d.main?.humidity ?? null,
          desc,
        },
        advisory: swimAdvisory(tempC, windMps, desc),
      }
    }))
    res.json({ beaches: results })
  } catch (e) {
    res.status(502).json({ error: 'Beach data unavailable', detail: e.message })
  }
})

module.exports = router
