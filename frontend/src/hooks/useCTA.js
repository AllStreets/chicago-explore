// frontend/src/hooks/useCTA.js
import { useState, useEffect, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const POLL_MS = 15_000  // 15s for more live feel

let _cachedTrains = []
let _lastFetch = 0

export default function useCTA() {
  const [trains, setTrains] = useState(_cachedTrains)
  const [loading, setLoading] = useState(_cachedTrains.length === 0)
  const timerRef = useRef(null)

  async function fetchTrains() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/cta/trains`)
      const d = await r.json()
      const list = d.trains || []
      _cachedTrains = list
      _lastFetch = Date.now()
      setTrains(list)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (Date.now() - _lastFetch < 12_000 && _cachedTrains.length > 0) {
      setLoading(false)
    } else {
      fetchTrains()
    }
    timerRef.current = setInterval(fetchTrains, POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [])

  return { trains, loading, refresh: fetchTrains }
}
