const { Router } = require('express')
const db = require('../db')
const router = Router()

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const TTL_MS = 6 * 60 * 60 * 1000  // 6 hours
const SEED_TTL_MS = 24 * 60 * 60 * 1000  // seed data treated as 24h old so Overpass refresh is attempted
const BB = '41.78,-87.75,42.00,-87.58'
const CACHE_VERSION = 'v3'

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

const HEALTH_CATEGORIES = {
  gyms:      { label: 'Gyms & Fitness'  },
  wellness:  { label: 'Wellness & Spa'  },
  grocery:   { label: 'Healthy Grocery' },
  running:   { label: 'Running Paths'   },
  courts:    { label: 'Sports Courts'   },
  urgent:    { label: 'Urgent Care'     },
  hospitals: { label: 'Hospitals'       },
}

const OVERPASS_QUERIES = {
  gyms:      `[out:json];(node["leisure"="fitness_centre"](${BB});way["leisure"="fitness_centre"](${BB});node["leisure"="sports_centre"](${BB});way["leisure"="sports_centre"](${BB});node["amenity"="gym"](${BB}););out center 100;`,
  wellness:  `[out:json];(node["shop"="beauty"](${BB});node["amenity"="spa"](${BB});node["leisure"="spa"](${BB});node["shop"="massage"](${BB});node["shop"="hairdresser"](${BB}););out center 80;`,
  grocery:   `[out:json];(node["shop"="supermarket"](${BB});way["shop"="supermarket"](${BB});node["shop"="health_food"](${BB});node["shop"="organic"](${BB});node["shop"="grocery"](${BB});way["shop"="grocery"](${BB}););out center 80;`,
  running:   `[out:json];(way["leisure"="track"](${BB});node["leisure"="track"](${BB});node["leisure"="fitness_station"](${BB});way["leisure"="fitness_station"](${BB}););out center 80;`,
  courts:    `[out:json];(node["leisure"="pitch"]["sport"~"basketball|tennis|volleyball"](${BB});way["leisure"="pitch"]["sport"~"basketball|tennis|volleyball"](${BB});node["sport"="basketball"](${BB});node["sport"="tennis"](${BB}););out center 80;`,
  urgent:    `[out:json];(node["amenity"="clinic"](${BB});node["healthcare"="clinic"](${BB});node["amenity"="doctors"](${BB});node["healthcare"="centre"](${BB}););out center 60;`,
  hospitals: `[out:json];(node["amenity"="hospital"](${BB});way["amenity"="hospital"](${BB}););out center 40;`,
}

// Pre-seeded data bundled with the app — used instantly on first load or when Overpass is unavailable
let SEED_DATA = null
try {
  SEED_DATA = require('../data/health_seed.json')
} catch (_) {}

// Write seed data into cache on startup for any category that has no cached entry
if (SEED_DATA) {
  const seedTimestamp = Date.now() - SEED_TTL_MS  // mark as 24h old so background refresh still runs
  for (const [cat, payload] of Object.entries(SEED_DATA)) {
    const key = `health_${cat}_${CACHE_VERSION}`
    const existing = stmtGet.get(key)
    if (!existing) {
      stmtSet.run(key, JSON.stringify(payload), seedTimestamp)
    }
  }
}

async function fetchOverpass(query) {
  let lastErr
  for (const url of OVERPASS_MIRRORS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(25000),
      })
      if (!r.ok) { lastErr = new Error(`Overpass ${r.status}`); continue }
      const data = await r.json()
      return data.elements || []
    } catch (e) { lastErr = e }
  }
  throw lastErr || new Error('All Overpass mirrors failed')
}

function parseElement(el) {
  const tags = el.tags || {}
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (!lat || !lng) return null
  return {
    id:      el.id,
    name:    tags.name || tags['name:en'] || 'Unnamed',
    lat,
    lng,
    address: [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || null,
    phone:   tags.phone || tags['contact:phone'] || null,
    website: tags.website || tags['contact:website'] || null,
    hours:   tags.opening_hours || null,
  }
}

// GET /api/health-places?category=gyms
router.get('/', async (req, res) => {
  const { category = 'wellness' } = req.query
  const catDef = HEALTH_CATEGORIES[category]

  if (!catDef) {
    return res.json({ places: [] })
  }

  const { label } = catDef
  const cacheKey = `health_${category}_${CACHE_VERSION}`

  const cached = stmtGet.get(cacheKey)
  if (cached && Date.now() - cached.cached_at < TTL_MS) {
    return res.json(JSON.parse(cached.data))
  }

  // Cache stale or missing — try Overpass, fall back to stale cached data (seed or old)
  try {
    const elements = await fetchOverpass(OVERPASS_QUERIES[category])
    const places = elements.map(parseElement).filter(Boolean).slice(0, 100)
    const payload = { category, label, places }
    if (places.length > 0) stmtSet.run(cacheKey, JSON.stringify(payload), Date.now())
    res.json(payload)
  } catch (e) {
    // Return stale cached data (seed) if available rather than empty
    if (cached) return res.json(JSON.parse(cached.data))
    res.json({ category, label, places: [] })
  }
})

module.exports = router
