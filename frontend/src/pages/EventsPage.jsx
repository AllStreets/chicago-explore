import { useEffect, useState } from 'react'
import {
  RiCalendarEventLine, RiMapPinLine, RiPriceTag3Line,
  RiMusicLine, RiPaletteLine, RiEmotionLaughLine,
  RiTrophyLine, RiFilmLine, RiGroupLine, RiStarLine, RiGridLine,
} from 'react-icons/ri'
import useMidnightRefresh from '../hooks/useMidnightRefresh'
import './EventsPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const CATEGORIES = [
  { key: 'all',      label: 'All',      color: '#64748b', Icon: RiCalendarEventLine },
  { key: 'music',    label: 'Music',    color: '#8b5cf6', Icon: RiMusicLine         },
  { key: 'arts',     label: 'Arts',     color: '#00d4ff', Icon: RiPaletteLine       },
  { key: 'comedy',   label: 'Comedy',   color: '#eab308', Icon: RiEmotionLaughLine  },
  { key: 'film',     label: 'Film',     color: '#3b82f6', Icon: RiFilmLine          },
  { key: 'festival', label: 'Festival', color: '#f97316', Icon: RiStarLine          },
  { key: 'family',   label: 'Family',   color: '#10b981', Icon: RiGroupLine         },
  { key: 'sports',   label: 'Sports',   color: '#ef4444', Icon: RiTrophyLine        },
  { key: 'other',    label: 'Other',    color: '#94a3b8', Icon: RiGridLine          },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

function getCategory(type) {
  return CAT_MAP[type] || CAT_MAP.other
}

function useEvents(midnightTick) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/api/events`)
      .then(r => r.json())
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [midnightTick])

  return { events, loading }
}

function formatEventDate(dateStr) {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function EventsPage() {
  const midnightTick = useMidnightRefresh()
  const { events, loading } = useEvents(midnightTick)
  const [active, setActive] = useState('all')

  // Only show filter tabs that have events (plus All)
  const present = new Set(events.map(e => e.type))
  const visibleCats = CATEGORIES.filter(c => c.key === 'all' || present.has(c.key))

  const filtered = active === 'all' ? events : events.filter(e => e.type === active)

  return (
    <div className="events-page">
      <div className="events-header">
        <span className="events-title">Events</span>
        <div className="events-filters">
          {visibleCats.map(c => (
            <button
              key={c.key}
              className={`events-filter-btn${active === c.key ? ' active' : ''}`}
              style={{ '--cat-color': c.color }}
              onClick={() => setActive(c.key)}
            >
              <c.Icon className="events-filter-icon" />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="events-loading">Loading events...</div>}

      <div className="events-grid">
        {filtered.map(event => {
          const cat = getCategory(event.type)
          return (
            <div key={event.id} className="event-card" style={{ '--cat-color': cat.color }}>
              <div className="event-cat-row">
                <cat.Icon className="event-cat-icon" />
                <span className="event-type-tag">{cat.label}</span>
              </div>
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
                    {event.neighborhood && event.neighborhood !== event.venue && event.neighborhood !== 'Chicago'
                      ? ` · ${event.neighborhood}` : ''}
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
                  View tickets →
                </a>
              )}
            </div>
          )
        })}
        {!loading && filtered.length === 0 && (
          <div className="events-empty">No {active === 'all' ? '' : active + ' '}events found.</div>
        )}
      </div>
    </div>
  )
}
