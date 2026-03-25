// backend/routes/beach.js
const { Router } = require('express')
const router = Router()

const BEACHES = [
  { id: 'oak',      name: 'Oak Street Beach',    lat: 41.9024, lon: -87.6244, description: 'Closest to Streeterville. Scenic skyline views.' },
  { id: 'north',    name: 'North Avenue Beach',   lat: 41.9168, lon: -87.6351, description: 'Volleyball, concessions, boathouse. Most popular in summer.' },
  { id: '31st',     name: '31st Street Beach',    lat: 41.8379, lon: -87.6158, description: 'South Side gem. Calmer, less crowded.' },
  { id: 'montrose', name: 'Montrose Beach',       lat: 41.9694, lon: -87.6381, description: 'Dog beach and birding area. Most natural feel.' },
]

function swimAdvisory(tempC, windMps, desc) {
  if (desc.includes('thunder') || desc.includes('storm')) return { label: 'Closed — Lightning', color: '#ef4444', score: 0 }
  if (windMps > 14)  return { label: 'High Waves — Caution', color: '#ef4444', score: 20 }
  if (tempC < 8)     return { label: 'Too Cold', color: '#8b5cf6', score: 10 }
  if (desc.includes('rain')) return { label: 'Rain', color: '#64748b', score: 30 }
  if (tempC >= 22 && windMps < 8) return { label: 'Ideal', color: '#10b981', score: 95 }
  if (tempC >= 16)   return { label: 'Good', color: '#00d4ff', score: 75 }
  if (tempC >= 10)   return { label: 'Chilly', color: '#eab308', score: 45 }
  return { label: 'Cold', color: '#f97316', score: 25 }
}

router.get('/', async (_req, res) => {
  const key = process.env.OPENWEATHER_KEY
  if (!key) {
    return res.json({
      beaches: BEACHES.map(b => ({ ...b, advisory: { label: 'Add OPENWEATHER_KEY', color: '#64748b', score: null }, weather: null })),
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
