// frontend/src/hooks/useHomeFeed.js
import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function useHomeFeed() {
  const [feed, setFeed] = useState({ trainCount: null, weather: null, nextEvent: null, tonightGames: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${API}/api/home-feed`)
        if (!res.ok) throw new Error('feed failed')
        const data = await res.json()
        if (!cancelled) setFeed(data)
      } catch {
        // silently fail — homepage still works without feed
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return { feed, loading }
}
