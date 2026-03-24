const { Router } = require('express')
const db = require('../db')
const router = Router()

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const TTL_MS = 6 * 60 * 60 * 1000  // 6 hours

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

// Map UI category → OSM amenity/tag filter
const CATEGORY_QUERIES = {
  restaurants: '[out:json];(node["amenity"="restaurant"](41.87,-87.65,41.92,-87.60);way["amenity"="restaurant"](41.87,-87.65,41.92,-87.60););out center 20;',
  bars:        '[out:json];(node["amenity"="bar"](41.87,-87.65,41.92,-87.60);way["amenity"="bar"](41.87,-87.65,41.92,-87.60););out center 20;',
  cafes:       '[out:json];(node["amenity"="cafe"](41.87,-87.65,41.92,-87.60);way["amenity"="cafe"](41.87,-87.65,41.92,-87.60););out center 20;',
  pizza:       '[out:json];(node["amenity"="restaurant"]["cuisine"="pizza"](41.87,-87.65,41.92,-87.60););out center 20;',
  sushi:       '[out:json];(node["amenity"="restaurant"]["cuisine"~"sushi|japanese"](41.87,-87.65,41.92,-87.60););out center 20;',
  tacos:       '[out:json];(node["amenity"="restaurant"]["cuisine"~"mexican|tacos"](41.87,-87.65,41.92,-87.60););out center 20;',
  brunch:      '[out:json];(node["amenity"="restaurant"]["breakfast"="yes"](41.87,-87.65,41.92,-87.60);node["amenity"="cafe"](41.87,-87.65,41.92,-87.60););out center 20;',
  nightlife:   '[out:json];(node["amenity"~"bar|nightclub"](41.87,-87.65,41.92,-87.60);way["amenity"~"bar|nightclub"](41.87,-87.65,41.92,-87.60););out center 20;',
  jazzandblues:'[out:json];(node["amenity"~"bar|music_venue"]["music"~"jazz|blues"](41.87,-87.65,41.92,-87.60);node["amenity"="music_venue"](41.87,-87.65,41.92,-87.60););out center 20;',
  danceclub:   '[out:json];(node["amenity"="nightclub"](41.87,-87.65,41.92,-87.60);way["amenity"="nightclub"](41.87,-87.65,41.92,-87.60););out center 20;',
  rooftop_bars:'[out:json];(node["amenity"="bar"]["rooftop"="yes"](41.87,-87.65,41.92,-87.60);node["amenity"="bar"](41.87,-87.65,41.92,-87.60););out center 15;',
  wine_bars:   '[out:json];(node["amenity"="bar"]["bar"="wine_bar"](41.87,-87.65,41.92,-87.60);node["amenity"="wine_bar"](41.87,-87.65,41.92,-87.60););out center 20;',
  cocktailbars:'[out:json];(node["amenity"="bar"]["bar"~"cocktail"](41.87,-87.65,41.92,-87.60);node["amenity"="bar"](41.87,-87.65,41.92,-87.60););out center 20;',
}

function parseElement(el) {
  const tags = el.tags || {}
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  if (!tags.name || !lat) return null
  return {
    id:           String(el.id),
    name:         tags.name,
    categories:   [tags.cuisine || tags.amenity || 'place'].map(c => c.replace(/_/g, ' ')),
    rating:       null,
    price:        '',
    neighborhood: tags['addr:suburb'] || tags['addr:neighbourhood'] || 'Chicago',
    lat,
    lon,
    distance:     null,
    url:          null,
  }
}

// GET /api/places?type=restaurants&open_now=true
router.get('/', async (req, res) => {
  const { type = 'restaurants' } = req.query
  const cacheKey = JSON.stringify({ type })

  const cached = stmtGet.get(cacheKey)
  if (cached && Date.now() - cached.cached_at < TTL_MS) {
    return res.json(JSON.parse(cached.data))
  }

  const query = CATEGORY_QUERIES[type] || CATEGORY_QUERIES.restaurants

  try {
    const r = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(10000),
    })
    if (!r.ok) throw new Error(`Overpass ${r.status}`)
    const data = await r.json()
    const places = (data.elements || [])
      .map(parseElement)
      .filter(Boolean)
      .slice(0, 20)
    const payload = { places }
    stmtSet.run(cacheKey, JSON.stringify(payload), Date.now())
    res.json(payload)
  } catch (e) {
    res.status(502).json({ error: 'Places unavailable', detail: e.message })
  }
})

module.exports = router
