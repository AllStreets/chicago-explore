const { Router } = require('express')
const db = require('../db')
const router = Router()

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]
const TTL_MS = 6 * 60 * 60 * 1000  // 6 hours
const BB = '41.78,-87.75,42.00,-87.58'

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

const HEALTH_CATEGORIES = {
  gyms:      { label: 'Gyms & Fitness',  source: 'overpass', cacheVersion: 'v2' },
  wellness:  { label: 'Wellness & Spa',  source: 'overpass', cacheVersion: 'v1' },
  grocery:   { label: 'Healthy Grocery', source: 'overpass', cacheVersion: 'v2' },
  running:   { label: 'Running Paths',   source: 'overpass', cacheVersion: 'v2' },
  courts:    { label: 'Sports Courts',   source: 'overpass', cacheVersion: 'v2' },
  urgent:    { label: 'Urgent Care',     source: 'overpass', cacheVersion: 'v2' },
  hospitals: { label: 'Hospitals',       source: 'overpass', cacheVersion: 'v2' },
}

const OVERPASS_QUERIES = {
  gyms:      `[out:json];(node["leisure"="fitness_centre"](${BB});way["leisure"="fitness_centre"](${BB});node["leisure"="sports_centre"](${BB});way["leisure"="sports_centre"](${BB});node["amenity"="gym"](${BB});way["amenity"="gym"](${BB}););out center 100;`,
  wellness:  `[out:json];(node["shop"="beauty"](${BB});node["amenity"="spa"](${BB});node["leisure"="spa"](${BB});node["healthcare"="alternative"](${BB});node["shop"="massage"](${BB});node["shop"="hairdresser"](${BB}););out center 80;`,
  grocery:   `[out:json];(node["shop"="supermarket"](${BB});way["shop"="supermarket"](${BB});node["shop"="health_food"](${BB});node["shop"="organic"](${BB});node["shop"="grocery"](${BB});way["shop"="grocery"](${BB});node["shop"="greengrocer"](${BB}););out center 80;`,
  running:   `[out:json];(way["leisure"="track"](${BB});node["leisure"="track"](${BB});way["leisure"="fitness_trail"](${BB});node["leisure"="fitness_station"](${BB});way["leisure"="fitness_station"](${BB});way["highway"="path"]["foot"!="no"](${BB});way["highway"="footway"]["access"!="private"](${BB}););out center 80;`,
  courts:    `[out:json];(node["leisure"="pitch"]["sport"~"basketball|tennis|volleyball"](${BB});way["leisure"="pitch"]["sport"~"basketball|tennis|volleyball"](${BB});node["sport"="basketball"](${BB});node["sport"="tennis"](${BB});node["amenity"="tennis"](${BB}););out center 80;`,
  urgent:    `[out:json];(node["amenity"="clinic"](${BB});way["amenity"="clinic"](${BB});node["healthcare"="centre"](${BB});node["healthcare"="clinic"](${BB});node["amenity"="doctors"](${BB});node["amenity"="urgent_care"](${BB});node["healthcare"="urgent_care"](${BB}););out center 60;`,
  hospitals: `[out:json];(node["amenity"="hospital"](${BB});way["amenity"="hospital"](${BB});relation["amenity"="hospital"](${BB}););out center 40;`,
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
  const { category = 'gyms' } = req.query
  const catDef = HEALTH_CATEGORIES[category]

  if (!catDef) {
    return res.json({ places: [] })
  }

  const { label, cacheVersion } = catDef
  const cacheKey = `health_${category}_${cacheVersion}`

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
