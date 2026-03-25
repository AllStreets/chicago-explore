const { Router } = require('express')
const db = require('../db')
const router = Router()

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const TTL_MS    = 6 * 60 * 60 * 1000  // 6 hours
const CACHE_VER = 3                    // bump when queries change to auto-bust stale cache

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

// Shared bounding boxes (west boundary ~-87.635 cuts off lake, east ~-87.72 hits western suburbs)
// S=south N=north W=west E=east — format (S,W,N,E)
const BB_WIDE         = '41.85,-87.72,41.97,-87.625'  // whole city, excludes lake
const BB_NORTH        = '41.905,-87.72,41.97,-87.625' // Lincoln Park → Andersonville / Wicker Park
const BB_CENTRAL      = '41.87,-87.655,41.905,-87.625' // River North, West Loop, downtown
const BB_STREETERVILLE = '41.888,-87.624,41.898,-87.612' // Streeterville (east of Michigan Ave)

// Map UI category → OSM amenity/tag filter
const CATEGORY_QUERIES = {
  // Food — BB_WIDE covers downtown through Lincoln Park, Wicker Park, Andersonville
  restaurants: `[out:json];(node["amenity"="restaurant"](${BB_WIDE});way["amenity"="restaurant"](${BB_WIDE}););out center 100;`,
  bars:        `[out:json];(node["amenity"="bar"](${BB_WIDE});way["amenity"="bar"](${BB_WIDE}););out center 100;`,
  cafes:       `[out:json];(node["amenity"="cafe"](${BB_WIDE});way["amenity"="cafe"](${BB_WIDE}););out center 80;`,
  pizza:       `[out:json];(node["amenity"="restaurant"]["cuisine"="pizza"](${BB_WIDE});way["amenity"="restaurant"]["cuisine"="pizza"](${BB_WIDE}););out center 60;`,
  sushi:       `[out:json];(node["amenity"="restaurant"]["cuisine"~"sushi|japanese"](${BB_WIDE}););out center 60;`,
  tacos:       `[out:json];(node["amenity"="restaurant"]["cuisine"~"mexican|tacos"](${BB_WIDE}););out center 60;`,
  brunch:      `[out:json];(node["amenity"="restaurant"]["breakfast"="yes"](${BB_WIDE});node["amenity"="cafe"](${BB_WIDE}););out center 80;`,

  // Nightlife — wider bounding boxes, emphasis on nightclubs + cocktail infrastructure
  nightlife:    `[out:json];(node["amenity"~"bar|nightclub"](${BB_WIDE});way["amenity"~"bar|nightclub"](${BB_WIDE}););out center 50;`,
  jazzandblues: `[out:json];(node["amenity"~"bar|music_venue"]["music"~"jazz|blues"](${BB_WIDE});node["amenity"="music_venue"](${BB_WIDE}););out center 30;`,
  danceclub:    `[out:json];(node["amenity"="nightclub"](${BB_WIDE});way["amenity"="nightclub"](${BB_WIDE}););out center 40;`,
  rooftop_bars: `[out:json];(node["amenity"="bar"]["rooftop"="yes"](${BB_WIDE});node["amenity"="bar"]["level"~"[2-9]"](${BB_WIDE});node["amenity"="bar"](${BB_WIDE}););out center 30;`,
  wine_bars:    `[out:json];(node["amenity"="bar"]["bar"~"wine"](${BB_WIDE});node["amenity"="wine_bar"](${BB_WIDE});node["amenity"="bar"]["cuisine"~"wine"](${BB_WIDE}););out center 30;`,
  cocktailbars: `[out:json];(node["amenity"="bar"]["bar"~"cocktail"](${BB_WIDE});node["amenity"="nightclub"](${BB_CENTRAL});way["amenity"="nightclub"](${BB_CENTRAL});node["amenity"="bar"](${BB_CENTRAL}););out center 40;`,
}

// Food "all" — single wide query avoids parallel rate-limit issues
const ALL_FOOD_QUERY = '[out:json];(node["amenity"~"restaurant|bar|cafe"](41.85,-87.72,41.99,-87.612);way["amenity"~"restaurant|bar|cafe"](41.85,-87.72,41.99,-87.612););out center 150;'

// Nightlife "all" — single wide query covers all 7 scene neighborhoods
const NL_ALL_QUERY = '[out:json];(node["amenity"~"bar|nightclub"](41.85,-87.72,41.99,-87.612);way["amenity"~"bar|nightclub"](41.85,-87.72,41.99,-87.612););out center 150;'

function parseElement(el) {
  const tags = el.tags || {}
  const lat = el.lat ?? el.center?.lat
  const lon = el.lon ?? el.center?.lon
  if (!tags.name || !lat) return null
  return {
    id:           String(el.id),
    name:         tags.name,
    amenity:      tags.amenity || '',
    categories:   [tags.cuisine || tags.amenity || 'place'].map(c => c.replace(/_/g, ' ')),
    rating:       null,
    price:        '',
    neighborhood: tags['addr:suburb'] || tags['addr:neighbourhood'] || 'Chicago',
    address:      tags['addr:housenumber'] && tags['addr:street']
                    ? `${tags['addr:housenumber']} ${tags['addr:street']}`
                    : (tags['addr:street'] || ''),
    lat,
    lon,
    distance:     null,
    url:          null,
  }
}

async function overpassFetch(query) {
  let lastErr
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const r = await fetch(mirror, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(14000),
      })
      if (!r.ok) { lastErr = new Error(`Overpass ${r.status}`); continue }
      const data = await r.json()
      return data.elements || []
    } catch (e) { lastErr = e }
  }
  throw lastErr
}

// GET /api/places?type=restaurants
router.get('/', async (req, res) => {
  const { type = 'restaurants' } = req.query
  const cacheKey = JSON.stringify({ v: CACHE_VER, type })

  const cached = stmtGet.get(cacheKey)
  if (cached && Date.now() - cached.cached_at < TTL_MS) {
    return res.json(JSON.parse(cached.data))
  }

  try {
    let elements

    if (type === 'all') {
      elements = await overpassFetch(ALL_FOOD_QUERY)
    } else if (type === 'nightlife_all') {
      elements = await overpassFetch(NL_ALL_QUERY)
    } else {
      const query = CATEGORY_QUERIES[type] || CATEGORY_QUERIES.restaurants
      elements = await overpassFetch(query)
    }

    const places = elements.map(parseElement).filter(Boolean).slice(0, 150)
    const payload = { places }
    if (places.length > 0) stmtSet.run(cacheKey, JSON.stringify(payload), Date.now())
    res.json(payload)
  } catch (e) {
    res.status(502).json({ error: 'Places unavailable', detail: e.message })
  }
})

module.exports = router
