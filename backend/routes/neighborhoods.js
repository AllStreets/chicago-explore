// backend/routes/neighborhoods.js
const router = require('express').Router()
const db = require('../db')
const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

const BOUNDARY_TTL = 24 * 60 * 60 * 1000  // 24 hours

const HOOD_COLORS = {
  'streeterville': '#1e40af',
  'wicker-park':   '#8b5cf6',
  'lincoln-park':  '#eab308',
  'logan-square':  '#f43f5e',
  'river-north':   '#f97316',
  'south-loop':    '#06b6d4',
  'bucktown':      '#84cc16',
  'andersonville': '#10b981',
  'pilsen':        '#ef4444',
  'hyde-park':     '#6366f1',
  'old-town':      '#ec4899',
  'west-loop':     '#00d4ff',
}

const NEIGHBORHOODS = [
  {
    id: 'streeterville',
    name: 'Streeterville',
    tagline: 'Lake-front luxury, Magnificent Mile adjacent',
    vibe: ['upscale', 'lakefront', 'walkable'],
    walkScore: 97,
    transitScore: 84,
    avgRent: 3200,
    commute: '5 min to Mag Mile',
    topSpots: ['Navy Pier', 'Ohio Street Beach', 'Aster Hall'],
    description: 'Tucked between the Magnificent Mile and Lake Michigan, Streeterville is one of Chicago\'s most walkable neighborhoods. High-rises with lake views, world-class dining, and Navy Pier steps away.'
  },
  {
    id: 'wicker-park',
    name: 'Wicker Park',
    tagline: 'Indie soul, vintage shops, late nights',
    vibe: ['artsy', 'indie', 'nightlife'],
    walkScore: 95,
    transitScore: 89,
    avgRent: 2100,
    commute: '20 min on Blue Line',
    topSpots: ['Phyllis\' Musical Inn', 'Reckless Records', 'Big Star'],
    description: 'Chicago\'s creative heartbeat. Wicker Park blends dive bars with upscale dining, vintage boutiques with design studios. The Blue Line makes it an easy commute from Streeterville.'
  },
  {
    id: 'lincoln-park',
    name: 'Lincoln Park',
    tagline: 'Green space, brewpubs, families',
    vibe: ['green', 'family', 'bar scene'],
    walkScore: 91,
    transitScore: 79,
    avgRent: 2400,
    commute: '25 min on Red Line',
    topSpots: ['Lincoln Park Zoo', 'DePaul area bars', 'Armitage Ave'],
    description: 'Named after the 1,208-acre park on its doorstep. Tree-lined streets, excellent schools, a bustling bar scene around DePaul, and free access to Chicago\'s famous zoo.'
  },
  {
    id: 'logan-square',
    name: 'Logan Square',
    tagline: 'Michelin stars meet dive bars',
    vibe: ['hipster', 'foodie', 'diverse'],
    walkScore: 90,
    transitScore: 86,
    avgRent: 1900,
    commute: '30 min on Blue Line',
    topSpots: ['Lula Cafe', 'Revolution Brewing', 'Palmer Square'],
    description: 'One of Chicago\'s hottest neighborhoods. Logan Square punches above its weight on dining — home to some of the city\'s best restaurants, plus a thriving bar and coffee scene.'
  },
  {
    id: 'river-north',
    name: 'River North',
    tagline: 'Gallery district turned nightlife hub',
    vibe: ['nightlife', 'galleries', 'upscale'],
    walkScore: 96,
    transitScore: 82,
    avgRent: 2800,
    commute: '10 min walk to Mag Mile',
    topSpots: ['Bub City', 'RPM Italian', 'Chicago Riverwalk'],
    description: 'A short walk from Streeterville, River North transforms from gallery district by day to one of Chicago\'s prime nightlife zones by night. Dense with restaurants, rooftop bars, and clubs.'
  },
  {
    id: 'south-loop',
    name: 'South Loop',
    tagline: 'Museum campus, young professionals',
    vibe: ['professional', 'museums', 'mixed'],
    walkScore: 87,
    transitScore: 80,
    avgRent: 2000,
    commute: '20 min on Red/Green Line',
    topSpots: ['Grant Park', 'Shedd Aquarium', 'Soldier Field'],
    description: 'Just south of the Loop, this neighborhood has transformed dramatically. Condo towers for young professionals, proximity to Museum Campus, and easy lakefront access.'
  },
  {
    id: 'bucktown',
    name: 'Bucktown',
    tagline: 'Wicker Park\'s quieter sibling',
    vibe: ['residential', 'artsy', 'families'],
    walkScore: 90,
    transitScore: 85,
    avgRent: 2300,
    commute: '25 min on Blue Line',
    topSpots: ['Holstein Park', 'Bucktown Pub', 'Western Ave boutiques'],
    description: 'Just north of Wicker Park, Bucktown offers the same creative energy with a slightly more settled feel. Great brunch spots, independent boutiques, and tree-lined streets.'
  },
  {
    id: 'andersonville',
    name: 'Andersonville',
    tagline: 'LGBTQ+ friendly, Swedish heritage',
    vibe: ['inclusive', 'indie', 'community'],
    walkScore: 88,
    transitScore: 75,
    avgRent: 1800,
    commute: '35 min on Red Line',
    topSpots: ['The Hopleaf', 'Vintage cooking shops', 'Clark St'],
    description: 'One of Chicago\'s most welcoming neighborhoods. Andersonville has a rich Swedish heritage, a thriving LGBTQ+ community, and Clark Street lined with indie shops and restaurants.'
  },
  {
    id: 'pilsen',
    name: 'Pilsen',
    tagline: 'Mexican art mecca, gallery row',
    vibe: ['artistic', 'cultural', 'authentic'],
    walkScore: 85,
    transitScore: 78,
    avgRent: 1600,
    commute: '30 min on Pink Line',
    topSpots: ['National Museum of Mexican Art', 'La Paloma', 'Simone\'s'],
    description: 'Chicago\'s vibrant Mexican-American neighborhood. Murals cover nearly every building, the food scene is exceptional, and it houses the National Museum of Mexican Art. Rapidly gentrifying.'
  },
  {
    id: 'hyde-park',
    name: 'Hyde Park',
    tagline: 'Obama\'s neighborhood, UChicago campus',
    vibe: ['academic', 'historic', 'quiet'],
    walkScore: 82,
    transitScore: 70,
    avgRent: 1700,
    commute: '40 min on Metra',
    topSpots: ['Museum of Science and Industry', 'Medici', 'Promontory'],
    description: 'Home to the University of Chicago and Barack Obama\'s house, Hyde Park is an intellectually charged neighborhood on the South Side with beautiful architecture and lakefront access.'
  },
  {
    id: 'old-town',
    name: 'Old Town',
    tagline: 'Comedy, Second City, cobblestones',
    vibe: ['entertainment', 'historic', 'nightlife'],
    walkScore: 94,
    transitScore: 81,
    avgRent: 2600,
    commute: '15 min on Red Line',
    topSpots: ['Second City', 'The Spybar', 'Wells St'],
    description: 'Best known as home to The Second City comedy club, Old Town combines historic architecture with a lively entertainment scene. Wells Street is lined with restaurants and nightlife.'
  },
  {
    id: 'west-loop',
    name: 'West Loop',
    tagline: 'Restaurant row, tech offices, Fulton Market',
    vibe: ['foodie', 'tech', 'trendy'],
    walkScore: 92,
    transitScore: 83,
    avgRent: 2900,
    commute: '15 min on Green/Pink Line',
    topSpots: ['Randolph St restaurants', 'Fulton Market', 'Google HQ Chicago'],
    description: 'The hottest neighborhood in Chicago right now. Fulton Market has transformed from meatpacking district to restaurant row. Home to Google\'s Chicago HQ, upscale condos, and some of the city\'s best dining.'
  }
]

