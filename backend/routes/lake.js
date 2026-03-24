// backend/routes/lake.js
const { Router } = require('express')
const router = Router()

const LAT = 41.8919
const LON = -87.6197
const OWM_BASE = 'https://api.openweathermap.org/data/2.5'

function owmUrl() {
  return `${OWM_BASE}/weather?lat=${LAT}&lon=${LON}&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`
}

function calcNiceScore({ tempC, windMps, description }) {
  let score = 50
  if (tempC >= 18 && tempC <= 24) score += 25
  else if (tempC >= 12 && tempC < 18) score += 10
  else if (tempC < 5 || tempC > 30) score -= 20
  if (windMps > 10) score -= 20
  else if (windMps < 5) score += 10
  if (description.includes('clear') || description.includes('sunny')) score += 15
  if (description.includes('rain') || description.includes('storm')) score -= 30
  if (description.includes('snow')) score -= 25
  return Math.min(100, Math.max(0, score))
}

// GET /api/lake — lake conditions + niceness score
router.get('/', async (_req, res) => {
  try {
    const r = await fetch(owmUrl())
    const d = await r.json()
    const tempC = d.main.temp
    const windMps = d.wind.speed
    const description = d.weather[0].description
    const niceScore = calcNiceScore({ tempC, windMps, description })
    res.json({
      tempC:     Math.round(tempC),
      windMps:   Math.round(windMps * 10) / 10,
      description,
      niceScore,
      niceLabel: niceScore >= 70 ? 'Great day' : niceScore >= 40 ? 'Decent' : 'Stay inside',
    })
  } catch (e) {
    res.status(502).json({ error: 'Lake conditions unavailable', detail: e.message })
  }
})

module.exports = router
