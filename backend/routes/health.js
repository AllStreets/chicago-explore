const { Router } = require('express')
const db = require('../db')
const router = Router()

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const TTL_MS = 6 * 60 * 60 * 1000  // 6 hours
const BB = '41.85,-87.72,41.97,-87.625'

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

const HEALTH_CATEGORIES = {
  gyms:      { label: 'Gyms & Fitness',  source: 'overpass' },
  wellness:  { label: 'Wellness & Spa',  source: 'overpass' },
  grocery:   { label: 'Healthy Grocery', source: 'overpass' },
  running:   { label: 'Running Paths',   source: 'overpass' },
  courts:    { label: 'Sports Courts',   source: 'overpass' },
  urgent:    { label: 'Urgent Care',     source: 'overpass' },
  hospitals: { label: 'Hospitals',       source: 'overpass' },
}

const OVERPASS_QUERIES = {
  gyms:      `[out:json];(node["leisure"="fitness_centre"](${BB});way["leisure"="fitness_centre"](${BB});node["amenity"="gym"](${BB}););out center 80;`,
  wellness:  `[out:json];(node["shop"="beauty"](${BB});node["amenity"="spa"](${BB});node["leisure"="spa"](${BB});node["healthcare"="alternative"](${BB}););out center 60;`,
  grocery:   `[out:json];(node["shop"="supermarket"](${BB});node["shop"="health_food"](${BB});node["shop"="organic"](${BB});way["shop"="supermarket"](${BB}););out center 60;`,
  running:   `[out:json];(way["leisure"="track"](${BB});way["highway"="footway"]["foot"="designated"](${BB});way["route"="running"](${BB});relation["route"="running"](${BB}););out center 40;`,
  courts:    `[out:json];(node["leisure"="pitch"]["sport"~"basketball|tennis|volleyball"](${BB});way["leisure"="pitch"]["sport"~"basketball|tennis|volleyball"](${BB}););out center 60;`,
  urgent:    `[out:json];(node["amenity"="clinic"](${BB});node["healthcare"="centre"](${BB});node["amenity"="doctors"](${BB});way["amenity"="clinic"](${BB}););out center 50;`,
  hospitals: `[out:json];(node["amenity"="hospital"](${BB});way["amenity"="hospital"](${BB}););out center 30;`,
}

async function fetchOverpass(query) {
  let lastErr
  for (const url of OVERPASS_MIRRORS) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: AbortSignal.timeout(10000),
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
  const { category = 'gyms' } = req.query
  const catDef = HEALTH_CATEGORIES[category]

  if (!catDef) {
    return res.json({ places: [] })
  }

  const { label } = catDef
  const cacheKey = `health_${category}_v1`

  const cached = stmtGet.get(cacheKey)
  if (cached && Date.now() - cached.cached_at < TTL_MS) {
    return res.json(JSON.parse(cached.data))
  }

  try {
    const elements = await fetchOverpass(OVERPASS_QUERIES[category])
    const places = elements.map(parseElement).filter(Boolean).slice(0, 100)
    const payload = { category, label, places }
    if (places.length > 0) stmtSet.run(cacheKey, JSON.stringify(payload), Date.now())
    res.json(payload)
  } catch (e) {
    res.json({ category, label, places: [] })
  }
})

module.exports = router
