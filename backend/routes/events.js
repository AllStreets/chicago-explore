// backend/routes/events.js
const router = require('express').Router()

// ── Type normalization ─────────────────────────────────────────────────────────

// Ticketmaster segment IDs → our categories
const SEG_MAP = {
  'KZFzniwnSyZfZ7v7nJ': 'music',
  'KZFzniwnSyZfZ7v7nE': 'sports',
  'KZFzniwnSyZfZ7v7na': 'arts',
  'KZFzniwnSyZfZ7v7nn': 'film',
  'KZFzniwnSyZfZ7v7n1': 'other',  // Miscellaneous
}

const SPORT_KEYWORDS = [
  'bulls', 'blackhawks', 'cubs', 'white sox', 'bears', 'fire fc', 'sky',
  'timberwolves', 'penguins', 'islanders', 'celtics', 'lakers', 'knicks',
  'nba', 'nhl', 'mlb', 'nfl', 'mls',
  'gameday', 'game day', 'post game', 'exit pass', 'premium seat',
  'suite', 'credential', 'club seats', 'floor seats',
]

function normalizeType(classification, name) {
  const seg     = (classification?.segment?.name || '').toLowerCase()
  const segId   = classification?.segment?.id || ''
  const genre   = (classification?.genre?.name   || '').toLowerCase()
  const subType = (classification?.subType?.name  || '').toLowerCase()

  // Segment ID lookup (most reliable)
  if (SEG_MAP[segId] && SEG_MAP[segId] !== 'other') return SEG_MAP[segId]

  // Segment name
  if (seg === 'music')                              return 'music'
  if (seg === 'sports')                             return 'sports'
  if (seg === 'film')                               return 'film'
  if (seg === 'arts & theatre') {
    if (genre === 'comedy')                         return 'comedy'
    if (genre === 'classical' || genre === 'opera') return 'music'
    return 'arts'
  }
  if (seg === 'miscellaneous') {
    if (genre === 'family')                         return 'family'
    if (genre.includes('fest'))                     return 'festival'
  }

  // Genre fallbacks
  if (genre === 'comedy')                           return 'comedy'
  if (genre === 'family')                           return 'family'
  if (genre.includes('fest'))                       return 'festival'
  if (['rock','pop','r&b','country','jazz','blues','hip-hop','hip hop',
       'classical','electronic','folk','metal','punk','indie'].includes(genre)) return 'music'
  if (['basketball','baseball','football','hockey','soccer','tennis',
       'golf','boxing','mma','wrestling','ice skating'].includes(genre))        return 'sports'

  // Name-based heuristic for sports packages where segment is "undefined"
  const n = (name || '').toLowerCase()
  if (SPORT_KEYWORDS.some(k => n.includes(k)))     return 'sports'

  return 'other'
}

// Filter out internal-code junk events from Ticketmaster
function isJunk(name) {
  if (!name || name.length < 3) return true
  // Pure alphanumeric codes: "FE251229", "CHI0001A"
  if (/^[A-Z0-9]{4,12}$/.test(name)) return true
  // "Greek STO", "XYZ Package" — short all-caps strings with no lowercase
  if (name === name.toUpperCase() && name.length < 12 && !/\d/.test(name)) return true
  return false
}

// ── Fallback ───────────────────────────────────────────────────────────────────
function getFallbackEvents() {
  const now = Date.now()
  return [
    { id: '1', name: 'Live Jazz at Green Mill',             date: new Date(now + 86400000).toISOString(),   venue: 'Green Mill Cocktail Lounge',     neighborhood: 'Uptown',       type: 'music',   price: '$10 cover' },
    { id: '2', name: 'Art Opening — Art Institute',         date: new Date(now + 2*86400000).toISOString(), venue: 'Art Institute of Chicago',       neighborhood: 'Loop',         type: 'arts',    price: 'Free'      },
    { id: '3', name: 'Green City Market',                   date: new Date(now + 3*86400000).toISOString(), venue: 'Lincoln Park',                   neighborhood: 'Lincoln Park', type: 'family',  price: 'Free'      },
    { id: '4', name: 'Comedy Show — Second City',           date: new Date(now + 4*86400000).toISOString(), venue: 'Second City',                    neighborhood: 'Old Town',     type: 'comedy',  price: '$25–40'    },
    { id: '5', name: 'Rooftop Cinema Night',                date: new Date(now + 5*86400000).toISOString(), venue: 'Museum of Science and Industry', neighborhood: 'Hyde Park',    type: 'film',    price: '$18'       },
    { id: '6', name: 'Chicago Blues Festival',              date: new Date(now + 7*86400000).toISOString(), venue: 'Millennium Park',                neighborhood: 'Loop',         type: 'festival',price: 'Free'      },
    { id: '7', name: 'Improv at iO Theater',                date: new Date(now + 2*86400000).toISOString(), venue: 'iO Theater',                     neighborhood: 'Wrigleyville', type: 'comedy',  price: '$20'       },
    { id: '8', name: 'Chicago Symphony Orchestra',          date: new Date(now + 3*86400000).toISOString(), venue: 'Symphony Center',                neighborhood: 'Loop',         type: 'arts',    price: '$30–120'   },
  ]
}

// ── Route ──────────────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  const key = process.env.TICKETMASTER_KEY
  if (!key) return res.json(getFallbackEvents())

  try {
    // Fetch 50 so we have plenty after filtering junk
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?city=Chicago&stateCode=IL&size=50&sort=date%2Casc&apikey=${key}`
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) throw new Error(`Ticketmaster ${r.status}`)
    const json = await r.json()

    const events = (json?._embedded?.events || [])
      .filter(e => !isJunk(e.name))
      .map(e => ({
        id:           e.id,
        name:         e.name,
        date:         e.dates?.start?.dateTime || e.dates?.start?.localDate,
        venue:        e._embedded?.venues?.[0]?.name || '',
        neighborhood: e._embedded?.venues?.[0]?.city?.name || 'Chicago',
        type:         normalizeType(e.classifications?.[0], e.name),
        price:        e.priceRanges
          ? `$${Math.round(e.priceRanges[0].min)}–${Math.round(e.priceRanges[0].max)}`
          : 'See site',
        url: e.url,
      }))

    res.json(events.length ? events : getFallbackEvents())
  } catch {
    res.json(getFallbackEvents())
  }
})

module.exports = router
