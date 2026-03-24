// backend/routes/home-feed.js
const router = require('express').Router()

router.get('/', async (req, res) => {
  const results = {}

  // CTA train count
  try {
    const key = process.env.CTA_KEY
    if (key) {
      const url = `https://lapi.transitchicago.com/api/1.0/ttpositions.aspx?key=${key}&rt=Red,Blue,Brn,G,Org,P,Pink,Y&outputType=JSON`
      const r = await fetch(url)
      const json = await r.json()
      const routes = json?.ctatt?.route || []
      let count = 0
      for (const rt of routes) {
        const trains = Array.isArray(rt.train) ? rt.train : rt.train ? [rt.train] : []
        count += trains.length
      }
      results.trainCount = count
    } else {
      results.trainCount = null
    }
  } catch { results.trainCount = null }

  // Weather summary
  try {
    const key = process.env.OPENWEATHER_KEY
    if (key) {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=41.8919&lon=-87.6197&appid=${key}&units=metric`
      const r = await fetch(url)
      const json = await r.json()
      results.weather = {
        temp: Math.round(json.main?.temp ?? 0),
        feels: Math.round(json.main?.feels_like ?? 0),
        description: json.weather?.[0]?.description || '',
        wind: json.wind?.speed || 0
      }
    } else {
      results.weather = null
    }
  } catch { results.weather = null }

  // Next event (static fallback)
  results.nextEvent = {
    name: 'Live Music at Millenium Park',
    time: 'Tonight 7pm',
    type: 'event'
  }

  res.json(results)
})

module.exports = router
