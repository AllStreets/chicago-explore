import { useEffect, useState } from 'react'
import { RiCalendarLine, RiMapPinLine } from 'react-icons/ri'
import './SportsPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const TEAM_COLORS = {
  Cubs:       '#0e3386',
  'White Sox':'#27251f',
  Bears:      '#0b162a',
  Bulls:      '#ce1141',
  Blackhawks: '#cf0a2c',
  Fire:       '#9d2235',
}

const TRANSIT = {
  Cubs:       'Red Line → Addison',
  'White Sox':'Red Line → Sox-35th',
  Bears:      'Blue/Green Line → Roosevelt, then shuttle',
  Bulls:      'Green/Pink Line → Madison/Wacker',
  Blackhawks: 'Green/Pink Line → Madison/Wacker',
  Fire:       'Pink Line → Cermak-McCormick Place',
}

function useSports() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/sports`)
      .then(r => r.json())
      .then(d => setTeams(Array.isArray(d) ? d : []))
      .catch(() => setTeams([]))
      .finally(() => setLoading(false))
  }, [])

  return { teams, loading }
}

function formatDate(dateStr) {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function SportsPage() {
  const { teams, loading } = useSports()
  const [selected, setSelected] = useState(null)

  const active = selected ? teams.filter(t => t.name === selected) : teams

  return (
    <div className="sports-page">
      <div className="sports-header">
        <span className="sports-title">Sports</span>
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
        {active.map(team => (
          <div key={team.name} className="sports-team-card" style={{ '--team-color': TEAM_COLORS[team.name] || '#00d4ff' }}>
            <div className="sports-team-header">
              <span className="sports-team-name">{team.name}</span>
              <span className="sports-team-league">{team.league?.toUpperCase()}</span>
            </div>
            <div className="sports-transit">
              <RiMapPinLine />
              <span>{TRANSIT[team.name] || 'Check Google Maps'}</span>
            </div>
            {team.games?.length === 0 && (
              <div className="sports-no-games">No upcoming games found</div>
            )}
            {(team.games || []).map(g => (
              <div key={g.id} className="sports-game">
                <div className="sports-game-name">{g.name}</div>
                {(g.homeScore != null || g.awayScore != null) && (
                  <div className="sports-game-score">
                    {g.awayScore ?? '–'} – {g.homeScore ?? '–'}
                  </div>
                )}
                <div className="sports-game-meta">
                  <span className="sports-game-date">
                    <RiCalendarLine style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {formatDate(g.date)}
                  </span>
                  {g.venue && (
                    <span className="sports-game-venue">{g.venue}</span>
                  )}
                </div>
                {g.status && g.status !== 'Scheduled' && (
                  <span className="sports-game-status">{g.status}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
