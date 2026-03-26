// frontend/src/pages/TonightPage.jsx
import { useState, useEffect, useRef } from 'react'
import {
  RiSunLine, RiMoonLine, RiCloudLine, RiThunderstormsLine, RiDrizzleLine,
  RiSnowflakeLine, RiWindyLine, RiDropLine, RiTempHotLine, RiEyeLine,
  RiSubwayLine, RiCalendarEventLine, RiFootballLine,
  RiMapPinLine, RiRefreshLine, RiArrowRightLine, RiTimeLine,
  RiWifiLine, RiBarChartLine, RiBusLine,
} from 'react-icons/ri'
import useCTA from '../hooks/useCTA'
import useMidnightRefresh from '../hooks/useMidnightRefresh'
import './TonightPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ─── Live clock ─────────────────────────────────────────────────────────────
function useClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

// ─── Tonight data hook ───────────────────────────────────────────────────────
function useTonightData(midnightTick) {
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [lastFetch, setLastFetch] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/tonight`)
      const d = await r.json()
      setData(d)
      setLastFetch(new Date())
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [midnightTick])
  return { data, loading, lastFetch, refresh: load }
}

// ─── Vibe score calculator ────────────────────────────────────────────────────
function calcVibeScore(data) {
  if (!data) return null
  let score = 50
  const w = data.weather
  if (w) {
    if (w.tempF >= 65 && w.tempF <= 82) score += 20
    else if (w.tempF >= 50 && w.tempF < 65) score += 10
    else if (w.tempF < 32 || w.tempF > 90) score -= 20
    if (w.windMph < 10) score += 5
    else if (w.windMph > 25) score -= 15
    const desc = (w.description || '').toLowerCase()
    if (desc.includes('clear') || desc.includes('sun')) score += 10
    else if (desc.includes('thunder') || desc.includes('storm')) score -= 20
    else if (desc.includes('rain') || desc.includes('drizzle')) score -= 10
  }
  if (data.events?.length > 3) score += 10
  else if (data.events?.length > 0) score += 5
  if (data.games?.length > 0) score += 8
  return Math.max(0, Math.min(100, score))
}

function vibeLabel(score) {
  if (score >= 81) return { label: 'PEAK CHICAGO', color: '#10b981' }
  if (score >= 61) return { label: 'SOLID NIGHT',  color: '#eab308' }
  return               { label: 'STAY IN',      color: '#ef4444' }
}

// ─── Animated weather icon ────────────────────────────────────────────────────
function WeatherIcon({ description = '', size = 32 }) {
  const desc = description.toLowerCase()
  if (desc.includes('thunder') || desc.includes('storm')) return <RiThunderstormsLine style={{ fontSize: size, color: '#818cf8' }} className="tn-wx-icon tn-wx-icon--storm" />
  if (desc.includes('drizzle') || desc.includes('rain'))  return <RiDrizzleLine       style={{ fontSize: size, color: '#60a5fa' }} className="tn-wx-icon tn-wx-icon--rain" />
  if (desc.includes('snow'))                               return <RiSnowflakeLine     style={{ fontSize: size, color: '#e2e8f0' }} className="tn-wx-icon tn-wx-icon--snow" />
  if (desc.includes('cloud') || desc.includes('overcast')) return <RiCloudLine        style={{ fontSize: size, color: '#94a3b8' }} className="tn-wx-icon tn-wx-icon--cloud" />
  if (desc.includes('wind'))                               return <RiWindyLine         style={{ fontSize: size, color: '#7dd3fc' }} className="tn-wx-icon tn-wx-icon--wind" />
  const h = new Date().getHours()
  if (h >= 20 || h < 6)
    return <RiMoonLine style={{ fontSize: size, color: '#e2e8f0' }} className="tn-wx-icon tn-wx-icon--moon" />
  return <RiSunLine style={{ fontSize: size, color: '#fbbf24' }} className="tn-wx-icon tn-wx-icon--sun" />
}

// ─── Vibe ring SVG ────────────────────────────────────────────────────────────
function VibeRing({ score }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const { label, color } = vibeLabel(score)
  return (
    <div className="tn-vibe-ring-wrap">
      <svg width="110" height="110" viewBox="0 0 110 110" className="tn-vibe-svg">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#1e3a5f" strokeWidth="7" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
          className="tn-vibe-arc"
        />
      </svg>
      <div className="tn-vibe-inner">
        <span className="tn-vibe-score" style={{ color }}>{score}</span>
        <span className="tn-vibe-label" style={{ color }}>{label}</span>
      </div>
    </div>
  )
}

// ─── Live clock display ───────────────────────────────────────────────────────
function LiveClock({ time }) {
  const h = time.getHours()
  const m = String(time.getMinutes()).padStart(2, '0')
  const s = String(time.getSeconds()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = ((h % 12) || 12)
  const day  = time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  return (
    <div className="tn-clock">
      <span className="tn-clock-time">{h12}:{m}<span className="tn-clock-sec">:{s}</span></span>
      <span className="tn-clock-ampm">{ampm}</span>
      <span className="tn-clock-date">{day}</span>
    </div>
  )
}

// ─── Weather detail card ──────────────────────────────────────────────────────
function WeatherCard({ weather, trainCount }) {
  if (!weather) return (
    <div className="tn-tile tn-tile--wide tn-tile--weather">
      <div className="tn-tile-label"><RiSunLine /> WEATHER NOW</div>
      <p className="tn-missing">Add OPENWEATHER_KEY to enable</p>
    </div>
  )
  return (
    <div className="tn-tile tn-tile--wide tn-tile--weather">
      <div className="tn-tile-label"><RiSunLine /> WEATHER NOW — CHICAGO</div>
      <div className="tn-weather-body">
        <WeatherIcon description={weather.description} size={48} />
        <div className="tn-weather-temps">
          <span className="tn-temp">{weather.tempF}°</span>
          <span className="tn-desc">{weather.description}</span>
          <span className="tn-feels">Feels like {weather.feelsF}°F</span>
        </div>
        <div className="tn-weather-grid">
          <div className="tn-wx-stat">
            <RiWindyLine /><span>{weather.windMph} mph</span><small>wind</small>
          </div>
          <div className="tn-wx-stat">
            <RiDropLine /><span>{weather.humidity}%</span><small>humidity</small>
          </div>
          {weather.visibility != null && (
            <div className="tn-wx-stat">
              <RiEyeLine /><span>{weather.visibility} mi</span><small>visibility</small>
            </div>
          )}
          {trainCount != null && (
            <div className="tn-wx-stat">
              <RiSubwayLine /><span>{trainCount}</span><small>trains active</small>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Beach mini-card ──────────────────────────────────────────────────────────
function BeachCard({ beaches }) {
  if (!beaches?.length) return null
  return (
    <div className="tn-tile tn-tile--beaches">
      <div className="tn-tile-label"><RiMapPinLine /> LAKE MICHIGAN — BEACH CONDITIONS</div>
      <div className="tn-beach-grid">
        {beaches.map(b => (
          <div key={b.id || b.name} className="tn-beach-item">
            <div className="tn-beach-item-name">{b.name}</div>
            <div className="tn-beach-item-status" style={{ color: b.advisory?.color || '#64748b' }}>
              {b.advisory?.label || b.advisory?.status || '—'}
            </div>
            {b.weather && (
              <div className="tn-beach-item-temp">{b.weather.tempF}°F</div>
            )}
            {b.advisory?.score != null && (
              <div className="tn-beach-bar">
                <div className="tn-beach-fill" style={{ width: `${b.advisory.score}%`, background: b.advisory.color }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Events card ─────────────────────────────────────────────────────────────
const EVENT_TYPE_COLORS = {
  music:    '#8b5cf6',
  arts:     '#00d4ff',
  comedy:   '#eab308',
  film:     '#3b82f6',
  festival: '#f97316',
  family:   '#10b981',
  sports:   '#ef4444',
  other:    '#94a3b8',
}

function EventsCard({ events }) {
  const MAX = 5
  const list = events?.slice(0, MAX) || []
  return (
    <div className="tn-tile tn-tile--events">
      <div className="tn-tile-label"><RiCalendarEventLine /> TONIGHT'S EVENTS</div>
      {list.length > 0 ? (
        <div className="tn-event-list">
          {list.map((e, i) => (
            <a key={e.id || i} className="tn-event-row" href={e.url} target="_blank" rel="noreferrer">
              <span className="tn-event-dot" style={{ background: EVENT_TYPE_COLORS[e.type] || EVENT_TYPE_COLORS.other }} />
              <div className="tn-event-body">
                <span className="tn-event-name">{e.name}</span>
                <span className="tn-event-meta">{e.time} · {e.venue}</span>
              </div>
              <RiArrowRightLine className="tn-event-arrow" />
            </a>
          ))}
          {(events?.length || 0) > MAX && (
            <div className="tn-event-more">+{events.length - MAX} more tonight</div>
          )}
        </div>
      ) : (
        <p className="tn-missing">{events ? 'No events found tonight' : 'Add TICKETMASTER_KEY to enable'}</p>
      )}
    </div>
  )
}

// ─── Games card ───────────────────────────────────────────────────────────────
const TEAM_COLORS = {
  Bulls:     '#ce1141',
  Bears:     '#0b162a',
  Cubs:      '#0e3386',
  'White Sox': '#27251f',
  Blackhawks:'#cf0a2c',
}

function GamesCard({ games }) {
  return (
    <div className="tn-tile tn-tile--games">
      <div className="tn-tile-label"><RiFootballLine /> CHICAGO SPORTS TONIGHT</div>
      {games?.length > 0 ? (
        <div className="tn-game-list">
          {games.map((g, i) => {
            const teamColor = g.color || TEAM_COLORS[g.team] || '#64748b'
            const isLive    = g.state === 'in'
            const isFinal   = g.state === 'post'
            const chicagoWon = isFinal && g.chicagoScore != null && g.chicagoScore > g.oppScore
            const oppWon     = isFinal && g.oppScore     != null && g.oppScore     > g.chicagoScore
            return (
              <div key={i} className={`tn-game-row${isLive ? ' tn-game-row--live' : ''}`}>
                <div className="tn-game-color-bar" style={{ background: teamColor }} />
                <div className="tn-game-body">
                  <div className="tn-game-matchup">
                    <span className="tn-game-team" style={{ fontWeight: chicagoWon ? 700 : oppWon ? 400 : undefined, color: oppWon ? 'var(--text-muted)' : undefined }}>{g.team}</span>
                    <span className="tn-game-vs">vs</span>
                    <span className="tn-game-opp" style={{ fontWeight: oppWon ? 700 : undefined, color: oppWon ? 'var(--text)' : undefined }}>{g.opponent}</span>
                  </div>
                  <div className="tn-game-meta">
                    {isLive
                      ? <span className="tn-live-dot">LIVE</span>
                      : <span className="tn-game-time">{g.time}</span>
                    }
                    {g.venue && <span className="tn-game-venue">{g.venue}</span>}
                  </div>
                </div>
                {(isLive || isFinal) && g.chicagoScore != null && (
                  <div className="tn-game-score">
                    <span style={{ color: teamColor, fontWeight: chicagoWon ? 700 : undefined }}>{g.chicagoScore}</span>
                    <span className="tn-score-dash">–</span>
                    <span style={{ fontWeight: oppWon ? 700 : undefined }}>{g.oppScore}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="tn-missing">No Chicago games tonight</p>
      )}
    </div>
  )
}

// ─── Transit pulse card ────────────────────────────────────────────────────────
function TransitCard({ trainCount }) {
  const lines = [
    { id: 'Red',  label: 'Red Line',    color: '#ff0033' },
    { id: 'Blue', label: 'Blue Line',   color: '#3b82f6' },
    { id: 'Brn',  label: 'Brown Line',  color: '#92400e' },
    { id: 'G',    label: 'Green Line',  color: '#10b981' },
    { id: 'Org',  label: 'Orange Line', color: '#f97316' },
    { id: 'P',    label: 'Purple Line', color: '#8b5cf6' },
    { id: 'Pink', label: 'Pink Line',   color: '#ec4899' },
    { id: 'Y',    label: 'Yellow Line', color: '#eab308' },
  ]
  return (
    <div className="tn-tile tn-tile--transit">
      <div className="tn-tile-label"><RiSubwayLine /> CTA RAIL NETWORK</div>
      <div className="tn-transit-body">
        <div className="tn-transit-count">
          <span className="tn-transit-num">{trainCount ?? '—'}</span>
          <span className="tn-transit-sub">active trains</span>
        </div>
        <div className="tn-transit-lines">
          {lines.map(l => (
            <div key={l.id} className="tn-line-pill" style={{ background: l.color }}>
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Last updated badge ───────────────────────────────────────────────────────
function LastUpdated({ time }) {
  if (!time) return null
  const t = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
  return <span className="tn-updated">Updated {t}</span>
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TonightPage() {
  const midnightTick = useMidnightRefresh()
  const { data, loading, lastFetch, refresh } = useTonightData(midnightTick)
  const { trains } = useCTA()
  const time  = useClock()
  // Use live train count from shared CTA hook (same source as Home page)
  const trainCount = trains.length || data?.trainCount || null
  const score = calcVibeScore({ ...data, trainCount })

  return (
    <div className="tonight-page">
      {/* Header */}
      <div className="tonight-header">
        <div className="tonight-header-left">
          <h1 className="tonight-title">Tonight in Chicago</h1>
          <div className="tonight-header-meta">
            <RiWifiLine className="tn-live-badge-icon" />
            <span className="tn-live-badge">LIVE</span>
            <LastUpdated time={lastFetch} />
          </div>
        </div>
        <div className="tonight-header-right">
          <LiveClock time={time} />
          <button className="tonight-refresh" onClick={refresh} title="Refresh" disabled={loading}>
            <RiRefreshLine className={loading ? 'tn-spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Vibe score bar (shown once data loads) */}
      {score != null && (
        <div className="tn-vibe-bar">
          <VibeRing score={score} />
          <div className="tn-vibe-desc">
            <div className="tn-vibe-title">Tonight's Vibe Score</div>
            <div className="tn-vibe-factors">
              {data?.weather && <span><RiTempHotLine /> {data.weather.tempF}°F · {data.weather.description}</span>}
              {data?.events?.length > 0 && <span><RiCalendarEventLine /> {data.events.length} events</span>}
              {data?.games?.length > 0 && <span><RiFootballLine /> {data.games.length} game{data.games.length !== 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>
      )}

      {loading && <div className="tonight-loading"><span className="tn-spinner" /> Loading tonight's intel...</div>}

      {!loading && data && (
        <div className="tonight-grid">
          <WeatherCard weather={data.weather} trainCount={trainCount} />
          {data.beaches?.length > 0 && <BeachCard beaches={data.beaches} />}
          <EventsCard events={data.events} />
          <GamesCard games={data.games} />
          <TransitCard trainCount={trainCount} />
        </div>
      )}
    </div>
  )
}
