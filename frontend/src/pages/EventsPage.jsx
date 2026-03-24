import { useEffect, useState } from 'react'
import { RiCalendarEventLine, RiMapPinLine, RiPriceTag3Line, RiFilterLine } from 'react-icons/ri'
import './EventsPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const TYPE_COLORS = {
  music: '#8b5cf6', festival: '#f97316', art: '#00d4ff',
  comedy: '#eab308', market: '#10b981', film: '#3b82f6',
  sports: '#ef4444', event: '#64748b',
}

function useEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/api/events`)
      .then(r => r.json())
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  return { events, loading }
}

function formatEventDate(dateStr) {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function EventsPage() {
  const { events, loading } = useEvents()
  const [typeFilter, setTypeFilter] = useState('all')

  const types = ['all', ...new Set(events.map(e => e.type).filter(Boolean))]
  const filtered = typeFilter === 'all' ? events : events.filter(e => e.type === typeFilter)

  return (
    <div className="events-page">
      <div className="events-header">
        <span className="events-title">Events</span>
        <div className="events-filters">
          <RiFilterLine className="events-filter-icon" />
          {types.map(t => (
            <button
              key={t}
              className={`events-filter-btn${typeFilter === t ? ' active' : ''}`}
              style={{ '--type-color': TYPE_COLORS[t] || '#64748b' }}
              onClick={() => setTypeFilter(t)}
            >{t}</button>
          ))}
        </div>
      </div>

      {loading && <div className="events-loading">Loading events...</div>}

      <div className="events-list">
        {filtered.map(event => (
          <div key={event.id} className="event-card" style={{ '--type-color': TYPE_COLORS[event.type] || '#64748b' }}>
            <div className="event-type-tag">{event.type}</div>
            <div className="event-name">{event.name}</div>
            <div className="event-meta">
              <span className="event-date">
                <RiCalendarEventLine />
                {formatEventDate(event.date)}
              </span>
              {event.venue && (
                <span className="event-venue">
                  <RiMapPinLine />
                  {event.venue}
                  {event.neighborhood && event.neighborhood !== event.venue && ` · ${event.neighborhood}`}
                </span>
              )}
              {event.price && (
                <span className="event-price">
                  <RiPriceTag3Line />
                  {event.price}
                </span>
              )}
            </div>
            {event.url && (
              <a href={event.url} target="_blank" rel="noopener noreferrer" className="event-link">
                View tickets
              </a>
            )}
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="events-empty">No events found for this filter.</div>
        )}
      </div>
    </div>
  )
}
