import { useState, useEffect, useMemo } from 'react'
import { RiMapPinLine, RiCalendarEventLine, RiStoreLine, RiTrophyLine } from 'react-icons/ri'
import './IntelFeed.css'

const LINE_COLORS = {
  Red: '#ef4444', Blue: '#3b82f6', Brn: '#92400e',
  G: '#10b981', Org: '#f97316', P: '#8b5cf6',
  Pink: '#ec4899', Y: '#eab308',
}

const LINE_NAMES = {
  Red: 'Red', Blue: 'Blue', Brn: 'Brown',
  G: 'Green', Org: 'Orange', P: 'Purple',
  Pink: 'Pink', Y: 'Yellow',
}

// Streeterville coordinates
const HOME_LAT = 41.8919
const HOME_LON = -87.6197

function haversineDist(lat, lon) {
  const R = 6371
  const dLat = (lat - HOME_LAT) * Math.PI / 180
  const dLon = (lon - HOME_LON) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(HOME_LAT * Math.PI/180) * Math.cos(lat * Math.PI/180) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function arrivalMins(arrTime) {
  if (!arrTime) return null
  const t = new Date(arrTime)
  if (isNaN(t)) return null
  const diff = Math.round((t - Date.now()) / 60000)
  return diff <= 0 ? 'Due' : `${diff} min`
}

const SPORT_LABELS = {
  baseball:   'MLB',
  football:   'NFL',
  basketball: 'NBA',
  hockey:     'NHL',
  soccer:     'MLS',
}

export default function IntelFeed({ weather, lake, trains = [], trainCount, nextEvent, topSpots = [], tonightGames = [] }) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    })
    setClock(fmt())
    const t = setInterval(() => setClock(fmt()), 1000)
    return () => clearInterval(t)
  }, [])

  // Single closest train to Streeterville
  const closestTrain = useMemo(() => {
    if (!trains.length) return null
    return [...trains].sort((a, b) =>
      haversineDist(a.lat, a.lon) - haversineDist(b.lat, b.lon)
    )[0]
  }, [trains])

  return (
    <aside className="intel-feed">
      <div className="intel-feed-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="intel-feed-title">LIVE INTEL</span>
          <span className="intel-clock">{clock}</span>
        </div>
        <span className="intel-feed-sub">
          <RiMapPinLine style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Streeterville
          {trainCount != null && (
            <span className="intel-train-badge">{trainCount} trains</span>
          )}
        </span>
      </div>

      {weather && (
        <div className="intel-card">
          <div className="intel-card-label">WEATHER</div>
          <div className="intel-card-value">
            <span style={{color:'#f87171'}}>{weather.highF ?? Math.round((weather.temp+2) * 9/5 + 32)}°</span>
            <span style={{fontSize:'14px',color:'var(--text-muted)',margin:'0 4px'}}>/</span>
            <span style={{color:'#60a5fa'}}>{weather.lowF ?? Math.round((weather.temp-2) * 9/5 + 32)}°</span>
            <span style={{fontSize:'11px',color:'var(--text-muted)',marginLeft:6}}>F</span>
          </div>
          <div className="intel-card-sub">{weather.description} · Wind {weather.wind?.speed ?? weather.wind} m/s</div>
          {lake && <div className="intel-card-badge">{lake.niceLabel}</div>}
        </div>
      )}

      {nextEvent && (
        <div className="intel-card intel-card--event">
          <div className="intel-card-label">
            <RiCalendarEventLine style={{ verticalAlign: 'middle', marginRight: 4 }} />
            TONIGHT
          </div>
          <div className="intel-card-name">{nextEvent.name}</div>
          <div className="intel-card-sub">{nextEvent.venue ? `${nextEvent.venue} · ` : ''}{nextEvent.time}</div>
        </div>
      )}

      {topSpots.length > 0 && (
        <div className="intel-card intel-card--spots">
          <div className="intel-card-label">
            <RiStoreLine style={{ verticalAlign: 'middle', marginRight: 4 }} />
            BUZZING NOW
          </div>
          {topSpots.map(s => (
            <div key={s.id} className="intel-spot-row">
              <span className="intel-spot-name">{s.name}</span>
              <span className="intel-spot-rating">{s.rating != null ? s.rating : s.distance != null ? `${(s.distance/1000).toFixed(1)}km` : ''}</span>
            </div>
          ))}
        </div>
      )}

      <div className="intel-card intel-card--sports">
        <div className="intel-card-label">
          <RiTrophyLine style={{ verticalAlign: 'middle', marginRight: 4 }} />
          SPORTS
        </div>
        {tonightGames.length === 0 ? (
          <div className="intel-card-sub" style={{ paddingTop: 4 }}>No Chicago games tonight</div>
        ) : (
          tonightGames.map((g, i) => (
            <div key={i} className="intel-sport-row">
              <span className="intel-sport-dot" style={{ background: g.color || '#00d4ff' }} />
              <div className="intel-sport-info">
                <span className="intel-sport-teams">{g.team} vs {g.opponent}</span>
                <span className="intel-sport-meta">{SPORT_LABELS[g.sport] || g.sport.toUpperCase()}</span>
              </div>
              {g.state === 'in' && g.chicagoScore != null ? (
                <div className="intel-sport-score">
                  <span className="intel-sport-live-dot" />
                  <span className="intel-sport-score-num" style={{ color: g.color || '#00d4ff' }}>{g.chicagoScore}</span>
                  <span className="intel-sport-score-dash">-</span>
                  <span className="intel-sport-score-num" style={{ color: 'var(--text-muted)' }}>{g.oppScore}</span>
                </div>
              ) : (
                <span className={`intel-sport-time${g.state === 'in' ? ' live' : ''}`}>
                  {g.state === 'in' && <span className="intel-sport-live-dot" />}
                  {g.time}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <div className="intel-cta-section">
        <div className="intel-card-label" style={{ marginBottom: 6 }}>CTA NEARBY</div>
        {!closestTrain && (
          <div className="intel-card-sub" style={{ padding: '8px 0' }}>Loading trains...</div>
        )}
        {closestTrain && (
          <div className="intel-card intel-card--train">
            <span className="intel-train-dot" style={{ background: LINE_COLORS[closestTrain.line] || '#00d4ff' }} />
            <div className="intel-train-info">
              <span className="intel-train-line">{closestTrain.line ? `${LINE_NAMES[closestTrain.line] || closestTrain.line} Line` : 'CTA Train'}</span>
              <span className="intel-train-station">{closestTrain.nextStation}</span>
            </div>
            {arrivalMins(closestTrain.arrTime) && (
              <span className="intel-train-time">{arrivalMins(closestTrain.arrTime)}</span>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
