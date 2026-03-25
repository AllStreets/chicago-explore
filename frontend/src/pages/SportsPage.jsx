import { useEffect, useRef, useState } from 'react'
import { RiCalendarLine, RiMapPinLine, RiRefreshLine } from 'react-icons/ri'
import useMidnightRefresh from '../hooks/useMidnightRefresh'
import './SportsPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const TEAM_COLORS = {
  Cubs:        '#0e3386',
  'White Sox': '#c0c0c0',
  Bears:       '#4a6c8c',
  Bulls:       '#ce1141',
  Blackhawks:  '#cf0a2c',
  Fire:        '#9d2235',
}

const TRANSIT = {
  Cubs:        'Red Line → Addison',
  'White Sox': 'Red Line → Sox-35th',
  Bears:       'Blue/Green Line → Roosevelt + shuttle',
  Bulls:       'Green/Pink Line → Madison/Wacker',
  Blackhawks:  'Green/Pink Line → Madison/Wacker',
  Fire:        'Pink Line → Cermak-McCormick Place',
}

const LEAGUE_LABELS = {
  mlb: 'MLB', nfl: 'NFL', nba: 'NBA', nhl: 'NHL', 'usa.1': 'MLS',
}

function useSports() {
  const [teams, setTeams]     = useState([])
  const [loading, setLoading] = useState(true)
  const intervalRef           = useRef(null)

  function load(showSpinner = true) {
    if (showSpinner) setLoading(true)
    fetch(`${API}/api/sports`)
      .then(r => r.json())
      .then(d => {
        const data = Array.isArray(d) ? d : []
        setTeams(data)
        // Auto-refresh every 90 s while any game is live
        clearInterval(intervalRef.current)
        const hasLive = data.some(t => (t.today || []).some(g => g.state === 'in'))
        if (hasLive) {
          intervalRef.current = setInterval(() => load(false), 90000)
        }
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false))
  }

  const midnightTick = useMidnightRefresh()

  useEffect(() => {
    load()
    return () => clearInterval(intervalRef.current)
  }, [midnightTick]) // eslint-disable-line react-hooks/exhaustive-deps

  return { teams, loading, refresh: () => load(true) }
}

function formatDate(dateStr) {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function ScoreBadge({ game }) {
  if (game.state === 'pre') return null
  const isLive = game.state === 'in'
  return (
    <div className="sports-score-block">
      <div className="sports-score-teams">
        <span className="sports-score-team">{game.awayTeam}</span>
        <span className="sports-score-vs">
          <span className="sports-score-num">{game.awayScore ?? '–'}</span>
          <span className="sports-score-dash">–</span>
          <span className="sports-score-num">{game.homeScore ?? '–'}</span>
        </span>
        <span className="sports-score-team">{game.homeTeam}</span>
      </div>
      <span className={`sports-game-status${isLive ? ' live' : ' final'}`}>
        {isLive && <span className="sports-live-dot" />}
        {game.status}
      </span>
    </div>
  )
}

export default function SportsPage() {
  const { teams, loading, refresh } = useSports()
  const [selected, setSelected] = useState(null)

  const active = selected ? teams.filter(t => t.name === selected) : teams

  return (
    <div className="sports-page">
      <div className="sports-header">
        <div className="sports-title-row">
          <span className="sports-title">Sports</span>
          <button
            className={`sports-refresh-btn${loading ? ' spinning' : ''}`}
            onClick={refresh}
            title="Refresh scores"
          >
            <RiRefreshLine size={14} />
          </button>
        </div>
        <div className="sports-team-filters">
          <button
            className={`sports-team-btn${!selected ? ' active' : ''}`}
            onClick={() => setSelected(null)}
          >All</button>
          {teams.map(t => (
            <button
              key={t.name}
              className={`sports-team-btn${selected === t.name ? ' active' : ''}`}
              style={{ '--team-color': TEAM_COLORS[t.name] || '#00d4ff' }}
              onClick={() => setSelected(t.name === selected ? null : t.name)}
            >{t.name}</button>
          ))}
        </div>
      </div>

      {loading && <div className="sports-loading">Loading schedules...</div>}

      <div className="sports-grid">
        {active.map(team => {
          const color = TEAM_COLORS[team.name] || '#00d4ff'
          const hasToday    = (team.today    || []).length > 0
          const hasUpcoming = (team.upcoming || []).length > 0
          return (
            <div key={team.name} className="sports-team-card" style={{ '--team-color': color }}>
              <div className="sports-team-header">
                <span className="sports-team-name">{team.name}</span>
                <span className="sports-team-league">{LEAGUE_LABELS[team.league] || team.league?.toUpperCase()}</span>
              </div>

              <div className="sports-transit">
                <RiMapPinLine size={11} />
                <span>{TRANSIT[team.name] || 'Check Google Maps'}</span>
              </div>

              {hasToday && (
                <div className="sports-today-section">
                  <div className="sports-section-label">TODAY</div>
                  {team.today.map(g => (
                    <div key={g.id} className="sports-game today">
                      <ScoreBadge game={g} />
                      {g.state === 'pre' && (
                        <div className="sports-game-name">{g.name}</div>
                      )}
                      <div className="sports-game-meta">
                        <span className="sports-game-date">
                          <RiCalendarLine style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          {formatDate(g.date)}
                        </span>
                        {g.venue && <span className="sports-game-venue">{g.venue}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasUpcoming && (
                <div className="sports-upcoming-section">
                  {hasToday && <div className="sports-section-label">UPCOMING</div>}
                  {team.upcoming.map(g => (
                    <div key={g.id} className="sports-game">
                      <div className="sports-game-name">{g.name}</div>
                      <div className="sports-game-meta">
                        <span className="sports-game-date">
                          <RiCalendarLine style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          {formatDate(g.date)}
                        </span>
                        {g.venue && <span className="sports-game-venue">{g.venue}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!hasToday && !hasUpcoming && !loading && (
                <div className="sports-no-games">
                  {team.error ? 'Schedule unavailable' : 'No upcoming games'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
