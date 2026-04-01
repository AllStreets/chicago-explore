import { useEffect, useState } from 'react'
import {
  RiNewspaperLine,
  RiGlobalLine,
  RiMapPinLine,
  RiExternalLinkLine,
  RiRefreshLine,
} from 'react-icons/ri'
import './PoliticsPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const SOURCE_COLORS = {
  'Chicago Tribune': '#e63946',
  'WBEZ': '#00d4ff',
  'AP': '#ff6b35',
  'Reuters': '#f97316',
}

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks}w ago`
}

function useNews() {
  const [data, setData] = useState({ chicago: [], national: [], world: [] })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  async function fetchNews() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/news`)
      const json = await res.json()
      setData(json)
      setLastUpdated(new Date())
    } catch {
      setData({ chicago: [], national: [], world: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
  }, [])

  return { data, loading, lastUpdated, refresh: fetchNews }
}

function NewsCard({ article }) {
  const color = SOURCE_COLORS[article.source] || '#64748b'
  const time = relativeTime(article.pubDate)

  return (
    <div className="pol-card">
      <div className="pol-card-meta">
        <span
          className="pol-source-badge"
          style={{ '--badge-color': color }}
        >
          {article.source}
        </span>
        {time && <span className="pol-time">{time}</span>}
      </div>
      <div className="pol-card-title">{article.title}</div>
      {article.description && (
        <div className="pol-card-desc">{article.description}</div>
      )}
      {article.link && (
        <a
          href={article.link}
          target="_blank"
          rel="noreferrer"
          className="pol-card-link"
        >
          <RiExternalLinkLine /> READ MORE
        </a>
      )}
    </div>
  )
}

function SkeletonCards() {
  return (
    <div className="pol-skeleton">
      {[0, 1, 2].map((i) => (
        <div key={i} className="pol-card pol-skeleton-card">
          <div className="pol-skel-line pol-skel-short" />
          <div className="pol-skel-line pol-skel-title" />
          <div className="pol-skel-line pol-skel-desc" />
          <div className="pol-skel-line pol-skel-desc pol-skel-desc-narrow" />
        </div>
      ))}
    </div>
  )
}

const TABS = [
  { key: 'chicago', label: 'Chicago', icon: RiMapPinLine },
  { key: 'national', label: 'National', icon: RiNewspaperLine },
  { key: 'world', label: 'World', icon: RiGlobalLine },
]

export default function PoliticsPage() {
  const [activeTab, setActiveTab] = useState('chicago')
  const { data, loading, lastUpdated, refresh } = useNews()

  const articles = data[activeTab] || []

  return (
    <div className="pol-page">
      <div className="pol-header">
        <span className="pol-title">CHICAGO NEWS WIRE</span>
        <div className="pol-header-controls">
          <button className="pol-refresh" onClick={refresh} title="Refresh">
            <RiRefreshLine />
          </button>
          {lastUpdated && (
            <span className="pol-timestamp">
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div className="pol-tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`pol-tab${activeTab === key ? ' pol-tab--active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon className="pol-tab-icon" />
            {label}
          </button>
        ))}
      </div>

      <div className="pol-feed">
        {loading ? (
          <SkeletonCards />
        ) : articles.length === 0 ? (
          <div className="pol-empty">
            <RiNewspaperLine className="pol-empty-icon" />
            <span>No stories available</span>
          </div>
        ) : (
          articles.map((article, i) => (
            <NewsCard key={`${article.link || article.title}-${i}`} article={article} />
          ))
        )}
      </div>
    </div>
  )
}
