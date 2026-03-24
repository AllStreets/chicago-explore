// frontend/src/hooks/useWeather.js
import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function useWeather() {
  const [weather, setWeather] = useState(null)
  const [lake, setLake] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/weather`).then(r => r.json()),
      fetch(`${API}/api/lake`).then(r => r.json()),
    ])
      .then(([w, l]) => { setWeather(w); setLake(l) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { weather, lake, loading }
}
