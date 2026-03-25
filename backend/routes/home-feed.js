// backend/routes/home-feed.js
const router = require('express').Router()
const db = require('../db')

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

// ── Tonight event ──────────────────────────────────────────────────────────────
// Cache key changes at midnight — one real event after 5pm per day

function tonightDateStr() {
  const d = new Date()
  return `${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`
}

function midnightTonight() {
  const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime()
}

const DAY_EVENTS = [
  { name: 'Live Jazz at Green Mill',          venue: 'Green Mill, Uptown',              time: '9pm'   }, // Sun
  { name: 'Open Mic Night at Schubas Tavern', venue: 'Schubas Tavern, Lakeview',        time: '8pm'   }, // Mon
  { name: 'Blues at Buddy Guy\'s Legends',    venue: 'Buddy Guy\'s Legends, Loop',      time: '9pm'   }, // Tue
  { name: 'Improv Show at Second City',       venue: 'Second City, Old Town',            time: '8pm'   }, // Wed
  { name: 'Live Music at Empty Bottle',       venue: 'Empty Bottle, Ukrainian Village',  time: '9pm'   }, // Thu
  { name: 'DJ Night at Smart Bar',            venue: 'Smart Bar, Wrigleyville',          time: '10pm'  }, // Fri
  { name: 'Late Night at Spybar',             venue: 'Spybar, River North',              time: '10pm'  }, // Sat
]

