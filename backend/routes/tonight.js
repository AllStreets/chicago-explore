// backend/routes/tonight.js
const router = require('express').Router()
const db = require('../db')

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

const TTL = 5 * 60 * 1000   // 5 min cache

// Chicago's main beaches with fixed coords
const BEACHES = [
  { name: 'Oak Street Beach',      lat: 41.9024, lon: -87.6244 },
  { name: 'North Avenue Beach',    lat: 41.9168, lon: -87.6351 },
  { name: '31st Street Beach',     lat: 41.8379, lon: -87.6158 },
]

function beachAdvisory(tempC, windMps, description) {
  if (description.includes('thunder') || description.includes('storm')) return { status: 'Closed', color: '#ef4444' }
  if (windMps > 12) return { status: 'High Waves', color: '#f97316' }
  if (tempC < 10)   return { status: 'Too Cold', color: '#8b5cf6' }
  if (tempC >= 22 && windMps < 8 && !description.includes('rain')) return { status: 'Ideal', color: '#10b981' }
  if (tempC >= 15)  return { status: 'Decent', color: '#eab308' }
  return { status: 'Chilly', color: '#64748b' }
}

router.get('/', async (_req, res) => {
  const key = 'tonight_v1'
  const cached = stmtGet.get(key)
  if (cached && Date.now() - cached.cached_at < TTL) {
    return res.json(JSON.parse(cached.data))
  }

  const result = {}

  // Weather
  const owKey = process.env.OPENWEATHER_KEY
  if (owKey) {
    try {
      const r = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=41.8919&lon=-87.6197&appid=${owKey}&units=metric`,
        { signal: AbortSignal.timeout(6000) }
      )
      const d = await r.json()
      const tempC   = d.main?.temp ?? 0
      const windMps = d.wind?.speed ?? 0
      const desc    = d.weather?.[0]?.description || ''
      result.weather = {
        tempF:       Math.round(tempC * 9/5 + 32),
        tempC:       Math.round(tempC),
        feelsF:      Math.round((d.main?.feels_like ?? tempC) * 9/5 + 32),
        windMph:     Math.round(windMps * 2.237 * 10) / 10,
        humidity:    d.main?.humidity ?? null,
        description: desc,
        icon:        d.weather?.[0]?.icon || '',
      }
      result.beaches = BEACHES.map(b => ({
        ...b,
        advisory: beachAdvisory(tempC, windMps, desc),
      }))
    } catch { result.weather = null; result.beaches = [] }
  } else {
    result.weather = null
    result.beaches = []
  }

  // Tonight events (top 5 non-sports)
  const tmKey = process.env.TICKETMASTER_KEY
  if (tmKey) {
    try {
      const todayStart = new Date(); todayStart.setHours(16, 0, 0, 0)
      const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 0)
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?city=Chicago&stateCode=IL&size=20&sort=date%2Casc&startDateTime=${todayStart.toISOString().slice(0,19)}Z&endDateTime=${todayEnd.toISOString().slice(0,19)}Z&apikey=${tmKey}`
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
      const json = await r.json()
      result.events = (json?._embedded?.events || [])
        .filter(e => (e.classifications?.[0]?.segment?.name || '').toLowerCase() !== 'sports')
        .slice(0, 5)
        .map(e => {
          const localTime = e.dates?.start?.localTime || '20:00:00'
          const [h, m] = localTime.split(':').map(Number)
          const ampm = h >= 12 ? 'PM' : 'AM'
          const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h
          return {
            id:    e.id,
            name:  e.name,
            venue: e._embedded?.venues?.[0]?.name || 'Chicago',
            time:  `${h12}:${String(m).padStart(2,'0')} ${ampm}`,
            type:  e.classifications?.[0]?.segment?.name || 'Event',
            url:   e.url,
          }
        })
    } catch { result.events = [] }
  } else {
    result.events = []
  }

  // Tonight sports (ESPN public — no key)
  const CHICAGO_TEAMS = [
    { name: 'Bulls',      sport: 'basketball', league: 'nba',   id: '4',    color: '#ce1141' },
    { name: 'Blackhawks', sport: 'hockey',     league: 'nhl',   id: '4',    color: '#cf0a2c' },
    { name: 'Cubs',       sport: 'baseball',   league: 'mlb',   id: '112',  color: '#0e3386' },
    { name: 'White Sox',  sport: 'baseball',   league: 'mlb',   id: '145',  color: '#c0c0c0' },
    { name: 'Fire',       sport: 'soccer',     league: 'usa.1', id: '1617', color: '#9d2235' },
  ]
  const chicagoToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const games = []
  await Promise.all(CHICAGO_TEAMS.map(async team => {
    try {
      const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${team.sport}/${team.league}/scoreboard`, { signal: AbortSignal.timeout(5000) })
      if (!r.ok) return
      const json = await r.json()
      const todayGames = (json?.events || []).filter(e => {
        const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(e.date))
        return localDate === chicagoToday
      }).filter(e => (e.competitions?.[0]?.competitors || []).some(c => String(c.team?.id) === String(team.id)))
      for (const e of todayGames.slice(0, 1)) {
        const comp = e.competitions?.[0]
        const home = comp?.competitors?.find(c => c.homeAway === 'home')
        const away = comp?.competitors?.find(c => c.homeAway === 'away')
        const state = comp?.status?.type?.state || 'pre'
        const chicagoIsHome = String(home?.team?.id) === String(team.id)
        const opp = chicagoIsHome ? away : home
        const ct = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(e.date))
        games.push({
          team: team.name, color: team.color, opponent: opp?.team?.shortDisplayName || '?',
          time: state === 'in' ? (comp?.status?.type?.description || 'Live') : state === 'post' ? 'Final' : ct,
          state,
          chicagoScore: state !== 'pre' ? String((chicagoIsHome ? home : away)?.score ?? '') : null,
          oppScore:     state !== 'pre' ? String((chicagoIsHome ? away : home)?.score ?? '') : null,
        })
      }
    } catch {}
  }))
  result.games = games

  // CTA train count
  const ctaKey = process.env.CTA_API_KEY
  if (ctaKey) {
    try {
      const r = await fetch(`https://lapi.transitchicago.com/api/1.0/ttpositions.aspx?key=${ctaKey}&rt=Red,Blue,Brn,G,Org,P,Pink,Y&outputType=JSON`)
      const json = await r.json()
      let count = 0
      for (const rt of (json?.ctatt?.route || [])) {
        const trains = Array.isArray(rt.train) ? rt.train : rt.train ? [rt.train] : []
        count += trains.length
      }
      result.trainCount = count
    } catch { result.trainCount = null }
  } else { result.trainCount = null }

  if (Object.keys(result).length > 0) stmtSet.run(key, JSON.stringify(result), Date.now())
  res.json(result)
})

module.exports = router
