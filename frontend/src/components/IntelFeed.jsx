import './IntelFeed.css'

const LINE_COLORS = {
  Red: '#ef4444', Blue: '#3b82f6', Brn: '#92400e',
  G: '#10b981', Org: '#f97316', P: '#8b5cf6',
  Pink: '#ec4899', Y: '#eab308',
}

function arrivalMins(arrTime) {
  if (!arrTime) return '?'
  // CTA format: '20260323 14:02:00'
  const year  = arrTime.slice(0, 4)
  const month = arrTime.slice(4, 6)
  const day   = arrTime.slice(6, 8)
  const time  = arrTime.slice(9)
  const t = new Date(`${year}-${month}-${day}T${time}`)
  const diff = Math.round((t - Date.now()) / 60000)
  return diff <= 0 ? 'Due' : `${diff} min`
}

export default function IntelFeed({ weather, lake, trains = [] }) {
  const nearbyTrains = trains.slice(0, 4)

  return (
    <aside className="intel-feed">
      <div className="intel-feed-header">
        <span className="intel-feed-title">LIVE INTEL</span>
        <span className="intel-feed-sub">Streeterville</span>
      </div>

      {weather && (
        <div className="intel-card">
          <div className="intel-card-label">WEATHER</div>
          <div className="intel-card-value">{weather.temp}°C</div>
          <div className="intel-card-sub">{weather.description} · Wind {weather.wind?.speed} m/s</div>
          {lake && <div className="intel-card-badge">{lake.niceLabel}</div>}
        </div>
      )}

      <div className="intel-card-label" style={{ marginTop: 12 }}>CTA NEARBY</div>
      {nearbyTrains.length === 0 && (
        <div className="intel-card-sub" style={{ padding: '8px 0' }}>Loading trains...</div>
      )}
      {nearbyTrains.map(t => (
        <div key={t.rn} className="intel-card intel-card--train">
          <span className="intel-train-dot" style={{ background: LINE_COLORS[t.line] || '#00d4ff' }} />
          <div className="intel-train-info">
            <span className="intel-train-line">{t.line} Line</span>
            <span className="intel-train-station">{t.nextStation}</span>
          </div>
          <span className="intel-train-time">{arrivalMins(t.arrTime)}</span>
        </div>
      ))}
    </aside>
  )
}
