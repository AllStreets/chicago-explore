import { useEffect, useState, useCallback } from 'react'
import { RiHeartFill, RiCheckboxCircleLine, RiDeleteBinLine, RiPencilLine, RiFileTextLine, RiRouteLine } from 'react-icons/ri'
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

  async function saveNote(placeId, notes) {
    await fetch(`${API}/api/me/visited/${placeId}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
      body: JSON.stringify({ notes }),
    })
    load()
  }

  return { me, loading, deleteFavorite, deleteVisited, saveNote }
}

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function MyChicagoPage() {
  const { me, loading, deleteFavorite, deleteVisited, saveNote } = useMe()
  const [tab, setTab] = useState('favorites')
  const [noteModal, setNoteModal] = useState(null)   // { placeId, placeName, text }
  const [viewModal, setViewModal] = useState(null)   // { placeName, notes }
  const [noteDraft, setNoteDraft] = useState('')
  const [plan, setPlan] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chicago_day_plan') || '[]') }
    catch { return [] }
  })

  function savePlan(newPlan) {
    setPlan(newPlan)
    localStorage.setItem('chicago_day_plan', JSON.stringify(newPlan))
  }

  function addToPlan(place) {
    if (plan.find(p => p.id === place.place_id)) return
    savePlan([...plan, { id: place.place_id, name: place.place_name }])
  }

  function removeFromPlan(id) {
    savePlan(plan.filter(p => p.id !== id))
  }

  function movePlan(i, dir) {
    const next = [...plan]
    const swap = i + dir
    if (swap < 0 || swap >= next.length) return
    ;[next[i], next[swap]] = [next[swap], next[i]]
    savePlan(next)
  }

  function openWriteNote(v) {
    setNoteDraft(v.notes || '')
    setNoteModal({ placeId: v.place_id, placeName: v.place_name })
  }

  function openViewNote(v) {
    setViewModal({ placeName: v.place_name, notes: v.notes || '' })
  }

  async function handleSaveNote() {
    await saveNote(noteModal.placeId, noteDraft)
    setNoteModal(null)
  }

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
        <button className={`mc-tab${tab === 'favorites' ? ' active' : ''}`} onClick={() => setTab('favorites')}>
          <RiHeartFill /> Favorites
        </button>
        <button className={`mc-tab${tab === 'visited' ? ' active' : ''}`} onClick={() => setTab('visited')}>
          <RiCheckboxCircleLine /> Been There
        </button>
        <button className={`mc-tab${tab === 'plan' ? ' active' : ''}`} onClick={() => setTab('plan')}>
          <RiRouteLine /> Day Plan
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
              <button
                className={`mc-note-view-btn${v.notes ? ' has-notes' : ''}`}
                onClick={() => openViewNote(v)}
                title={v.notes ? 'View notes' : 'No notes yet'}
              >
                <RiFileTextLine />
              </button>
              <button className="mc-note-edit-btn" onClick={() => openWriteNote(v)} title="Write a note">
                <RiPencilLine />
              </button>
              <button className="mc-delete-btn" onClick={() => deleteVisited(v.place_id)} title="Remove">
                <RiDeleteBinLine />
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'plan' && (
        <div className="mc-plan">
          <div className="mc-plan-hint">Add stops from your Favorites to build a day plan</div>

          {me.favorites?.length > 0 && (
            <div className="mc-plan-fav-list">
              {me.favorites.map(f => (
                <button
                  key={f.id}
                  className="mc-plan-add-btn"
                  onClick={() => addToPlan(f)}
                  disabled={!!plan.find(p => p.id === f.place_id)}
                >
                  + {f.place_name}
                </button>
              ))}
            </div>
          )}

          {plan.length > 0 && (
            <div className="mc-plan-list">
              {plan.map((stop, i) => (
                <div key={stop.id} className="mc-plan-stop">
                  <span className="mc-plan-num">{i + 1}</span>
                  <span className="mc-plan-name">{stop.name}</span>
                  <div className="mc-plan-actions">
                    <button onClick={() => movePlan(i, -1)} disabled={i === 0}>↑</button>
                    <button onClick={() => movePlan(i,  1)} disabled={i === plan.length - 1}>↓</button>
                    <button onClick={() => removeFromPlan(stop.id)}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {plan.length === 0 && me.favorites?.length === 0 && (
            <div className="mc-empty">Save favorites first, then build your day plan here</div>
          )}
          {plan.length === 0 && me.favorites?.length > 0 && (
            <div className="mc-empty">Click a favorite above to add it to your plan</div>
          )}
        </div>
      )}

      {/* Write note modal */}
      {noteModal && (
        <div className="mc-modal-overlay" onClick={() => setNoteModal(null)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <div className="mc-modal-title">
              <RiPencilLine />
              {noteModal.placeName}
            </div>
            <textarea
              className="mc-note-textarea"
              placeholder="Write your notes about this place…"
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
              autoFocus
              rows={5}
            />
            <div className="mc-modal-actions">
              <button className="mc-modal-cancel" onClick={() => setNoteModal(null)}>Cancel</button>
              <button className="mc-modal-save" onClick={handleSaveNote}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* View note modal */}
      {viewModal && (
        <div className="mc-modal-overlay" onClick={() => setViewModal(null)}>
          <div className="mc-modal" onClick={e => e.stopPropagation()}>
            <div className="mc-modal-title">
              <RiFileTextLine />
              {viewModal.placeName}
            </div>
            {viewModal.notes
              ? <p className="mc-note-body">{viewModal.notes}</p>
              : <p className="mc-note-empty">No notes yet — click the pencil icon to add one.</p>
            }
            <div className="mc-modal-actions">
              <button className="mc-modal-save" onClick={() => setViewModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
