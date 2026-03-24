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
  // place: { id, name, lat, lon }
  const userId = getUserId()
  try {
    await fetch(`${API}/api/me/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
      body: JSON.stringify({ place_id: place.id, place_name: place.name, lat: place.lat, lon: place.lon })
    })
  } catch { /* silently fail */ }
}

export async function addVisited(place) {
  // place: { id, name }
  const userId = getUserId()
  try {
    await fetch(`${API}/api/me/visited`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-ID': userId },
      body: JSON.stringify({ place_id: place.id, place_name: place.name })
    })
  } catch { /* silently fail */ }
}
