const { Router } = require('express')
const db = require('../db')
const router = Router()

const FSQ_BASE = 'https://api.foursquare.com/v3/places/search'
const TTL_MS = 6 * 60 * 60 * 1000  // 6 hours

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

// Foursquare category query terms by type
const CATEGORY_MAP = {
  restaurants: 'restaurant',
  bars:        'bar',
  cafes:       'cafe coffee',
  pizza:       'pizza',
  sushi:       'sushi',
  tacos:       'tacos mexican',
  brunch:      'brunch',
  nightlife:   'nightlife',
  jazzandblues:'jazz blues',
  danceclub:   'dance club',
  rooftop_bars:'rooftop bar',
  wine_bars:   'wine bar',
  cocktailbars:'cocktail bar',
}

function priceSymbol(n) {
  if (!n) return ''
  return '$'.repeat(n)
}

// GET /api/places?type=restaurants&open_now=true
router.get('/', async (req, res) => {
  const { type = 'restaurants', open_now } = req.query
  const cacheKey = JSON.stringify({ type, open_now })

  // Check SQLite cache (skip cache for open_now to keep results fresh)
  if (!open_now) {
    const cached = stmtGet.get(cacheKey)
    if (cached && Date.now() - cached.cached_at < TTL_MS) {
      return res.json(JSON.parse(cached.data))
    }
  }

  const key = process.env.FOURSQUARE_KEY
  if (!key) {
    // Graceful fallback — empty results
    return res.json({ places: [] })
  }

  const query = CATEGORY_MAP[type] || type
  const params = new URLSearchParams({
    ll: '41.8919,-87.6197',   // Streeterville center
    query,
    radius: 5000,
    limit: 20,
    fields: 'fsq_id,name,geocodes,categories,location,distance,price',
  })
  if (open_now === 'true') params.set('open_now', 'true')

  try {
    const r = await fetch(`${FSQ_BASE}?${params}`, {
      headers: {
        Authorization: key,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) throw new Error(`Foursquare ${r.status}`)
    const data = await r.json()
    const places = (data.results || []).map(p => ({
      id:           p.fsq_id,
      name:         p.name,
      categories:   (p.categories || []).map(c => c.name),
      rating:       null,   // not available on free tier
      price:        priceSymbol(p.price),
      neighborhood: p.location?.neighborhood?.[0] || p.location?.locality || 'Chicago',
      lat:          p.geocodes?.main?.latitude,
      lon:          p.geocodes?.main?.longitude,
      distance:     p.distance,   // metres from center
      url:          null,
    }))
    const payload = { places }
    stmtSet.run(cacheKey, JSON.stringify(payload), Date.now())
    res.json(payload)
  } catch (e) {
    res.status(502).json({ error: 'Foursquare unavailable', detail: e.message })
  }
})

module.exports = router
