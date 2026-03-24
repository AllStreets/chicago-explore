const { Router } = require('express')
const db = require('../db')
const router = Router()

const YELP_BASE = 'https://api.yelp.com/v3/businesses/search'
const TTL_MS = 6 * 60 * 60 * 1000  // 6 hours

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

// GET /api/places?type=restaurants&neighborhood=Loop&open_now=true&price=1,2
router.get('/', async (req, res) => {
  const { type = 'restaurants', neighborhood = 'Chicago', open_now, price } = req.query
  const cacheKey = JSON.stringify({ type, neighborhood, open_now, price })

  // Check SQLite cache
  const cached = stmtGet.get(cacheKey)
  if (cached && Date.now() - cached.cached_at < TTL_MS) {
    return res.json(JSON.parse(cached.data))
  }

  // Fetch from Yelp
  const params = new URLSearchParams({
    term: type,
    location: neighborhood + ', Chicago, IL',
    limit: 20,
    sort_by: 'rating',
  })
  if (open_now === 'true') params.set('open_now', 'true')
  if (price) params.set('price', price)

  try {
    const r = await fetch(`${YELP_BASE}?${params}`, {
      headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` }
    })
    const data = await r.json()
    const places = (data.businesses || []).map(b => ({
      id:           b.id,
      name:         b.name,
      categories:   b.categories.map(c => c.title),
      rating:       b.rating,
      price:        b.price || '',
      neighborhood: b.location?.neighborhood || neighborhood,
      lat:          b.coordinates?.latitude,
      lon:          b.coordinates?.longitude,
      url:          b.url,
      imageUrl:     b.image_url,
    }))
    const payload = { places }
    stmtSet.run(cacheKey, JSON.stringify(payload), Date.now())
    res.json(payload)
  } catch (e) {
    res.status(502).json({ error: 'Yelp unavailable', detail: e.message })
  }
})

module.exports = router
