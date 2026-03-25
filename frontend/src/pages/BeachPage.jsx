// frontend/src/pages/BeachPage.jsx
import { useState, useEffect } from 'react'
import { RiDropLine, RiWindyLine, RiTempHotLine, RiRefreshLine } from 'react-icons/ri'
import './BeachPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function useBeach() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  async function load() {
    setLoading(true)
    try { const r = await fetch(`${API}/api/beach`); setData(await r.json()) }
    catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  return { data, loading, refresh: load }
}

export default function BeachPage() {
  const { data, loading, refresh } = useBeach()

  return (
    <div className="beach-page">
      <div className="beach-header">
        <div>
          <h1 className="beach-title">Lake Michigan Beaches</h1>
          <p className="beach-sub">Real-time conditions at Chicago's public beaches</p>
        </div>
        <button className="beach-refresh" onClick={refresh}><RiRefreshLine /></button>
      </div>

      {data?.keyMissing && (
        <div className="beach-missing">Add <code>OPENWEATHER_KEY</code> to backend .env to enable live conditions</div>
      )}

      {loading && <div className="beach-loading">Loading beach conditions...</div>}

      {!loading && data?.beaches && (
        <div className="beach-grid">
          {data.beaches.map(b => (
            <div key={b.id} className="beach-card">
              <div className="beach-card-header">
                <div>
                  <div className="beach-name">{b.name}</div>
                  <div className="beach-desc">{b.description}</div>
                </div>
                <div className="beach-advisory" style={{ color: b.advisory.color }}>
                  {b.advisory.label}
                </div>
              </div>

              {b.weather && (
                <div className="beach-stats">
                  <div className="beach-stat">
                    <RiTempHotLine />
                    <span>{b.weather.tempF}°F</span>
                    <label>Air Temp</label>
                  </div>
                  <div className="beach-stat">
                    <RiWindyLine />
                    <span>{b.weather.windMph} mph</span>
                    <label>Wind</label>
                  </div>
                  <div className="beach-stat">
                    <RiDropLine />
                    <span>{b.weather.humidity}%</span>
                    <label>Humidity</label>
                  </div>
                </div>
              )}

              {b.advisory.score != null && (
                <div className="beach-score-bar">
                  <div className="beach-score-fill" style={{ width: `${b.advisory.score}%`, background: b.advisory.color }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
