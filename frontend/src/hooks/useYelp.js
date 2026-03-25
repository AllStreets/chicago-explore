// frontend/src/hooks/useYelp.js
import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Module-level cache — survives re-renders and navigation within the same session
const _cache = new Map()

export function prewarm(types) {
  for (const type of types) {
    if (_cache.has(type)) continue
    fetch(`${API}/api/places?type=${type}`)
      .then(r => r.json())
      .then(d => { if (d.places?.length > 0) _cache.set(type, d.places) })
      .catch(() => {})
  }
}

export default function useYelp(params = {}) {
  const type = params.type || 'restaurants'
  const [places, setPlaces] = useState(_cache.get(type) || [])
  const [loading, setLoading] = useState(!_cache.has(type))

  useEffect(() => {
    if (_cache.has(type)) {
      setPlaces(_cache.get(type))
      setLoading(false)
      return
    }
    setLoading(true)
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
    ).toString()
    fetch(`${API}/api/places?${qs}`)
      .then(r => r.json())
      .then(d => {
        const list = d.places || []
        if (list.length > 0) _cache.set(type, list)
        setPlaces(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [type])

  return { places, loading }
}
