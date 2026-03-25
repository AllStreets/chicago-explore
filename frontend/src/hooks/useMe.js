// frontend/src/hooks/useMe.js
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function getUserId() {
  let id = localStorage.getItem('chicago_user_id')
  if (!id) {
    id = 'user_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
    localStorage.setItem('chicago_user_id', id)
  }
  return id
}

export async function addFavorite(place) {
  const userId = getUserId()
  try {
    await fetch(`${API}/api/me/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
      body: JSON.stringify({ place_id: place.id, place_name: place.name, lat: place.lat, lon: place.lon })
    })
  } catch { /* silently fail */ }
}

export async function removeFavorite(placeId) {
  const userId = getUserId()
  try {
    await fetch(`${API}/api/me/favorites/${encodeURIComponent(placeId)}`, {
      method: 'DELETE',
      headers: { 'X-User-ID': userId }
    })
  } catch { /* silently fail */ }
}

export async function addVisited(place) {
  const userId = getUserId()
  try {
    await fetch(`${API}/api/me/visited`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
      body: JSON.stringify({ place_id: place.id, place_name: place.name })
    })
  } catch { /* silently fail */ }
}

export async function removeVisited(placeId) {
  const userId = getUserId()
  try {
    await fetch(`${API}/api/me/visited/${encodeURIComponent(placeId)}`, {
      method: 'DELETE',
      headers: { 'X-User-ID': userId }
    })
  } catch { /* silently fail */ }
}
