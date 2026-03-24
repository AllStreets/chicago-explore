// frontend/src/hooks/useYelp.js
import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function useYelp(params = {}) {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined))
    ).toString()
    fetch(`${API}/api/places?${qs}`)
      .then(r => r.json())
      .then(d => setPlaces(d.places || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [JSON.stringify(params)])

  return { places, loading }
}
