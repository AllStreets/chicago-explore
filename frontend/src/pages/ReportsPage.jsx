// frontend/src/pages/ReportsPage.jsx
import { useState, useEffect } from 'react'
import { RiAlertLine, RiRefreshLine } from 'react-icons/ri'
import './ReportsPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const TYPE_LABELS = {
  'Graffiti Removal': 'Graffiti', 'Pothole in Street': 'Pothole',
  'Street Light Out': 'Street Light', 'Garbage Cart Maintenance': 'Garbage',
  'Tree Trim': 'Tree', 'Rodent Baiting': 'Rodents',
}

function use311() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/311`)
      const d = await r.json()
      setReports(d.reports || [])
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  return { reports, loading, refresh: load }
}

function formatDate(s) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ReportsPage() {
  const { reports, loading, refresh } = use311()
  const [filter, setFilter] = useState('All')

  const types = ['All', ...new Set(reports.map(r => TYPE_LABELS[r.type] || r.type))]
  const filtered = filter === 'All' ? reports : reports.filter(r => (TYPE_LABELS[r.type] || r.type) === filter)

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1 className="reports-title">Chicago 311</h1>
          <p className="reports-sub">Recent service requests near downtown — public data, no account needed</p>
        </div>
        <button className="reports-refresh" onClick={refresh}><RiRefreshLine /></button>
      </div>

      <div className="reports-filters">
        {types.map(t => (
          <button
            key={t}
            className={`reports-filter${filter === t ? ' active' : ''}`}
            onClick={() => setFilter(t)}
          >{t}</button>
        ))}
      </div>

      {loading && <div className="reports-loading">Loading 311 reports...</div>}

      {!loading && (
        <div className="reports-list">
          {filtered.length === 0 && <div className="reports-empty">No reports found</div>}
          {filtered.map(r => (
            <div key={r.id} className="report-row">
              <span className="report-dot" style={{ background: r.color }} />
              <div className="report-info">
                <div className="report-type">{TYPE_LABELS[r.type] || r.type}</div>
                <div className="report-addr">{r.address || 'Location unavailable'}</div>
              </div>
              <div className="report-meta">
                <span className={`report-status report-status--${r.status.toLowerCase().replace(/\s/g, '-')}`}>
                  {r.status}
                </span>
                <span className="report-date">{formatDate(r.created)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <a
        className="reports-file-link"
        href="https://311.chicago.gov"
        target="_blank"
        rel="noreferrer"
      >
        <RiAlertLine /> File a 311 report at chicago.gov/311
      </a>
    </div>
  )
}
