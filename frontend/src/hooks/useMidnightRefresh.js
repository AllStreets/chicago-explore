import { useEffect, useState } from 'react'

// Returns a tick counter that increments once at midnight Chicago time.
// Use as a useEffect dependency to auto-refresh data at the day boundary.
export default function useMidnightRefresh() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let id

    function schedule() {
      const now = new Date()
      // Next midnight in local time
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      const msUntil = midnight - now

      id = setTimeout(() => {
        setTick(t => t + 1)
        schedule() // reschedule for the following midnight
      }, msUntil)
    }

    schedule()
    return () => clearTimeout(id)
  }, [])

  return tick
}
