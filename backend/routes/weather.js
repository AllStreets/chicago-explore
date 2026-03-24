// backend/routes/weather.js
const { Router } = require('express')
const router = Router()

const LAT = 41.8919
const LON = -87.6197
const OWM_BASE = 'https://api.openweathermap.org/data/2.5'

function owmUrl() {
  return `${OWM_BASE}/weather?lat=${LAT}&lon=${LON}&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`
}

// GET /api/weather — current conditions
router.get('/', async (_req, res) => {
  try {
    const r = await fetch(owmUrl())
    const d = await r.json()
    const tempC = Math.round(d.main.temp)
    const feelsC = Math.round(d.main.feels_like)
    res.json({
      temp:        tempC,
      tempF:       Math.round(tempC * 9/5 + 32),
      feelsLike:   feelsC,
      feelsLikeF:  Math.round(feelsC * 9/5 + 32),
      humidity:    d.main.humidity,
      wind:        { speed: d.wind.speed, deg: d.wind.deg },
      description: d.weather[0].description,
      icon:        d.weather[0].icon,
      city:        d.name,
    })
  } catch (e) {
    res.status(502).json({ error: 'Weather unavailable', detail: e.message })
  }
})

module.exports = router
