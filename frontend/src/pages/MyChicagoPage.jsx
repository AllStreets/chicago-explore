import { useEffect, useState, useCallback } from 'react'
import { RiHeartFill, RiHeartLine, RiCheckboxCircleLine, RiDeleteBinLine } from 'react-icons/ri'
import './MyChicagoPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getUserId() {
  let id = localStorage.getItem('chicago_user_id')
  if (!id) {
    id = 'user_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    localStorage.setItem('chicago_user_id', id)
  }
  return id
}

function useMe() {
  const [me, setMe] = useState({ favorites: [], visited: [] })
  const [loading, setLoading] = useState(true)
  const userId = getUserId()

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/me`, { headers: { 'X-User-ID': userId } })
      const data = await res.json()
      setMe(data)
    } catch { /* graceful */ }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { load() }, [load])

  async function deleteFavorite(placeId) {
    await fetch(`${API}/api/me/favorites/${placeId}`, { method: 'DELETE', headers: { 'X-User-ID': userId } })
    load()
  }

  async function deleteVisited(placeId) {
    await fetch(`${API}/api/me/visited/${placeId}`, { method: 'DELETE', headers: { 'X-User-ID': userId } })
    load()
  }

  return { me, loading, deleteFavorite, deleteVisited, userId }
}

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function MyChicagoPage() {
  const { me, loading, deleteFavorite, deleteVisited, userId } = useMe()
  const [tab, setTab] = useState('favorites')

  return (
    <div className="mychicago-page">
      <div className="mychicago-header">
        <span className="mychicago-title">My Chicago</span>
      </div>

      <div className="mychicago-stats">
        <div className="mc-stat">
          <span className="mc-stat-num">{me.favorites?.length ?? 0}</span>
          <span className="mc-stat-label">Favorites</span>
        </div>
        <div className="mc-stat">
          <span className="mc-stat-num">{me.visited?.length ?? 0}</span>
          <span className="mc-stat-label">Been There</span>
        </div>
      </div>

      <div className="mychicago-tabs">
        <button
          className={`mc-tab${tab === 'favorites' ? ' active' : ''}`}
          onClick={() => setTab('favorites')}
        >
          <RiHeartFill />
          Favorites
        </button>
        <button
          className={`mc-tab${tab === 'visited' ? ' active' : ''}`}
          onClick={() => setTab('visited')}
        >
          <RiCheckboxCircleLine />
          Been There
        </button>
      </div>

      {loading && <div className="mc-loading">Loading your Chicago...</div>}

      {!loading && tab === 'favorites' && (
        <div className="mc-list">
          {me.favorites?.length === 0 && (
            <div className="mc-empty">No favorites yet — heart places on Food, Nightlife, or Explore pages</div>
          )}
          {me.favorites?.map(f => (
            <div key={f.id} className="mc-item">
              <RiHeartFill className="mc-item-icon mc-item-icon--heart" />
              <div className="mc-item-info">
                <div className="mc-item-name">{f.place_name}</div>
                <div className="mc-item-date">Saved {formatDate(f.added_at)}</div>
              </div>
              <button className="mc-delete-btn" onClick={() => deleteFavorite(f.place_id)} title="Remove">
                <RiDeleteBinLine />
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'visited' && (
        <div className="mc-list">
          {me.visited?.length === 0 && (
            <div className="mc-empty">No places checked in yet — mark places as "Been there" on Food, Nightlife, or Explore pages</div>
          )}
          {me.visited?.map(v => (
            <div key={v.id} className="mc-item">
              <RiCheckboxCircleLine className="mc-item-icon mc-item-icon--visited" />
              <div className="mc-item-info">
                <div className="mc-item-name">{v.place_name}</div>
                <div className="mc-item-date">Visited {formatDate(v.visited_at)}</div>
              </div>
              <button className="mc-delete-btn" onClick={() => deleteVisited(v.place_id)} title="Remove">
                <RiDeleteBinLine />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
