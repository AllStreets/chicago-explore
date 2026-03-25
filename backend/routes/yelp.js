const { Router } = require('express')
const db = require('../db')
const router = Router()

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const TTL_MS = 6 * 60 * 60 * 1000  // 6 hours

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
  // Food
  restaurants: `[out:json];(node["amenity"="restaurant"](41.87,-87.655,41.92,-87.612);way["amenity"="restaurant"](41.87,-87.655,41.92,-87.612););out center 20;`,
  bars:        `[out:json];(node["amenity"="bar"](${BB_WIDE});way["amenity"="bar"](${BB_WIDE}););out center 50;`,
  cafes:       `[out:json];(node["amenity"="cafe"](41.87,-87.655,41.92,-87.612);way["amenity"="cafe"](41.87,-87.655,41.92,-87.612););out center 20;`,
  pizza:       `[out:json];(node["amenity"="restaurant"]["cuisine"="pizza"](41.87,-87.655,41.92,-87.612););out center 20;`,
  sushi:       `[out:json];(node["amenity"="restaurant"]["cuisine"~"sushi|japanese"](41.87,-87.655,41.92,-87.612););out center 20;`,
  tacos:       `[out:json];(node["amenity"="restaurant"]["cuisine"~"mexican|tacos"](41.87,-87.655,41.92,-87.612););out center 20;`,
  brunch:      `[out:json];(node["amenity"="restaurant"]["breakfast"="yes"](41.87,-87.655,41.92,-87.612);node["amenity"="cafe"](41.87,-87.655,41.92,-87.612););out center 20;`,

  // Nightlife — wider bounding boxes, emphasis on nightclubs + cocktail infrastructure
  nightlife:    `[out:json];(node["amenity"~"bar|nightclub"](${BB_WIDE});way["amenity"~"bar|nightclub"](${BB_WIDE}););out center 50;`,
  jazzandblues: `[out:json];(node["amenity"~"bar|music_venue"]["music"~"jazz|blues"](${BB_WIDE});node["amenity"="music_venue"](${BB_WIDE}););out center 30;`,
  danceclub:    `[out:json];(node["amenity"="nightclub"](${BB_WIDE});way["amenity"="nightclub"](${BB_WIDE}););out center 40;`,
  rooftop_bars: `[out:json];(node["amenity"="bar"]["rooftop"="yes"](${BB_WIDE});node["amenity"="bar"]["level"~"[2-9]"](${BB_WIDE});node["amenity"="bar"](${BB_WIDE}););out center 30;`,
  wine_bars:    `[out:json];(node["amenity"="bar"]["bar"~"wine"](${BB_WIDE});node["amenity"="wine_bar"](${BB_WIDE});node["amenity"="bar"]["cuisine"~"wine"](${BB_WIDE}););out center 30;`,
  cocktailbars: `[out:json];(node["amenity"="bar"]["bar"~"cocktail"](${BB_WIDE});node["amenity"="nightclub"](${BB_CENTRAL});way["amenity"="nightclub"](${BB_CENTRAL});node["amenity"="bar"](${BB_CENTRAL}););out center 40;`,
}

// Food "all" — three parallel zones: downtown, north side, Streeterville
const ALL_FOOD_QUERIES = [
  '[out:json];(node["amenity"~"restaurant|bar|cafe"](41.87,-87.655,41.905,-87.625);way["amenity"~"restaurant|bar|cafe"](41.87,-87.655,41.905,-87.625););out center 60;',
  '[out:json];(node["amenity"~"restaurant|bar|cafe"](41.905,-87.72,41.97,-87.625);way["amenity"~"restaurant|bar|cafe"](41.905,-87.72,41.97,-87.625););out center 60;',
  `[out:json];(node["amenity"~"restaurant|bar|cafe"](${BB_STREETERVILLE});way["amenity"~"restaurant|bar|cafe"](${BB_STREETERVILLE}););out center 30;`,
]

// Nightlife "all" — 6 neighborhood zones fetched in parallel, each capped at 25 results
// Bounding boxes trimmed to ~-87.625 east to exclude the lakefront
const NL_ALL_QUERIES = [
  '[out:json];(node["amenity"~"bar|nightclub"](41.884,-87.641,41.900,-87.625);way["amenity"~"bar|nightclub"](41.884,-87.641,41.900,-87.625););out center 25;', // River North
  '[out:json];(node["amenity"~"bar|nightclub"](41.908,-87.696,41.926,-87.666);way["amenity"~"bar|nightclub"](41.908,-87.696,41.926,-87.666););out center 25;', // Wicker Park
  '[out:json];(node["amenity"~"bar|nightclub"](41.942,-87.662,41.957,-87.646);way["amenity"~"bar|nightclub"](41.942,-87.662,41.957,-87.646););out center 25;', // Wrigleyville
  '[out:json];(node["amenity"~"bar|nightclub"](41.973,-87.670,41.990,-87.650);way["amenity"~"bar|nightclub"](41.973,-87.670,41.990,-87.650););out center 20;', // Andersonville
  '[out:json];(node["amenity"~"bar|nightclub"](41.877,-87.655,41.890,-87.635);way["amenity"~"bar|nightclub"](41.877,-87.655,41.890,-87.635););out center 25;', // West Loop
  '[out:json];(node["amenity"~"bar|nightclub"](41.920,-87.648,41.943,-87.630);way["amenity"~"bar|nightclub"](41.920,-87.648,41.943,-87.630););out center 20;', // Lincoln Park
  `[out:json];(node["amenity"~"bar|nightclub"](${BB_STREETERVILLE});way["amenity"~"bar|nightclub"](${BB_STREETERVILLE}););out center 20;`, // Streeterville
]

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
      if (r.status === 429 || r.status === 504) { lastErr = new Error(`Overpass ${r.status}`); continue }
      if (!r.ok) throw new Error(`Overpass ${r.status}`)
      const data = await r.json()
      return data.elements || []
    } catch (e) { lastErr = e }
  }
  throw lastErr
}

// GET /api/places?type=restaurants
router.get('/', async (req, res) => {
  const { type = 'restaurants' } = req.query
  const cacheKey = JSON.stringify({ type })

  const cached = stmtGet.get(cacheKey)
  if (cached && Date.now() - cached.cached_at < TTL_MS) {
    return res.json(JSON.parse(cached.data))
  }

  try {
    let elements

    if (type === 'all') {
      const results = await Promise.allSettled(ALL_FOOD_QUERIES.map(overpassFetch))
      const seen = new Set()
      elements = []
      for (const r of results) {
        if (r.status === 'fulfilled') {
          for (const el of r.value) {
            if (!seen.has(el.id)) { seen.add(el.id); elements.push(el) }
          }
        }
      }
    } else if (type === 'nightlife_all') {
      const results = await Promise.allSettled(NL_ALL_QUERIES.map(overpassFetch))
      const seen = new Set()
      elements = []
      for (const r of results) {
        if (r.status === 'fulfilled') {
          for (const el of r.value) {
            if (!seen.has(el.id)) { seen.add(el.id); elements.push(el) }
          }
        }
      }
    } else {
      const query = CATEGORY_QUERIES[type] || CATEGORY_QUERIES.restaurants
      elements = await overpassFetch(query)
    }

    const places = elements.map(parseElement).filter(Boolean).slice(0, 150)
    const payload = { places }
    stmtSet.run(cacheKey, JSON.stringify(payload), Date.now())
    res.json(payload)
  } catch (e) {
    res.status(502).json({ error: 'Places unavailable', detail: e.message })
  }
})

module.exports = router