// Pick the best real entertainment event from a Ticketmaster events array
function pickTonightEvent(events) {
  // Preferred segments (non-sports entertainment)
  const GOOD_SEGMENTS = ['music', 'arts & theatre', 'film', 'miscellaneous', 'comedy']
  // Hard reject: test events, sports, and anything clearly not entertainment
  const filtered = events.filter(e => {
    const name = (e.name || '').toLowerCase()
    if (/\btest\b/.test(name)) return false           // TEST events
    if (/tbd|to be determined/i.test(name)) return false
    const segment = (e.classifications?.[0]?.segment?.name || '').toLowerCase()
    if (segment === 'sports') return false             // sports handled in SPORTS tile
    // Prefer known good segments; if segment is unknown, still allow
    return true
  })
  // Sort: prefer known good segments first
  filtered.sort((a, b) => {
    const sa = (a.classifications?.[0]?.segment?.name || '').toLowerCase()
    const sb = (b.classifications?.[0]?.segment?.name || '').toLowerCase()
    const ra = GOOD_SEGMENTS.includes(sa) ? 0 : 1
    const rb = GOOD_SEGMENTS.includes(sb) ? 0 : 1
    return ra - rb
  })
  if (!filtered.length) return null
  const e = filtered[0]
  const localTime = e.dates?.start?.localTime || '20:00:00'
  const [hStr, mStr] = localTime.split(':')
  const h = parseInt(hStr, 10), m = parseInt(mStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h
  return {
    name:  e.name,
    time:  `Tonight ${h12}:${m.toString().padStart(2, '0')} ${ampm}`,
    venue: e._embedded?.venues?.[0]?.name || 'Chicago',
  }
}

// Shared raw event fetcher — returns all Ticketmaster events for tonight after 5 PM Chicago time.
// Uses a wide UTC window and filters by localTime on the response so Railway (UTC server) works correctly.
async function fetchTonightEventsRaw() {
  const tmKey = process.env.TICKETMASTER_KEY
  if (!tmKey) return null  // null = key missing

  // Chicago calendar date (YYYY-MM-DD) — correct even when server is UTC
  const chicagoDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date())

  // Wide UTC window: noon UTC → 7 AM UTC next day (covers all evening Chicago time in any timezone)
  const startStr = `${chicagoDate}T12:00:00Z`
  const nextDay  = new Date(chicagoDate + 'T00:00:00Z')
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const endStr   = nextDay.toISOString().slice(0, 10) + 'T07:00:00Z'

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?city=Chicago&stateCode=IL&size=50&sort=date%2Casc&startDateTime=${encodeURIComponent(startStr)}&endDateTime=${encodeURIComponent(endStr)}&apikey=${tmKey}`
  const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
  if (!r.ok) return []
  const json = await r.json()
  // Filter to events with localTime >= 17:00 (5 PM Chicago) — Ticketmaster localTime is venue-local
  return (json?._embedded?.events || []).filter(e => {
    const t = e.dates?.start?.localTime || '00:00:00'
    return t >= '17:00:00'
  })
}

// Format a raw Ticketmaster event into a consistent shape
function formatEvent(e) {
  const localTime = e.dates?.start?.localTime || '20:00:00'
  const [hStr, mStr] = localTime.split(':')
  const h = parseInt(hStr, 10), m = parseInt(mStr, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h
  return {
    id:    e.id,
    name:  e.name,
    time:  `${h12}:${m.toString().padStart(2, '0')} ${ampm}`,
    venue: e._embedded?.venues?.[0]?.name || 'Chicago',
    url:   e.url || null,
  }
}

// Returns the single best event for the Home page feed
async function fetchTonightEvent() {
  const key = `home_tonight_event_v5_${tonightDateStr()}`
  const cached = stmtGet.get(key)
  if (cached && Date.now() < midnightTonight()) {
    return JSON.parse(cached.data)
  }

  try {
    const allEvents = await fetchTonightEventsRaw()
    if (allEvents) {
      const filtered = allEvents.filter(e => {
        const name = (e.name || '').toLowerCase()
        if (/\btest\b/.test(name)) return false
        if (/tbd|to be determined/i.test(name)) return false
        const segment = (e.classifications?.[0]?.segment?.name || '').toLowerCase()
        return segment !== 'sports'
      })
      filtered.sort((a, b) => {
        const GOOD = ['music', 'arts & theatre', 'film', 'miscellaneous', 'comedy']
        const sa = (a.classifications?.[0]?.segment?.name || '').toLowerCase()
        const sb = (b.classifications?.[0]?.segment?.name || '').toLowerCase()
        return (GOOD.includes(sa) ? 0 : 1) - (GOOD.includes(sb) ? 0 : 1)
      })
      if (filtered.length) {
        const e = filtered[0]
        const event = { ...formatEvent(e), time: `Tonight ${formatEvent(e).time}` }
        stmtSet.run(key, JSON.stringify(event), Date.now())
        return event
      }
    }
  } catch {}

  // Fallback: curated rotating schedule of real Chicago venues
  const ev = DAY_EVENTS[new Date().getDay()]
  const event = { name: ev.name, time: `Tonight ${ev.time}`, venue: ev.venue, url: null }
  stmtSet.run(key, JSON.stringify(event), Date.now())
  return event
}

// Returns all tonight's events (for Tonight page — same filter as home, but up to 8)
async function fetchTonightEvents() {
  const key = `home_tonight_events_list_v2_${tonightDateStr()}`
  const cached = stmtGet.get(key)
  if (cached && Date.now() - cached.cached_at < 5 * 60 * 1000) {
    return JSON.parse(cached.data)
  }

  try {
    const allEvents = await fetchTonightEventsRaw()
    if (allEvents === null) return null  // key missing
    const filtered = allEvents
      .filter(e => {
        const name = (e.name || '').toLowerCase()
        if (/\btest\b/.test(name)) return false
        if (/tbd|to be determined/i.test(name)) return false
        const segment = (e.classifications?.[0]?.segment?.name || '').toLowerCase()
        return segment !== 'sports'
      })
      .sort((a, b) => {
        const GOOD = ['music', 'arts & theatre', 'film', 'miscellaneous', 'comedy']
        const sa = (a.classifications?.[0]?.segment?.name || '').toLowerCase()
        const sb = (b.classifications?.[0]?.segment?.name || '').toLowerCase()
        return (GOOD.includes(sa) ? 0 : 1) - (GOOD.includes(sb) ? 0 : 1)
      })
      .slice(0, 5)
      .map(formatEvent)
    stmtSet.run(key, JSON.stringify(filtered), Date.now())
    return filtered
  } catch { return [] }
}

function exScore(s) {
  if (s == null) return null
  if (typeof s === 'object') return s.displayValue ?? String(s.value ?? '')
  return String(s)
}

// ── Tonight games ──────────────────────────────────────────────────────────────
const CHICAGO_SPORTS = [
  { name: 'Cubs',       sport: 'baseball',   league: 'mlb',   id: '112', color: '#0e3386' },
  { name: 'White Sox',  sport: 'baseball',   league: 'mlb',   id: '145', color: '#c0c0c0' },
  { name: 'Bears',      sport: 'football',   league: 'nfl',   id: '3',   color: '#4a6c8c' },
  { name: 'Bulls',      sport: 'basketball', league: 'nba',   id: '4',   color: '#ce1141' },
  { name: 'Blackhawks', sport: 'hockey',     league: 'nhl',   id: '4',   color: '#cf0a2c' },
  { name: 'Fire',       sport: 'soccer',     league: 'usa.1', id: '1617',color: '#9d2235' },
]

async function fetchTonightGames() {
  const key = `home_tonight_games_v2_${tonightDateStr()}`
  const cached = stmtGet.get(key)
  if (cached && Date.now() - cached.cached_at < 5 * 60 * 1000) {
    return JSON.parse(cached.data)
  }

  // Chicago local date string YYYY-MM-DD — used to match ESPN UTC dates correctly
  const chicagoToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())

  const games = []
  await Promise.all(CHICAGO_SPORTS.map(async team => {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${team.sport}/${team.league}/scoreboard`
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
      if (!r.ok) return
      const json = await r.json()

      const todayEvents = (json?.events || []).filter(e => {
        if (!e.date) return false
        // Convert ESPN UTC timestamp to Chicago local date before comparing
        const localDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date(e.date))
        return localDate === chicagoToday
      }).filter(e =>
        (e.competitions?.[0]?.competitors || []).some(c => String(c.team?.id) === String(team.id))
      )

      for (const e of todayEvents.slice(0, 1)) {
        const comp    = e.competitions?.[0]
        const status  = comp?.status?.type
        const state   = status?.state || 'pre'
        const home    = comp?.competitors?.find(c => c.homeAway === 'home')
        const away    = comp?.competitors?.find(c => c.homeAway === 'away')
        const oppTeam = String(away?.team?.id) === String(team.id) ? home : away
        const oppName = oppTeam?.team?.shortDisplayName || oppTeam?.team?.displayName || '?'

        let timeStr
        if (state === 'in') {
          timeStr = status?.description || 'Live'
        } else if (state === 'post') {
          timeStr = 'Final'
        } else {
          const d = new Date(e.date)
          // ESPN times are UTC — convert to Chicago local
          const ct = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true,
          }).format(d)
          timeStr = ct
        }

        const homeScore = state !== 'pre' ? exScore(home?.score) : null
        const awayScore = state !== 'pre' ? exScore(away?.score) : null
        // Figure out which competitor is the Chicago team vs opponent
        const chicagoIsHome = String(home?.team?.id) === String(team.id)

        games.push({
          team:      team.name,
          sport:     team.sport,
          color:     team.color,
          opponent:  oppName,
          time:      timeStr,
          state,
          // Score from the Chicago team perspective: chicagoScore vs oppScore
          chicagoScore: chicagoIsHome ? homeScore : awayScore,
          oppScore:     chicagoIsHome ? awayScore : homeScore,
        })
      }
    } catch {}
  }))

  stmtSet.run(key, JSON.stringify(games), Date.now())
  return games
}

