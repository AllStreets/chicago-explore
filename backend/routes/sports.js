// backend/routes/sports.js
const router = require('express').Router()

const TEAMS = [
  { name: 'Cubs',       sport: 'baseball',    league: 'mlb',        id: '16',  color: '#0e3386' },
  { name: 'White Sox',  sport: 'baseball',    league: 'mlb',        id: '145', color: '#000000' },
  { name: 'Bears',      sport: 'football',    league: 'nfl',        id: '3',   color: '#0b162a' },
  { name: 'Bulls',      sport: 'basketball',  league: 'nba',        id: '4',   color: '#ce1141' },
  { name: 'Blackhawks', sport: 'hockey',      league: 'nhl',        id: '16',  color: '#cf0a2c' },
  { name: 'Fire',       sport: 'soccer',      league: 'mls',        id: '3',   color: '#9d2235' },
]

async function fetchTeamGames(team) {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${team.sport}/${team.league}/teams/${team.id}/schedule`
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) throw new Error(`ESPN ${r.status}`)
    const json = await r.json()
    const events = json?.events || []
    const now = Date.now()
    // Get next 3 upcoming games
    const upcoming = events
      .filter(e => new Date(e.date).getTime() > now - 86400000)
      .slice(0, 3)
      .map(e => {
        const comp = e.competitions?.[0]
        const home = comp?.competitors?.find(c => c.homeAway === 'home')
        const away = comp?.competitors?.find(c => c.homeAway === 'away')
        return {
          id: e.id,
          date: e.date,
          name: e.name || `${away?.team?.displayName} @ ${home?.team?.displayName}`,
          venue: comp?.venue?.fullName || '',
          status: comp?.status?.type?.description || '',
          homeScore: home?.score,
          awayScore: away?.score,
        }
      })
    return { ...team, games: upcoming, error: null }
  } catch (err) {
    return { ...team, games: [], error: err.message }
  }
}

router.get('/', async (_req, res) => {
  const results = await Promise.all(TEAMS.map(fetchTeamGames))
  res.json(results)
})

router.get('/:team', async (req, res) => {
  const team = TEAMS.find(t => t.name.toLowerCase() === req.params.team.toLowerCase())
  if (!team) return res.status(404).json({ error: 'Team not found' })
  const result = await fetchTeamGames(team)
  res.json(result)
})

module.exports = router
