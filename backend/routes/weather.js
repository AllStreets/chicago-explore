// backend/routes/weather.js
const { Router } = require('express')
const router = Router()
const { fetchWeather } = require('../lib/weather')

// GET /api/weather — current conditions with true daily high/low from forecast
router.get('/', async (_req, res) => {
  try {
    const w = await fetchWeather()
    if (!w) return res.status(503).json({ error: 'No weather API key configured' })
    res.json(w)
  } catch (e) {
    res.status(502).json({ error: 'Weather unavailable', detail: e.message })
  }
})

module.exports = router