// ── Route ──────────────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  const results = {}

  // CTA train count
  try {
    const ctaKey = process.env.CTA_API_KEY
    if (ctaKey) {
      const url = `https://lapi.transitchicago.com/api/1.0/ttpositions.aspx?key=${ctaKey}&rt=Red,Blue,Brn,G,Org,P,Pink,Y&outputType=JSON`
      const r = await fetch(url)
      const json = await r.json()
      const routes = json?.ctatt?.route || []
      let count = 0
      for (const rt of routes) {
        const trains = Array.isArray(rt.train) ? rt.train : rt.train ? [rt.train] : []
        count += trains.length
      }
      results.trainCount = count
    } else {
      results.trainCount = null
    }
  } catch { results.trainCount = null }

  // Weather
  try {
    const owKey = process.env.OPENWEATHER_KEY
    if (owKey) {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=41.8919&lon=-87.6197&appid=${owKey}&units=metric`
      const r = await fetch(url)
      const json = await r.json()
      results.weather = {
        temp:        Math.round(json.main?.temp ?? 0),
        feels:       Math.round(json.main?.feels_like ?? 0),
        description: json.weather?.[0]?.description || '',
        wind:        json.wind?.speed || 0,
      }
    } else {
      results.weather = null
    }
  } catch { results.weather = null }

  // Tonight event + games in parallel
  const [nextEvent, tonightGames] = await Promise.all([
    fetchTonightEvent(),
    fetchTonightGames(),
  ])

  results.nextEvent    = nextEvent
  results.tonightGames = tonightGames

  res.json(results)
})

module.exports = router
module.exports.fetchTonightEvent  = fetchTonightEvent
module.exports.fetchTonightEvents = fetchTonightEvents
module.exports.fetchTonightGames  = fetchTonightGames
