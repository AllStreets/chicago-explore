// frontend/src/hooks/useCTA.js
import { useState, useEffect, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const POLL_MS = 30_000

export default function useCTA() {
  const [trains, setTrains] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  async function fetchTrains() {
    try {
      const r = await fetch(`${API}/api/cta/trains`)
      const d = await r.json()
      setTrains(d.trains || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrains()
    timerRef.current = setInterval(fetchTrains, POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [])

  return { trains, loading, error }
}
