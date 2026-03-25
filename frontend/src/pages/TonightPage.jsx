// frontend/src/pages/TonightPage.jsx
import { useState, useEffect } from 'react'
import {
  RiSunLine, RiWindyLine, RiDropLine, RiSubwayLine,
  RiCalendarEventLine, RiFootballLine,
  RiMapPinLine, RiRefreshLine,
} from 'react-icons/ri'
import './TonightPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function useTonightData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/tonight`)
      setData(await r.json())
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  return { data, loading, refresh: load }
}

export default function TonightPage() {
  const { data, loading, refresh } = useTonightData()

  return (
    <div className="tonight-page">
      <div className="tonight-header">
        <div>
          <h1 className="tonight-title">Tonight in Chicago</h1>
          <p className="tonight-sub">What's happening right now</p>
        </div>
        <button className="tonight-refresh" onClick={refresh} title="Refresh">
          <RiRefreshLine />
        </button>
      </div>

      {loading && <div className="tonight-loading">Loading tonight's intel...</div>}

      {!loading && data && (
        <div className="tonight-grid">

          {/* Weather tile */}
          <div className="tn-tile tn-tile--wide">
            <div className="tn-tile-label"><RiSunLine /> WEATHER NOW</div>
            {data.weather ? (
              <div className="tn-weather">
                <span className="tn-temp">{data.weather.tempF}°</span>
                <span className="tn-feels">Feels {data.weather.feelsF}°F</span>
                <span className="tn-desc">{data.weather.description}</span>
                <div className="tn-weather-meta">
                  <span><RiWindyLine /> {data.weather.windMph} mph</span>
                  <span><RiDropLine /> {data.weather.humidity}%</span>
                  {data.trainCount != null && <span><RiSubwayLine /> {data.trainCount} trains active</span>}
                </div>
              </div>
            ) : <p className="tn-missing">Add OPENWEATHER_KEY to enable</p>}
          </div>

          {/* Beach advisories */}
          {data.beaches?.length > 0 && (
            <div className="tn-tile">
              <div className="tn-tile-label"><RiMapPinLine /> LAKE MICHIGAN BEACHES</div>
              <div className="tn-beach-list">
                {data.beaches.map(b => (
                  <div key={b.name} className="tn-beach-row">
                    <span className="tn-beach-name">{b.name}</span>
                    <span className="tn-beach-status" style={{ color: b.advisory.color }}>
                      {b.advisory.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tonight's events */}
          <div className="tn-tile">
            <div className="tn-tile-label"><RiCalendarEventLine /> TONIGHT'S EVENTS</div>
            {data.events?.length > 0 ? (
              <div className="tn-event-list">
                {data.events.map(e => (
                  <a key={e.id} className="tn-event-row" href={e.url} target="_blank" rel="noreferrer">
                    <span className="tn-event-time">{e.time}</span>
                    <div className="tn-event-info">
                      <span className="tn-event-name">{e.name}</span>
                      <span className="tn-event-venue">{e.venue}</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : <p className="tn-missing">{data.events ? 'No events tonight' : 'Add TICKETMASTER_KEY to enable'}</p>}
          </div>

          {/* Tonight's games */}
          <div className="tn-tile">
            <div className="tn-tile-label"><RiFootballLine /> CHICAGO SPORTS TONIGHT</div>
            {data.games?.length > 0 ? (
              <div className="tn-game-list">
                {data.games.map((g, i) => (
                  <div key={i} className="tn-game-row">
                    <span className="tn-game-dot" style={{ background: g.color }} />
                    <div className="tn-game-info">
                      <span className="tn-game-name">{g.team} vs {g.opponent}</span>
                      <span className="tn-game-time">{g.time}</span>
                    </div>
                    {g.chicagoScore != null && (
                      <span className="tn-game-score">{g.chicagoScore}–{g.oppScore}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : <p className="tn-missing">No Chicago games tonight</p>}
          </div>

        </div>
      )}
    </div>
  )
}