router.get('/', (_req, res) => {
  res.json(NEIGHBORHOODS)
})

router.get('/boundaries', async (_req, res) => {
  const CACHE_KEY = 'neighborhood_boundaries_v1'
  const cached = stmtGet.get(CACHE_KEY)
  if (cached && Date.now() - cached.cached_at < BOUNDARY_TTL) {
    return res.json(JSON.parse(cached.data))
  }

  try {
    const r = await fetch(
      'https://data.cityofchicago.org/api/geospatial/bbvz-uum9?method=export&type=GeoJSON',
      { signal: AbortSignal.timeout(8000) }
    )
    if (!r.ok) throw new Error(`City API ${r.status}`)
    const geojson = await r.json()

    // Build lookup map: lowercase name → neighborhood object
    const lookup = {}
    for (const n of NEIGHBORHOODS) {
      lookup[n.name.toLowerCase()] = n
    }

    const features = (geojson.features || [])
      .filter(f => {
        const name = (f.properties?.pri_neigh || '').toLowerCase()
        return !!lookup[name]
      })
      .map(f => {
        const name = (f.properties.pri_neigh || '').toLowerCase()
        const n = lookup[name]
        return {
          ...f,
          properties: {
            ...f.properties,
            id:      n.id,
            name:    n.name,
            color:   HOOD_COLORS[n.id] || '#00d4ff',
            tagline: n.tagline,
          },
        }
      })

    const result = { type: 'FeatureCollection', features }
    stmtSet.run(CACHE_KEY, JSON.stringify(result), Date.now())
    res.json(result)
  } catch (err) {
    // Return empty FeatureCollection on error — frontend handles gracefully
    res.json({ type: 'FeatureCollection', features: [] })
  }
})

router.get('/:id', (req, res) => {
  const n = NEIGHBORHOODS.find(n => n.id === req.params.id)
  if (!n) return res.status(404).json({ error: 'Not found' })
  res.json(n)
})

module.exports = router
