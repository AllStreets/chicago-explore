// backend/routes/sports.js
const { Router } = require('express')
const db = require('../db')
const router = Router()

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

const SCORE_TTL    = 90 * 1000        // 90 s — live scoreboard stays fresh
const SCHEDULE_TTL = 60 * 60 * 1000   // 1 h  — upcoming schedule

const TEAMS = [
  { name: 'Cubs',       sport: 'baseball',   league: 'mlb',   id: '112', color: '#0e3386' },
  { name: 'White Sox',  sport: 'baseball',   league: 'mlb',   id: '145', color: '#27251f' },
  { name: 'Bears',      sport: 'football',   league: 'nfl',   id: '3',   color: '#0b162a' },
  { name: 'Bulls',      sport: 'basketball', league: 'nba',   id: '4',   color: '#ce1141' },
  { name: 'Blackhawks', sport: 'hockey',     league: 'nhl',   id: '4',   color: '#cf0a2c' },
  { name: 'Fire',       sport: 'soccer',     league: 'usa.1', id: '1617',color: '#9d2235' },
]

function extractScore(s) {
  if (s == null) return null
  if (typeof s === 'object') return s.displayValue ?? String(s.value ?? '')
  return String(s)
}

function parseGame(e) {
  const comp = e.competitions?.[0]
  const home = comp?.competitors?.find(c => c.homeAway === 'home')
  const away = comp?.competitors?.find(c => c.homeAway === 'away')
  const status = comp?.status?.type
  const state = status?.state || 'pre'
  return {
    id:        e.id,
    date:      e.date,
    name:      e.name || `${away?.team?.displayName ?? '?'} @ ${home?.team?.displayName ?? '?'}`,
    venue:     comp?.venue?.fullName || '',
    status:    status?.description || 'Scheduled',
    state,
    homeTeam:  home?.team?.displayName || '',
    awayTeam:  away?.team?.displayName || '',
    homeScore: state !== 'pre' ? extractScore(home?.score) : null,
    awayScore: state !== 'pre' ? extractScore(away?.score) : null,
  }
}

// Scoreboard = today's games with live scores (short cache)
async function fetchTodayGame(team) {
  const cacheKey = `sports_today_v1_${team.league}_${team.id}`
  const cached = stmtGet.get(cacheKey)
  if (cached && Date.now() - cached.cached_at < SCORE_TTL) {
    return JSON.parse(cached.data)
  }
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${team.sport}/${team.league}/scoreboard`
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) return []
    const json = await r.json()
    const today = (json?.events || [])
      .filter(e => (e.competitions?.[0]?.competitors || [])
        .some(c => String(c.team?.id) === String(team.id)))
      .map(parseGame)
    stmtSet.run(cacheKey, JSON.stringify(today), Date.now())
    return today
  } catch {
    return []
  }
}

// Schedule = upcoming games after today (long cache)
async function fetchUpcomingGames(team) {
  const cacheKey = `sports_upcoming_v1_${team.league}_${team.id}`
  const cached = stmtGet.get(cacheKey)
  if (cached && Date.now() - cached.cached_at < SCHEDULE_TTL) {
    return JSON.parse(cached.data)
  }
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${team.sport}/${team.league}/teams/${team.id}/schedule`
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) throw new Error(`ESPN ${r.status}`)
    const json = await r.json()
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const upcoming = (json?.events || [])
      .filter(e => new Date(e.date).getTime() > todayEnd.getTime())
      .slice(0, 3)
      .map(parseGame)
    stmtSet.run(cacheKey, JSON.stringify(upcoming), Date.now())
    return upcoming
  } catch (err) {
    return { error: err.message }
  }
}

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000

async function fetchTeamData(team) {
  const [today, upcomingResult] = await Promise.all([
    fetchTodayGame(team),
    fetchUpcomingGames(team),
  ])
  const upcoming = Array.isArray(upcomingResult) ? upcomingResult : []
  const error    = upcomingResult?.error || null

  // Drop completed games that are stale or superseded by a newer game
  const hasActiveGame = today.some(g => g.state !== 'post')
  const filtered = today.filter(g => {
    if (g.state !== 'post') return true                          // always keep live/upcoming
    if (hasActiveGame) return false                              // newer game started — drop old final
    const age = Date.now() - new Date(g.date).getTime()
    return age < TWENTY_FOUR_HOURS                              // drop finals older than 24h
  })

  return { ...team, today: filtered, upcoming, error }
}

router.get('/', async (_req, res) => {
  const results = await Promise.all(TEAMS.map(fetchTeamData))
  res.json(results)
})

// GET /api/sports/tickets?team=Bulls&date=2026-04-01
router.get('/tickets', async (req, res) => {
  const clientId = process.env.SEATGEEK_CLIENT_ID
  const { team, date } = req.query

  if (!clientId) {
    const TEAM_URLS = {
      Bulls: 'https://www.nba.com/bulls/tickets',
      Blackhawks: 'https://www.nhl.com/blackhawks/tickets',
      Cubs: 'https://www.mlb.com/cubs/tickets',
      'White Sox': 'https://www.mlb.com/white-sox/tickets',
      Bears: 'https://www.chicagobears.com/tickets/',
      Fire: 'https://www.chicago-fire.com/tickets',
    }
    return res.json({ tickets: null, fallbackUrl: TEAM_URLS[team] || 'https://seatgeek.com', keyMissing: true })
  }

  try {
    const q = encodeURIComponent(`${team} ${date || ''}`.trim())
    const url = `https://api.seatgeek.com/2/events?q=${q}&venue.city=Chicago&client_id=${clientId}&per_page=3`
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
    const json = await r.json()
    const events = (json?.events || []).map(e => ({
      id:          e.id,
      title:       e.title,
      datetime:    e.datetime_local,
      url:         e.url,
      lowestPrice: e.stats?.lowest_price || null,
      medianPrice: e.stats?.median_price || null,
    }))
    res.json({ tickets: events })
  } catch (e) {
    res.status(502).json({ error: 'Ticket data unavailable', detail: e.message })
  }
})

module.exports = router
