import { useEffect, useState, useCallback } from 'react'
import { RiHeartLine, RiHeartFill, RiCheckboxCircleLine, RiListCheck2, RiDeleteBinLine, RiAddLine } from 'react-icons/ri'
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
  const [me, setMe] = useState({ favorites: [], visited: [], bucket: [] })
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

  async function deleteBucket(id) {
    await fetch(`${API}/api/me/bucket/${id}`, { method: 'DELETE', headers: { 'X-User-ID': userId } })
    load()
  }

  async function addBucket(name) {
    await fetch(`${API}/api/me/bucket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
      body: JSON.stringify({ item_name: name, item_type: 'experience' })
    })
    load()
  }

  return { me, loading, deleteFavorite, deleteBucket, addBucket, userId }
}

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function MyChicagoPage() {
  const { me, loading, deleteFavorite, deleteBucket, addBucket, userId } = useMe()
  const [newItem, setNewItem] = useState('')
  const [tab, setTab] = useState('favorites')

  async function handleAddBucket(e) {
    e.preventDefault()
    if (!newItem.trim()) return
    await addBucket(newItem.trim())
    setNewItem('')
  }

  return (
    <div className="mychicago-page">
      <div className="mychicago-header">
        <span className="mychicago-title">My Chicago</span>
        <span className="mychicago-uid">ID: {userId.slice(0, 12)}</span>
      </div>

      <div className="mychicago-stats">
        <div className="mc-stat">
          <span className="mc-stat-num">{me.favorites?.length ?? 0}</span>
          <span className="mc-stat-label">Favorites</span>
        </div>
        <div className="mc-stat">
          <span className="mc-stat-num">{me.visited?.length ?? 0}</span>
          <span className="mc-stat-label">Visited</span>
        </div>
        <div className="mc-stat">
          <span className="mc-stat-num">{me.bucket?.length ?? 0}</span>
          <span className="mc-stat-label">Bucket list</span>
        </div>
      </div>

      <div className="mychicago-tabs">
        {['favorites', 'visited', 'bucket'].map(t => (
          <button
            key={t}
            className={`mc-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'favorites' && <RiHeartFill />}
            {t === 'visited'   && <RiCheckboxCircleLine />}
            {t === 'bucket'    && <RiListCheck2 />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div className="mc-loading">Loading your Chicago...</div>}

      {!loading && tab === 'favorites' && (
        <div className="mc-list">
          {me.favorites?.length === 0 && (
            <div className="mc-empty">No favorites yet — heart places from the Food page</div>
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
            <div className="mc-empty">No places checked in yet</div>
          )}
          {me.visited?.map(v => (
            <div key={v.id} className="mc-item">
              <RiCheckboxCircleLine className="mc-item-icon mc-item-icon--visited" />
              <div className="mc-item-info">
                <div className="mc-item-name">{v.place_name}</div>
                <div className="mc-item-date">Visited {formatDate(v.visited_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'bucket' && (
        <div className="mc-list">
          <form className="mc-add-form" onSubmit={handleAddBucket}>
            <input
              className="mc-add-input"
              placeholder="Add to bucket list..."
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
            />
            <button type="submit" className="mc-add-btn">
              <RiAddLine /> Add
            </button>
          </form>
          {me.bucket?.length === 0 && (
            <div className="mc-empty">Nothing on the bucket list yet</div>
          )}
          {me.bucket?.map(b => (
            <div key={b.id} className="mc-item">
              <RiListCheck2 className="mc-item-icon mc-item-icon--bucket" />
              <div className="mc-item-info">
                <div className="mc-item-name">{b.item_name}</div>
                <div className="mc-item-date">Added {formatDate(b.added_at)}</div>
              </div>
              <button className="mc-delete-btn" onClick={() => deleteBucket(b.id)} title="Remove">
                <RiDeleteBinLine />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
