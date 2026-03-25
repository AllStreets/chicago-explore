# Chicago Explore — All Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 10 features across two phases — Phase 1 uses only existing API keys/data; Phase 2 requires new external credentials — with graceful degradation throughout so the app works at any level of key availability.

**Architecture:** Each feature is an independent vertical slice (backend route + frontend page/component). All new backend routes check for required env vars and return a structured `{ error, fallback }` response when keys are missing; all frontend components render a disabled/placeholder state when data is absent. No feature blocks another from shipping.

**Tech Stack:** Express 5, better-sqlite3, React 19, React Router v7, Mapbox GL JS, react-icons/ri, Vite. All existing patterns (Space Grotesk UI font, JetBrains Mono numbers, `#060b18` bg, `#00d4ff` accent, no emojis) must be followed.

---

## Codebase Orientation

```
backend/
  routes/           ← one file per API domain
  db.js             ← SQLite setup + safe migrations
  server.js         ← route registration (add new routes here)

frontend/src/
  pages/            ← one .jsx + .css per page
  components/       ← shared UI (Sidebar, IntelFeed, MapPlaceholder)
  hooks/            ← data fetching hooks
  App.jsx           ← React Router routes
  components/Sidebar.jsx ← NAV array drives sidebar links
```

**Adding a new page always requires edits to:**
1. `frontend/src/App.jsx` — add `import` + `<Route>`
2. `frontend/src/components/Sidebar.jsx` — add entry to `NAV` array
3. `backend/server.js` — `app.use('/api/...', require('./routes/...'))`

**Graceful degradation pattern** used everywhere:
```js
// Backend
if (!process.env.SOME_KEY) return res.json({ error: 'key missing', fallback: [...] })

// Frontend
const data = apiResponse.error ? apiResponse.fallback : apiResponse
```

---

## Phase 1 — Existing Data Only (no new API keys)

---

## Chunk 1: Tonight in Chicago Page

### Task 1: Backend `/api/tonight` route

**Files:**
- Create: `backend/routes/tonight.js`
- Modify: `backend/server.js` (add route registration)

The Tonight page needs richer data than `/api/home-feed`. This route aggregates: detailed weather, tonight's events (top 5), tonight's sports games, CTA train count, top nightlife spots, and Divvy availability near Streeterville.

- [ ] **Step 1: Create `backend/routes/tonight.js`**

```js
// backend/routes/tonight.js
const router = require('express').Router()
const db = require('../db')

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

const TTL = 5 * 60 * 1000   // 5 min cache

// Chicago's 3 main beaches with fixed coords
const BEACHES = [
  { name: 'Oak Street Beach',      lat: 41.9024, lon: -87.6244 },
  { name: 'North Avenue Beach',    lat: 41.9168, lon: -87.6351 },
  { name: '31st Street Beach',     lat: 41.8379, lon: -87.6158 },
]

function beachAdvisory(tempC, windMps, description) {
  if (description.includes('thunder') || description.includes('storm')) return { status: 'Closed', color: '#ef4444' }
  if (windMps > 12) return { status: 'High Waves', color: '#f97316' }
  if (tempC < 10)   return { status: 'Too Cold', color: '#8b5cf6' }
  if (tempC >= 22 && windMps < 8 && !description.includes('rain')) return { status: 'Ideal', color: '#10b981' }
  if (tempC >= 15)  return { status: 'Decent', color: '#eab308' }
  return { status: 'Chilly', color: '#64748b' }
}

router.get('/', async (_req, res) => {
  const key = 'tonight_v1'
  const cached = stmtGet.get(key)
  if (cached && Date.now() - cached.cached_at < TTL) {
    return res.json(JSON.parse(cached.data))
  }

  const result = {}

  // Weather
  const owKey = process.env.OPENWEATHER_KEY
  if (owKey) {
    try {
      const r = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=41.8919&lon=-87.6197&appid=${owKey}&units=metric`,
        { signal: AbortSignal.timeout(6000) }
      )
      const d = await r.json()
      const tempC   = d.main?.temp ?? 0
      const windMps = d.wind?.speed ?? 0
      const desc    = d.weather?.[0]?.description || ''
      result.weather = {
        tempF:       Math.round(tempC * 9/5 + 32),
        tempC:       Math.round(tempC),
        feelsF:      Math.round((d.main?.feels_like ?? tempC) * 9/5 + 32),
        windMph:     Math.round(windMps * 2.237 * 10) / 10,
        humidity:    d.main?.humidity ?? null,
        description: desc,
        icon:        d.weather?.[0]?.icon || '',
      }
      result.beaches = BEACHES.map(b => ({
        ...b,
        advisory: beachAdvisory(tempC, windMps, desc),
      }))
    } catch { result.weather = null; result.beaches = [] }
  } else {
    result.weather = null
    result.beaches = []
  }

  // Tonight events (top 5 non-sports)
  const tmKey = process.env.TICKETMASTER_KEY
  if (tmKey) {
    try {
      const todayStart = new Date(); todayStart.setHours(16, 0, 0, 0)
      const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 0)
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?city=Chicago&stateCode=IL&size=20&sort=date%2Casc&startDateTime=${todayStart.toISOString().slice(0,19)}Z&endDateTime=${todayEnd.toISOString().slice(0,19)}Z&apikey=${tmKey}`
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
      const json = await r.json()
      result.events = (json?._embedded?.events || [])
        .filter(e => (e.classifications?.[0]?.segment?.name || '').toLowerCase() !== 'sports')
        .slice(0, 5)
        .map(e => {
          const localTime = e.dates?.start?.localTime || '20:00:00'
          const [h, m] = localTime.split(':').map(Number)
          const ampm = h >= 12 ? 'PM' : 'AM'
          const h12  = h > 12 ? h - 12 : h === 0 ? 12 : h
          return {
            id:    e.id,
            name:  e.name,
            venue: e._embedded?.venues?.[0]?.name || 'Chicago',
            time:  `${h12}:${String(m).padStart(2,'0')} ${ampm}`,
            type:  e.classifications?.[0]?.segment?.name || 'Event',
            url:   e.url,
          }
        })
    } catch { result.events = [] }
  } else {
    result.events = []
  }

  // Tonight sports (ESPN public — no key)
  const CHICAGO_TEAMS = [
    { name: 'Bulls',      sport: 'basketball', league: 'nba',   id: '4',   color: '#ce1141' },
    { name: 'Blackhawks', sport: 'hockey',     league: 'nhl',   id: '4',   color: '#cf0a2c' },
    { name: 'Cubs',       sport: 'baseball',   league: 'mlb',   id: '112', color: '#0e3386' },
    { name: 'White Sox',  sport: 'baseball',   league: 'mlb',   id: '145', color: '#c0c0c0' },
    { name: 'Fire',       sport: 'soccer',     league: 'usa.1', id: '1617',color: '#9d2235' },
  ]
  const chicagoToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const games = []
  await Promise.all(CHICAGO_TEAMS.map(async team => {
    try {
      const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${team.sport}/${team.league}/scoreboard`, { signal: AbortSignal.timeout(5000) })
      if (!r.ok) return
      const json = await r.json()
      const todayGames = (json?.events || []).filter(e => {
        const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(e.date))
        return localDate === chicagoToday
      }).filter(e => (e.competitions?.[0]?.competitors || []).some(c => String(c.team?.id) === String(team.id)))
      for (const e of todayGames.slice(0, 1)) {
        const comp = e.competitions?.[0]
        const home = comp?.competitors?.find(c => c.homeAway === 'home')
        const away = comp?.competitors?.find(c => c.homeAway === 'away')
        const state = comp?.status?.type?.state || 'pre'
        const chicagoIsHome = String(home?.team?.id) === String(team.id)
        const opp = chicagoIsHome ? away : home
        const ct = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(e.date))
        games.push({
          team: team.name, color: team.color, opponent: opp?.team?.shortDisplayName || '?',
          time: state === 'in' ? (comp?.status?.type?.description || 'Live') : state === 'post' ? 'Final' : ct,
          state,
          chicagoScore: state !== 'pre' ? String((chicagoIsHome ? home : away)?.score ?? '') : null,
          oppScore:     state !== 'pre' ? String((chicagoIsHome ? away : home)?.score ?? '') : null,
        })
      }
    } catch {}
  }))
  result.games = games

  // CTA train count (no key check — fails gracefully)
  const ctaKey = process.env.CTA_API_KEY
  if (ctaKey) {
    try {
      const r = await fetch(`https://lapi.transitchicago.com/api/1.0/ttpositions.aspx?key=${ctaKey}&rt=Red,Blue,Brn,G,Org,P,Pink,Y&outputType=JSON`)
      const json = await r.json()
      let count = 0
      for (const rt of (json?.ctatt?.route || [])) {
        const trains = Array.isArray(rt.train) ? rt.train : rt.train ? [rt.train] : []
        count += trains.length
      }
      result.trainCount = count
    } catch { result.trainCount = null }
  } else { result.trainCount = null }

  if (Object.keys(result).length > 0) stmtSet.run(key, JSON.stringify(result), Date.now())
  res.json(result)
})

module.exports = router
```

- [ ] **Step 2: Register route in `backend/server.js`**

Add after the existing routes:
```js
app.use('/api/tonight',       require('./routes/tonight'))
```

- [ ] **Step 3: Verify endpoint works locally**

```bash
curl http://localhost:3001/api/tonight | python3 -c "import sys,json; d=json.load(sys.stdin); print(list(d.keys()))"
# Expected: ['weather', 'beaches', 'events', 'games', 'trainCount']
```

- [ ] **Step 4: Commit**

```bash
git add backend/routes/tonight.js backend/server.js
git commit -m "feat: add /api/tonight aggregation route"
```

---

### Task 2: Tonight Page frontend

**Files:**
- Create: `frontend/src/pages/TonightPage.jsx`
- Create: `frontend/src/pages/TonightPage.css`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`

- [ ] **Step 1: Create `frontend/src/pages/TonightPage.jsx`**

```jsx
// frontend/src/pages/TonightPage.jsx
import { useState, useEffect } from 'react'
import {
  RiSunLine, RiWindyLine, RiDropLine, RiSubwayLine,
  RiCalendarEventLine, RiFootballLine, RiSwordLine,
  RiMapPinLine, RiRefreshLine,
} from 'react-icons/ri'
import './TonightPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function useTonightData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/tonight`)
      setData(await r.json())
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  return { data, loading, refresh: load }
}

export default function TonightPage() {
  const { data, loading, refresh } = useTonightData()

  return (
    <div className="tonight-page">
      <div className="tonight-header">
        <div>
          <h1 className="tonight-title">Tonight in Chicago</h1>
          <p className="tonight-sub">What's happening right now</p>
        </div>
        <button className="tonight-refresh" onClick={refresh} title="Refresh">
          <RiRefreshLine />
        </button>
      </div>

      {loading && <div className="tonight-loading">Loading tonight's intel...</div>}

      {!loading && data && (
        <div className="tonight-grid">

          {/* Weather tile */}
          <div className="tn-tile tn-tile--wide">
            <div className="tn-tile-label"><RiSunLine /> WEATHER NOW</div>
            {data.weather ? (
              <div className="tn-weather">
                <span className="tn-temp">{data.weather.tempF}°</span>
                <span className="tn-feels">Feels {data.weather.feelsF}°F</span>
                <span className="tn-desc">{data.weather.description}</span>
                <div className="tn-weather-meta">
                  <span><RiWindyLine /> {data.weather.windMph} mph</span>
                  <span><RiDropLine /> {data.weather.humidity}%</span>
                  {data.trainCount != null && <span><RiSubwayLine /> {data.trainCount} trains active</span>}
                </div>
              </div>
            ) : <p className="tn-missing">Add OPENWEATHER_KEY to enable</p>}
          </div>

          {/* Beach advisories */}
          {data.beaches?.length > 0 && (
            <div className="tn-tile">
              <div className="tn-tile-label"><RiMapPinLine /> LAKE MICHIGAN BEACHES</div>
              <div className="tn-beach-list">
                {data.beaches.map(b => (
                  <div key={b.name} className="tn-beach-row">
                    <span className="tn-beach-name">{b.name}</span>
                    <span className="tn-beach-status" style={{ color: b.advisory.color }}>
                      {b.advisory.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tonight's events */}
          <div className="tn-tile">
            <div className="tn-tile-label"><RiCalendarEventLine /> TONIGHT'S EVENTS</div>
            {data.events?.length > 0 ? (
              <div className="tn-event-list">
                {data.events.map(e => (
                  <a key={e.id} className="tn-event-row" href={e.url} target="_blank" rel="noreferrer">
                    <span className="tn-event-time">{e.time}</span>
                    <div className="tn-event-info">
                      <span className="tn-event-name">{e.name}</span>
                      <span className="tn-event-venue">{e.venue}</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : <p className="tn-missing">{data.events ? 'No events tonight' : 'Add TICKETMASTER_KEY to enable'}</p>}
          </div>

          {/* Tonight's games */}
          <div className="tn-tile">
            <div className="tn-tile-label"><RiFootballLine /> CHICAGO SPORTS TONIGHT</div>
            {data.games?.length > 0 ? (
              <div className="tn-game-list">
                {data.games.map((g, i) => (
                  <div key={i} className="tn-game-row">
                    <span className="tn-game-dot" style={{ background: g.color }} />
                    <div className="tn-game-info">
                      <span className="tn-game-name">{g.team} vs {g.opponent}</span>
                      <span className="tn-game-time">{g.time}</span>
                    </div>
                    {g.chicagoScore != null && (
                      <span className="tn-game-score">{g.chicagoScore}–{g.oppScore}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : <p className="tn-missing">No Chicago games tonight</p>}
          </div>

        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/pages/TonightPage.css`**

```css
/* frontend/src/pages/TonightPage.css */
.tonight-page {
  padding: 24px;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

.tonight-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.tonight-title { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
.tonight-sub   { font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); margin: 0; }

.tonight-refresh {
  background: none; border: none; color: var(--text-muted);
  cursor: pointer; padding: 6px; font-size: 18px;
  transition: color 0.15s;
}
.tonight-refresh:hover { color: #00d4ff; }

.tonight-loading {
  font-size: 13px; color: var(--text-muted);
  font-family: var(--font-mono); padding: 20px 0;
}

.tonight-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
  max-width: 900px;
}

.tn-tile {
  background: #0a1628;
  border: 1px solid #1e3a5f;
  border-radius: 8px;
  padding: 14px 16px;
}
.tn-tile--wide { grid-column: 1 / -1; }

.tn-tile-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 9px; font-family: var(--font-mono);
  letter-spacing: 0.12em; font-weight: 700;
  color: var(--text-muted); margin-bottom: 12px;
}

/* Weather */
.tn-weather { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.tn-temp    { font-size: 40px; font-weight: 700; font-family: var(--font-mono); color: #00d4ff; }
.tn-feels   { font-size: 13px; color: var(--text-muted); }
.tn-desc    { font-size: 13px; color: var(--text); flex: 1; text-transform: capitalize; }
.tn-weather-meta {
  width: 100%; display: flex; gap: 16px; margin-top: 8px;
  font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);
}
.tn-weather-meta span { display: flex; align-items: center; gap: 4px; }

/* Beaches */
.tn-beach-list { display: flex; flex-direction: column; gap: 8px; }
.tn-beach-row  { display: flex; justify-content: space-between; align-items: center; }
.tn-beach-name { font-size: 12px; color: var(--text); }
.tn-beach-status { font-size: 11px; font-family: var(--font-mono); font-weight: 700; }

/* Events */
.tn-event-list { display: flex; flex-direction: column; gap: 8px; }
.tn-event-row  {
  display: flex; align-items: flex-start; gap: 10px;
  text-decoration: none; padding: 4px 0;
  border-bottom: 1px solid rgba(30,58,95,0.5);
}
.tn-event-row:last-child { border-bottom: none; }
.tn-event-time  { font-size: 10px; font-family: var(--font-mono); color: #00d4ff; white-space: nowrap; padding-top: 2px; }
.tn-event-name  { font-size: 12px; color: var(--text); display: block; }
.tn-event-venue { font-size: 10px; color: var(--text-muted); display: block; }

/* Games */
.tn-game-list { display: flex; flex-direction: column; gap: 8px; }
.tn-game-row  { display: flex; align-items: center; gap: 10px; }
.tn-game-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.tn-game-info { flex: 1; }
.tn-game-name { font-size: 12px; color: var(--text); display: block; }
.tn-game-time { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); }
.tn-game-score { font-size: 13px; font-family: var(--font-mono); color: #00d4ff; }

.tn-missing { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin: 0; }
```

- [ ] **Step 3: Add route to `frontend/src/App.jsx`**

```jsx
// Add import:
import TonightPage from './pages/TonightPage'

// Add route inside <Routes>:
<Route path="/tonight" element={<TonightPage />} />
```

- [ ] **Step 4: Add to Sidebar NAV array in `frontend/src/components/Sidebar.jsx`**

```jsx
// Add import:
import { RiMoonClearLine } from 'react-icons/ri'

// Add to NAV array after Home:
{ to: '/tonight', icon: RiMoonClearLine, label: 'Tonight' },
```

- [ ] **Step 5: Verify page renders at `localhost:5173/tonight`**

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/TonightPage.jsx frontend/src/pages/TonightPage.css \
  frontend/src/App.jsx frontend/src/components/Sidebar.jsx
git commit -m "feat: add Tonight in Chicago page (/tonight)"
```

---

## Chunk 2: Beach Page

### Task 3: Backend `/api/beach` route

**Files:**
- Create: `backend/routes/beach.js`
- Modify: `backend/server.js`

The beach route fetches OWM weather at each beach's coordinates and derives a swim advisory. Falls back gracefully when `OPENWEATHER_KEY` is absent.

- [ ] **Step 1: Create `backend/routes/beach.js`**

```js
// backend/routes/beach.js
const { Router } = require('express')
const router = Router()

const BEACHES = [
  { id: 'oak',   name: 'Oak Street Beach',   lat: 41.9024, lon: -87.6244, description: 'Closest to Streeterville. Scenic skyline views.' },
  { id: 'north', name: 'North Avenue Beach',  lat: 41.9168, lon: -87.6351, description: 'Volleyball, concessions, boathouse. Most popular in summer.' },
  { id: '31st',  name: '31st Street Beach',   lat: 41.8379, lon: -87.6158, description: 'South Side gem. Calmer, less crowded.' },
  { id: 'montrose', name: 'Montrose Beach',   lat: 41.9694, lon: -87.6381, description: 'Dog beach and birding area. Most natural feel.' },
]

function swimAdvisory(tempC, windMps, desc) {
  if (desc.includes('thunder') || desc.includes('storm')) return { label: 'Closed — Lightning', color: '#ef4444', score: 0 }
  if (windMps > 14)  return { label: 'High Waves — Caution', color: '#ef4444', score: 20 }
  if (tempC < 8)     return { label: 'Too Cold', color: '#8b5cf6', score: 10 }
  if (desc.includes('rain')) return { label: 'Rain', color: '#64748b', score: 30 }
  if (tempC >= 22 && windMps < 8) return { label: 'Ideal', color: '#10b981', score: 95 }
  if (tempC >= 16)   return { label: 'Good', color: '#00d4ff', score: 75 }
  if (tempC >= 10)   return { label: 'Chilly', color: '#eab308', score: 45 }
  return { label: 'Cold', color: '#f97316', score: 25 }
}

router.get('/', async (_req, res) => {
  const key = process.env.OPENWEATHER_KEY
  if (!key) {
    return res.json({
      beaches: BEACHES.map(b => ({ ...b, advisory: { label: 'Add OPENWEATHER_KEY', color: '#64748b', score: null }, weather: null })),
      keyMissing: true,
    })
  }

  try {
    const results = await Promise.all(BEACHES.map(async b => {
      const r = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${b.lat}&lon=${b.lon}&appid=${key}&units=metric`,
        { signal: AbortSignal.timeout(8000) }
      )
      const d = await r.json()
      const tempC   = d.main?.temp ?? 15
      const windMps = d.wind?.speed ?? 0
      const desc    = d.weather?.[0]?.description || ''
      return {
        ...b,
        weather: {
          tempF:    Math.round(tempC * 9/5 + 32),
          windMph:  Math.round(windMps * 2.237 * 10) / 10,
          humidity: d.main?.humidity ?? null,
          desc,
        },
        advisory: swimAdvisory(tempC, windMps, desc),
      }
    }))
    res.json({ beaches: results })
  } catch (e) {
    res.status(502).json({ error: 'Beach data unavailable', detail: e.message })
  }
})

module.exports = router
```

- [ ] **Step 2: Register in `backend/server.js`**

```js
app.use('/api/beach', require('./routes/beach'))
```

- [ ] **Step 3: Test**

```bash
curl http://localhost:3001/api/beach | python3 -c "import sys,json; d=json.load(sys.stdin); [print(b['name'], b['advisory']['label']) for b in d['beaches']]"
```

- [ ] **Step 4: Commit**

```bash
git add backend/routes/beach.js backend/server.js
git commit -m "feat: add /api/beach route with swim advisories"
```

---

### Task 4: Beach Page frontend

**Files:**
- Create: `frontend/src/pages/BeachPage.jsx`
- Create: `frontend/src/pages/BeachPage.css`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`

- [ ] **Step 1: Create `frontend/src/pages/BeachPage.jsx`**

```jsx
// frontend/src/pages/BeachPage.jsx
import { useState, useEffect } from 'react'
import { RiDropLine, RiWindyLine, RiTempHotLine, RiRefreshLine, RiMapPinLine } from 'react-icons/ri'
import './BeachPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function useBeach() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  async function load() {
    setLoading(true)
    try { const r = await fetch(`${API}/api/beach`); setData(await r.json()) }
    catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  return { data, loading, refresh: load }
}

export default function BeachPage() {
  const { data, loading, refresh } = useBeach()

  return (
    <div className="beach-page">
      <div className="beach-header">
        <div>
          <h1 className="beach-title">Lake Michigan Beaches</h1>
          <p className="beach-sub">Real-time conditions at Chicago's public beaches</p>
        </div>
        <button className="beach-refresh" onClick={refresh}><RiRefreshLine /></button>
      </div>

      {data?.keyMissing && (
        <div className="beach-missing">Add <code>OPENWEATHER_KEY</code> to backend .env to enable live conditions</div>
      )}

      {loading && <div className="beach-loading">Loading beach conditions...</div>}

      {!loading && data?.beaches && (
        <div className="beach-grid">
          {data.beaches.map(b => (
            <div key={b.id} className="beach-card">
              <div className="beach-card-header">
                <div>
                  <div className="beach-name">{b.name}</div>
                  <div className="beach-desc">{b.description}</div>
                </div>
                <div className="beach-advisory" style={{ color: b.advisory.color }}>
                  {b.advisory.label}
                </div>
              </div>

              {b.weather && (
                <div className="beach-stats">
                  <div className="beach-stat">
                    <RiTempHotLine />
                    <span>{b.weather.tempF}°F</span>
                    <label>Air Temp</label>
                  </div>
                  <div className="beach-stat">
                    <RiWindyLine />
                    <span>{b.weather.windMph} mph</span>
                    <label>Wind</label>
                  </div>
                  <div className="beach-stat">
                    <RiDropLine />
                    <span>{b.weather.humidity}%</span>
                    <label>Humidity</label>
                  </div>
                </div>
              )}

              {b.advisory.score != null && (
                <div className="beach-score-bar">
                  <div className="beach-score-fill" style={{ width: `${b.advisory.score}%`, background: b.advisory.color }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/pages/BeachPage.css`**

```css
/* frontend/src/pages/BeachPage.css */
.beach-page { padding: 24px; min-height: 100vh; background: var(--bg); color: var(--text); }

.beach-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.beach-title  { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
.beach-sub    { font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); margin: 0; }
.beach-refresh { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 18px; transition: color 0.15s; }
.beach-refresh:hover { color: #00d4ff; }

.beach-loading, .beach-missing { font-size: 13px; color: var(--text-muted); font-family: var(--font-mono); padding: 12px 0; }
.beach-missing code { color: #00d4ff; }

.beach-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; max-width: 900px; }

.beach-card {
  background: #0a1628; border: 1px solid #1e3a5f; border-radius: 8px; padding: 16px;
}

.beach-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.beach-name   { font-size: 14px; font-weight: 600; color: #fff; }
.beach-desc   { font-size: 11px; color: var(--text-muted); margin-top: 3px; line-height: 1.4; max-width: 180px; }
.beach-advisory { font-size: 11px; font-weight: 700; font-family: var(--font-mono); text-align: right; }

.beach-stats { display: flex; gap: 16px; margin-bottom: 12px; }
.beach-stat  { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 12px; }
.beach-stat svg   { font-size: 14px; color: var(--text-muted); }
.beach-stat span  { font-family: var(--font-mono); font-size: 13px; color: #00d4ff; }
.beach-stat label { font-size: 9px; color: var(--text-muted); font-family: var(--font-mono); }

.beach-score-bar  { height: 3px; background: #1e3a5f; border-radius: 2px; overflow: hidden; }
.beach-score-fill { height: 100%; border-radius: 2px; transition: width 0.4s; }
```

- [ ] **Step 3: Add to App.jsx and Sidebar**

`App.jsx`:
```jsx
import BeachPage from './pages/BeachPage'
// in <Routes>:
<Route path="/beach" element={<BeachPage />} />
```

`Sidebar.jsx`:
```jsx
import { RiWaterFlashLine } from 'react-icons/ri'
// in NAV array (after Tonight):
{ to: '/beach', icon: RiWaterFlashLine, label: 'Beaches' },
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/BeachPage.jsx frontend/src/pages/BeachPage.css \
  frontend/src/App.jsx frontend/src/components/Sidebar.jsx
git commit -m "feat: add Beach page with lake swim advisories (/beach)"
```

---

## Chunk 3: Walking Tours on Explore

### Task 5: Walking tour mode in ExplorePage

**Files:**
- Modify: `frontend/src/pages/ExplorePage.jsx`
- Modify: `frontend/src/pages/ExplorePage.css`

No backend changes needed. Uses existing landmark data. Haversine distance + 4.8 km/h walking speed = walk minutes.

- [ ] **Step 1: Read current ExplorePage**

```bash
wc -l frontend/src/pages/ExplorePage.jsx
# Read the full file to understand landmark data structure and UI
```

- [ ] **Step 2: Add walk time utility and Tour Mode toggle**

Add at top of `ExplorePage.jsx` (after imports):
```js
function haversineMin(a, b) {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLon = (b.lon - a.lon) * Math.PI / 180
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat * Math.PI/180) * Math.cos(b.lat * Math.PI/180) * Math.sin(dLon/2)**2
  const km = 2 * R * Math.asin(Math.sqrt(x))
  return Math.round(km / 4.8 * 60)  // 4.8 km/h walking
}
```

- [ ] **Step 3: Add `tourMode` state and Tour UI**

In the component, add:
```js
const [tourMode, setTourMode] = useState(false)
const [tourLandmarks, setTourLandmarks] = useState([])  // ordered list
```

Tour mode renders each visible landmark as a numbered stop with walk time to next.

- [ ] **Step 4: Add "Tour Mode" toggle button to page header**

```jsx
<button
  className={`explore-tour-btn${tourMode ? ' active' : ''}`}
  onClick={() => setTourMode(t => !t)}
>
  <RiMapPinLine /> {tourMode ? 'Exit Tour' : 'Walking Tour'}
</button>
```

- [ ] **Step 5: Add tour list panel**

When `tourMode` is true, render an ordered list of visible landmarks with:
- Stop number badge
- Landmark name + category
- Walk time from previous stop

```jsx
{tourMode && (
  <div className="explore-tour-panel">
    <div className="explore-tour-header">Walking Tour — {tourLandmarks.length} stops</div>
    {tourLandmarks.map((lm, i) => (
      <div key={lm.id} className="explore-tour-stop">
        <span className="tour-stop-num">{i + 1}</span>
        <div className="tour-stop-info">
          <div className="tour-stop-name">{lm.name}</div>
          <div className="tour-stop-cat">{lm.category}</div>
        </div>
        {i < tourLandmarks.length - 1 && (
          <div className="tour-stop-walk">
            {haversineMin(lm, tourLandmarks[i+1])} min walk
          </div>
        )}
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 6: Add CSS for tour panel**

In `ExplorePage.css`:
```css
.explore-tour-btn { /* match existing filter button style, active uses accent color */ }
.explore-tour-panel { /* sidebar panel, fixed width 280px */ }
.explore-tour-stop { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid #1e3a5f; }
.tour-stop-num { width: 22px; height: 22px; border-radius: 50%; background: #00d4ff; color: #060b18; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tour-stop-name { font-size: 12px; color: var(--text); }
.tour-stop-cat  { font-size: 10px; color: var(--text-muted); }
.tour-stop-walk { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); margin-left: auto; white-space: nowrap; }
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ExplorePage.jsx frontend/src/pages/ExplorePage.css
git commit -m "feat: add walking tour mode to Explore page"
```

---

## Chunk 4: Trip Planner on My Chicago

### Task 6: Day Plan tab in My Chicago

**Files:**
- Modify: `frontend/src/pages/MyChicagoPage.jsx`
- Modify: `frontend/src/pages/MyChicagoPage.css`

Uses existing favorites data. Persisted in `localStorage` (no backend needed — this is personal to the browser session and changes frequently).

- [ ] **Step 1: Add "Day Plan" tab**

In `MyChicagoPage.jsx`, add third tab:
```jsx
<button className={`mc-tab${tab === 'plan' ? ' active' : ''}`} onClick={() => setTab('plan')}>
  <RiRouteLine /> Day Plan
</button>
```

- [ ] **Step 2: Add plan state (localStorage-backed)**

```js
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
  savePlan([...plan, { id: place.place_id, name: place.place_name, note: '' }])
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
```

- [ ] **Step 3: Render Day Plan tab**

```jsx
{!loading && tab === 'plan' && (
  <div className="mc-plan">
    <div className="mc-plan-hint">Add stops from your Favorites below</div>

    {/* Favorites list with "Add to plan" buttons */}
    {me.favorites?.length > 0 && (
      <div className="mc-plan-fav-list">
        {me.favorites.map(f => (
          <button key={f.id} className="mc-plan-add-btn"
            onClick={() => addToPlan(f)}
            disabled={!!plan.find(p => p.id === f.place_id)}
          >
            + {f.place_name}
          </button>
        ))}
      </div>
    )}

    {/* Ordered plan */}
    {plan.length > 0 && (
      <div className="mc-plan-list">
        {plan.map((stop, i) => (
          <div key={stop.id} className="mc-plan-stop">
            <span className="mc-plan-num">{i + 1}</span>
            <span className="mc-plan-name">{stop.name}</span>
            <div className="mc-plan-actions">
              <button onClick={() => movePlan(i, -1)} disabled={i === 0}>↑</button>
              <button onClick={() => movePlan(i,  1)} disabled={i === plan.length-1}>↓</button>
              <button onClick={() => removeFromPlan(stop.id)}>×</button>
            </div>
          </div>
        ))}
      </div>
    )}

    {plan.length === 0 && me.favorites?.length === 0 && (
      <div className="mc-empty">Save favorites first, then build your day plan here</div>
    )}
  </div>
)}
```

- [ ] **Step 4: Add CSS**

In `MyChicagoPage.css`:
```css
.mc-plan-hint    { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 12px; }
.mc-plan-fav-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.mc-plan-add-btn  { background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2); color: #00d4ff; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; transition: background 0.15s; }
.mc-plan-add-btn:hover:not(:disabled) { background: rgba(0,212,255,0.18); }
.mc-plan-add-btn:disabled { opacity: 0.4; cursor: default; }
.mc-plan-list     { display: flex; flex-direction: column; gap: 2px; max-width: 600px; }
.mc-plan-stop     { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #0a1628; border: 1px solid #1e3a5f; border-radius: 6px; }
.mc-plan-num      { width: 20px; height: 20px; border-radius: 50%; background: #00d4ff; color: #060b18; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mc-plan-name     { flex: 1; font-size: 13px; color: var(--text); }
.mc-plan-actions  { display: flex; gap: 4px; }
.mc-plan-actions button { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px 5px; border-radius: 3px; font-size: 13px; transition: color 0.15s; }
.mc-plan-actions button:hover:not(:disabled) { color: #00d4ff; }
.mc-plan-actions button:disabled { opacity: 0.3; cursor: default; }
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/MyChicagoPage.jsx frontend/src/pages/MyChicagoPage.css
git commit -m "feat: add Day Plan tab to My Chicago page"
```

---

## Chunk 5: Divvy Expansion + Chicago 311

### Task 7: Divvy real-time popup on Transit page

**Files:**
- Modify: `frontend/src/pages/TransitPage.jsx`

Divvy data already has `bikesAvailable` and `docksAvailable`. The transit map already renders Divvy stations as dots. Add a click popup showing live availability.

- [ ] **Step 1: Find existing Divvy click handler in TransitPage**

```bash
grep -n "divvy\|Divvy" frontend/src/pages/TransitPage.jsx
```

- [ ] **Step 2: Add click popup to Divvy layer**

Replace or augment the existing Divvy click handler to show:
```js
map.on('click', 'divvy-dots', e => {
  const { name, bikes, docks, renting } = e.features[0].properties
  new mapboxgl.Popup({ closeButton: false })
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(
      `<strong>${name}</strong>` +
      `<div style="margin-top:6px;font-size:11px">` +
      `<span style="color:#10b981">${bikes} bikes</span> · ` +
      `<span style="color:#00d4ff">${docks} docks</span>` +
      (!renting ? `<br><span style="color:#ef4444">Not currently renting</span>` : '') +
      `</div>`
    )
    .addTo(map)
})
```

Make sure the Divvy GeoJSON features include `bikes`, `docks`, `renting` in properties (they should already from the backend, verify and add if not).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/TransitPage.jsx
git commit -m "feat: Divvy stations show live bike/dock counts on click"
```

---

### Task 8: Chicago 311 backend route

**Files:**
- Create: `backend/routes/reports311.js`
- Modify: `backend/server.js`

Chicago Data Portal is public — no API key needed. Returns recent 311 service requests near Streeterville.

- [ ] **Step 1: Create `backend/routes/reports311.js`**

```js
// backend/routes/reports311.js
const { Router } = require('express')
const router = Router()

// Chicago Data Portal — 311 service requests (public, no key)
// Docs: https://data.cityofchicago.org/Service-Requests/311-Service-Requests/v6vf-nfxy
const BASE = 'https://data.cityofchicago.org/resource/v6vf-nfxy.json'

const TYPE_COLOR = {
  'Graffiti Removal':        '#f97316',
  'Pothole in Street':       '#ef4444',
  'Street Light Out':        '#eab308',
  'Garbage Cart Maintenance':'#10b981',
  'Tree Trim':               '#22c55e',
  'Rodent Baiting':          '#8b5cf6',
}

router.get('/', async (req, res) => {
  try {
    // Bounding box around Streeterville / River North / Loop
    const where = encodeURIComponent(
      `latitude > 41.87 AND latitude < 41.92 AND longitude > -87.65 AND longitude < -87.61`
    )
    const url = `${BASE}?$where=${where}&$order=created_date DESC&$limit=50`
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!r.ok) throw new Error(`311 API ${r.status}`)
    const raw = await r.json()
    const reports = raw.map(item => ({
      id:        item.service_request_number || item.sr_number || String(Math.random()),
      type:      item.type_of_service_request || item.sr_type || 'Service Request',
      status:    item.status || 'Open',
      address:   item.street_address || item.address || '',
      created:   item.created_date || '',
      lat:       parseFloat(item.latitude),
      lon:       parseFloat(item.longitude),
      color:     TYPE_COLOR[item.type_of_service_request] || '#64748b',
    })).filter(r => r.lat && r.lon)
    res.json({ reports })
  } catch (e) {
    res.status(502).json({ error: '311 data unavailable', detail: e.message })
  }
})

module.exports = router
```

- [ ] **Step 2: Register in server.js**

```js
app.use('/api/311', require('./routes/reports311'))
```

- [ ] **Step 3: Test**

```bash
curl "http://localhost:3001/api/311" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"{len(d.get('reports',[]))} reports\")"
```

- [ ] **Step 4: Commit**

```bash
git add backend/routes/reports311.js backend/server.js
git commit -m "feat: add /api/311 Chicago service requests route (no key needed)"
```

---

### Task 9: Chicago 311 frontend page

**Files:**
- Create: `frontend/src/pages/ReportsPage.jsx`
- Create: `frontend/src/pages/ReportsPage.css`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Sidebar.jsx`

- [ ] **Step 1: Create `frontend/src/pages/ReportsPage.jsx`**

```jsx
// frontend/src/pages/ReportsPage.jsx
import { useState, useEffect } from 'react'
import { RiAlertLine, RiRefreshLine } from 'react-icons/ri'
import './ReportsPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const TYPE_LABELS = {
  'Graffiti Removal': 'Graffiti', 'Pothole in Street': 'Pothole',
  'Street Light Out': 'Street Light', 'Garbage Cart Maintenance': 'Garbage',
  'Tree Trim': 'Tree', 'Rodent Baiting': 'Rodents',
}

function use311() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/311`)
      const d = await r.json()
      setReports(d.reports || [])
    } catch {} finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  return { reports, loading, refresh: load }
}

function formatDate(s) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ReportsPage() {
  const { reports, loading, refresh } = use311()
  const [filter, setFilter] = useState('All')

  const types = ['All', ...new Set(reports.map(r => TYPE_LABELS[r.type] || r.type))]
  const filtered = filter === 'All' ? reports : reports.filter(r => (TYPE_LABELS[r.type] || r.type) === filter)

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <h1 className="reports-title">Chicago 311</h1>
          <p className="reports-sub">Recent service requests near downtown — public data, no account needed</p>
        </div>
        <button className="reports-refresh" onClick={refresh}><RiRefreshLine /></button>
      </div>

      <div className="reports-filters">
        {types.map(t => (
          <button
            key={t}
            className={`reports-filter${filter === t ? ' active' : ''}`}
            onClick={() => setFilter(t)}
          >{t}</button>
        ))}
      </div>

      {loading && <div className="reports-loading">Loading 311 reports...</div>}

      {!loading && (
        <div className="reports-list">
          {filtered.length === 0 && <div className="reports-empty">No reports found</div>}
          {filtered.map(r => (
            <div key={r.id} className="report-row">
              <span className="report-dot" style={{ background: r.color }} />
              <div className="report-info">
                <div className="report-type">{TYPE_LABELS[r.type] || r.type}</div>
                <div className="report-addr">{r.address || 'Location unavailable'}</div>
              </div>
              <div className="report-meta">
                <span className={`report-status report-status--${r.status.toLowerCase().replace(/\s/g,'-')}`}>
                  {r.status}
                </span>
                <span className="report-date">{formatDate(r.created)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <a
        className="reports-file-link"
        href="https://311.chicago.gov"
        target="_blank"
        rel="noreferrer"
      >
        <RiAlertLine /> File a 311 report at chicago.gov/311
      </a>
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/pages/ReportsPage.css`**

```css
/* frontend/src/pages/ReportsPage.css */
.reports-page { padding: 24px; min-height: 100vh; background: var(--bg); color: var(--text); }
.reports-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.reports-title  { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
.reports-sub    { font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); margin: 0; }
.reports-refresh { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 18px; }
.reports-refresh:hover { color: #00d4ff; }

.reports-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.reports-filter  { background: none; border: 1px solid #1e3a5f; color: var(--text-muted); padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; transition: all 0.15s; }
.reports-filter.active, .reports-filter:hover { border-color: #00d4ff; color: #00d4ff; background: rgba(0,212,255,0.08); }

.reports-loading, .reports-empty { font-size: 13px; color: var(--text-muted); font-family: var(--font-mono); padding: 12px 0; }

.reports-list { display: flex; flex-direction: column; gap: 2px; max-width: 700px; margin-bottom: 20px; }
.report-row  { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #0a1628; border: 1px solid #1e3a5f; border-radius: 6px; }
.report-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.report-info { flex: 1; }
.report-type { font-size: 13px; color: var(--text); }
.report-addr { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px; }
.report-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
.report-status { font-size: 9px; font-family: var(--font-mono); font-weight: 700; padding: 2px 6px; border-radius: 3px; }
.report-status--open     { background: rgba(16,185,129,0.15); color: #10b981; }
.report-status--completed { background: rgba(100,116,139,0.15); color: #64748b; }
.report-date { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); }

.reports-file-link { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #00d4ff; text-decoration: none; opacity: 0.7; transition: opacity 0.15s; }
.reports-file-link:hover { opacity: 1; }
```

- [ ] **Step 3: Wire into App.jsx + Sidebar**

`App.jsx`:
```jsx
import ReportsPage from './pages/ReportsPage'
<Route path="/311" element={<ReportsPage />} />
```

`Sidebar.jsx`:
```jsx
import { RiAlertLine } from 'react-icons/ri'
{ to: '/311', icon: RiAlertLine, label: 'Chicago 311' },
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ReportsPage.jsx frontend/src/pages/ReportsPage.css \
  frontend/src/App.jsx frontend/src/components/Sidebar.jsx
git commit -m "feat: add Chicago 311 page with live service requests (/311)"
```

---

## Chunk 6: CTA Bus Routes

### Task 10: Backend `/api/cta/buses` route

**Files:**
- Modify: `backend/routes/cta.js`

CTA Bus Tracker uses `CTA_API_KEY` (same key as train tracker). Graceful: if key missing, return empty.

- [ ] **Step 1: Read current `backend/routes/cta.js` to understand structure**

```bash
cat backend/routes/cta.js
```

- [ ] **Step 2: Add bus vehicle positions endpoint**

Add to `backend/routes/cta.js`:
```js
// GET /api/cta/buses?routes=79,22,36  (comma-separated route numbers)
router.get('/buses', async (req, res) => {
  const key = process.env.CTA_API_KEY
  if (!key) return res.json({ buses: [], error: 'CTA_API_KEY not set' })
  const routes = req.query.routes || '22,36,66,8,77,151'  // key downtown routes
  try {
    const url = `http://www.ctabustracker.com/bustime/api/v2/getvehicles?key=${key}&rt=${routes}&format=json`
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const json = await r.json()
    const vehicles = (json?.['bustime-response']?.vehicle || []).map(v => ({
      id:      v.vid,
      route:   v.rt,
      lat:     parseFloat(v.lat),
      lon:     parseFloat(v.lon),
      heading: parseInt(v.hdg, 10) || 0,
      destination: v.des || '',
    }))
    res.json({ buses: vehicles })
  } catch (e) {
    res.json({ buses: [], error: e.message })
  }
})
```

- [ ] **Step 3: Add bus route info endpoint**

```js
// GET /api/cta/bus-routes — list of all CTA bus routes
router.get('/bus-routes', async (_req, res) => {
  const key = process.env.CTA_API_KEY
  if (!key) return res.json({ routes: [] })
  try {
    const url = `http://www.ctabustracker.com/bustime/api/v2/getroutes?key=${key}&format=json`
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const json = await r.json()
    const routes = (json?.['bustime-response']?.routes || []).map(rt => ({
      id:    rt.rt,
      name:  rt.rtnm,
      color: rt.rtclr || '#64748b',
    }))
    res.json({ routes })
  } catch (e) {
    res.json({ routes: [] })
  }
})
```

- [ ] **Step 4: Test**

```bash
curl "http://localhost:3001/api/cta/buses" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"{len(d.get('buses',[]))} buses\")"
```

- [ ] **Step 5: Commit**

```bash
git add backend/routes/cta.js
git commit -m "feat: add CTA bus vehicle positions and routes endpoints"
```

---

### Task 11: Bus layer on Transit page

**Files:**
- Modify: `frontend/src/pages/TransitPage.jsx`
- Modify: `frontend/src/pages/TransitPage.css`

- [ ] **Step 1: Add bus toggle to TransitPage header**

Add a "Buses" toggle button next to the line filter buttons:
```jsx
const [showBuses, setShowBuses] = useState(false)
const [buses, setBuses] = useState([])

useEffect(() => {
  if (!showBuses) { setBuses([]); return }
  async function fetchBuses() {
    try {
      const r = await fetch(`${API}/api/cta/buses`)
      const d = await r.json()
      setBuses(d.buses || [])
    } catch {}
  }
  fetchBuses()
  const id = setInterval(fetchBuses, 30000)
  return () => clearInterval(id)
}, [showBuses])
```

- [ ] **Step 2: Add bus dots layer to Mapbox map**

```js
map.addSource('cta-buses', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
map.addLayer({
  id: 'bus-dots', type: 'circle', source: 'cta-buses',
  paint: {
    'circle-radius': 4, 'circle-color': '#f59e0b',
    'circle-stroke-color': '#060b18', 'circle-stroke-width': 1.2,
  }
})
map.on('click', 'bus-dots', e => {
  const { route, destination } = e.features[0].properties
  new mapboxgl.Popup({ closeButton: false })
    .setLngLat(e.features[0].geometry.coordinates)
    .setHTML(`<strong>Route ${route}</strong><br><small>${destination}</small>`)
    .addTo(map)
})
```

- [ ] **Step 3: Update bus source when buses state changes**

```js
useEffect(() => {
  const src = mapRef.current?.getSource('cta-buses')
  if (!src) return
  src.setData({
    type: 'FeatureCollection',
    features: buses.map(b => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [b.lon, b.lat] },
      properties: { route: b.route, destination: b.destination },
    }))
  })
}, [buses])
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/TransitPage.jsx frontend/src/pages/TransitPage.css
git commit -m "feat: add CTA bus layer to Transit page (toggleable)"
```

---

## Phase 2 — New API Keys Required

---

## Chunk 7: Ticket Availability on Sports

### Task 12: SeatGeek ticket links on Sports page

**Files:**
- Modify: `backend/routes/sports.js`
- Modify: `frontend/src/pages/SportsPage.jsx`
- Modify: `frontend/src/pages/SportsPage.css`

**New env var:** `SEATGEEK_CLIENT_ID` (free tier available at seatgeek.com/api)

Graceful degradation: If `SEATGEEK_CLIENT_ID` is absent, show "Get Tickets" button linking to team's website instead of real pricing.

- [ ] **Step 1: Add SeatGeek route to `backend/routes/sports.js`**

```js
// GET /api/sports/tickets?team=Bulls&date=2026-04-01
router.get('/tickets', async (req, res) => {
  const clientId = process.env.SEATGEEK_CLIENT_ID
  const { team, date } = req.query

  if (!clientId) {
    // Graceful fallback: return team website links
    const TEAM_URLS = {
      Bulls: 'https://www.nba.com/bulls/tickets',
      Blackhawks: 'https://www.nhl.com/blackhawks/tickets',
      Cubs: 'https://www.mlb.com/cubs/tickets',
      'White Sox': 'https://www.mlb.com/white-sox/tickets',
      Bears: 'https://www.chicagobears.com/tickets/',
      Fire: 'https://www.chicago-fire.com/tickets',
    }
    return res.json({ tickets: null, fallbackUrl: TEAM_URLS[team] || 'https://seatgeek.com', keyMissing: true })
  }

  try {
    const q = encodeURIComponent(`${team} ${date || ''}`.trim())
    const url = `https://api.seatgeek.com/2/events?q=${q}&venue.city=Chicago&client_id=${clientId}&per_page=3`
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) })
    const json = await r.json()
    const events = (json?.events || []).map(e => ({
      id:       e.id,
      title:    e.title,
      datetime: e.datetime_local,
      url:      e.url,
      lowestPrice: e.stats?.lowest_price || null,
      medianPrice: e.stats?.median_price || null,
    }))
    res.json({ tickets: events })
  } catch (e) {
    res.status(502).json({ error: 'Ticket data unavailable', detail: e.message })
  }
})
```

- [ ] **Step 2: Add "Get Tickets" button to each team card in SportsPage**

In `SportsPage.jsx`, each game card gets a ticket button:
```jsx
// After displaying game score/time:
<TicketButton team={game.team} date={game.date} />
```

```jsx
function TicketButton({ team, date }) {
  const [info, setInfo] = useState(null)

  async function fetchTickets() {
    const r = await fetch(`${API}/api/sports/tickets?team=${encodeURIComponent(team)}&date=${date || ''}`)
    const d = await r.json()
    setInfo(d)
  }

  if (!info) {
    return <button className="ticket-btn" onClick={fetchTickets}>Get Tickets</button>
  }

  if (info.keyMissing || !info.tickets?.length) {
    return <a className="ticket-btn" href={info.fallbackUrl} target="_blank" rel="noreferrer">Get Tickets</a>
  }

  return (
    <div className="ticket-options">
      {info.tickets.map(t => (
        <a key={t.id} className="ticket-option" href={t.url} target="_blank" rel="noreferrer">
          {t.lowestPrice ? `From $${t.lowestPrice}` : 'View Tickets'}
        </a>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Add CSS**

```css
.ticket-btn { background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.3); color: #00d4ff; padding: 4px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; text-decoration: none; display: inline-block; transition: background 0.15s; }
.ticket-btn:hover { background: rgba(0,212,255,0.2); }
.ticket-option { display: block; font-size: 11px; color: #10b981; text-decoration: none; }
```

- [ ] **Step 4: Commit**

```bash
git add backend/routes/sports.js frontend/src/pages/SportsPage.jsx frontend/src/pages/SportsPage.css
git commit -m "feat: add SeatGeek ticket links to Sports page (graceful fallback)"
```

---

## Chunk 8: OpenTable Deep Links on Food

### Task 13: Reservation links on Food page

No new API key needed — OpenTable has no public API. We deep-link using their search URL. This is a frontend-only change.

**Files:**
- Modify: `frontend/src/pages/FoodPage.jsx`
- Modify: `frontend/src/pages/FoodPage.css`

- [ ] **Step 1: Add reservation link to place sidebar entries**

In `FoodPage.jsx`, in the place list sidebar, add a "Reserve" link:
```jsx
function reservationUrl(name) {
  return `https://www.opentable.com/s/?covers=2&dateTime=${encodeURIComponent(todayDateStr())}&metroId=13&term=${encodeURIComponent(name)}`
}

function todayDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T19:00`
}
```

```jsx
// In place card render:
<a className="food-reserve-btn" href={reservationUrl(place.name)} target="_blank" rel="noreferrer">
  Reserve
</a>
```

- [ ] **Step 2: Add CSS**

```css
.food-reserve-btn { font-size: 10px; color: #f97316; text-decoration: none; border: 1px solid rgba(249,115,22,0.3); padding: 2px 8px; border-radius: 3px; transition: background 0.15s; }
.food-reserve-btn:hover { background: rgba(249,115,22,0.1); }
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/FoodPage.jsx frontend/src/pages/FoodPage.css
git commit -m "feat: add OpenTable deep-link reservation buttons to Food page"
```

---

## Chunk 9: PWA Push Notifications

### Task 14: PWA foundation

**New env vars:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`

Generate with: `npx web-push generate-vapid-keys`

**Files:**
- Create: `frontend/public/sw.js` (service worker)
- Create: `backend/routes/push.js`
- Modify: `backend/server.js`
- Modify: `frontend/src/App.jsx`

Graceful: If VAPID keys not set, push subscription silently no-ops. If browser doesn't support Service Workers, skip.

- [ ] **Step 1: Install web-push on backend**

```bash
cd backend && npm install web-push
```

- [ ] **Step 2: Create push backend route**

```js
// backend/routes/push.js
const router = require('express').Router()
const db = require('../db')

// Lazy-load web-push only if keys are configured
function getWebPush() {
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL
  if (!pub || !priv || !email) return null
  const webpush = require('web-push')
  webpush.setVapidDetails(`mailto:${email}`, pub, priv)
  return webpush
}

// Store subscriptions
try {
  db.exec(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE NOT NULL,
    keys TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  )`)
} catch {}

// GET /api/push/vapid-key — public key for frontend subscription
router.get('/vapid-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY
  res.json({ key: key || null })
})

// POST /api/push/subscribe — save subscription
router.post('/subscribe', (req, res) => {
  const { endpoint, keys } = req.body
  if (!endpoint || !keys) return res.status(400).json({ error: 'endpoint and keys required' })
  try {
    db.prepare('INSERT OR REPLACE INTO push_subscriptions (endpoint, keys) VALUES (?, ?)').run(endpoint, JSON.stringify(keys))
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/push/send — send notification (internal use / admin)
router.post('/send', async (req, res) => {
  const webpush = getWebPush()
  if (!webpush) return res.status(503).json({ error: 'VAPID keys not configured' })
  const { title, body } = req.body
  const subs = db.prepare('SELECT * FROM push_subscriptions').all()
  const payload = JSON.stringify({ title, body })
  let sent = 0
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: JSON.parse(sub.keys) }, payload)
      sent++
    } catch { /* expired subscription — could delete here */ }
  }
  res.json({ sent })
})

module.exports = router
```

- [ ] **Step 3: Register push route**

```js
app.use('/api/push', require('./routes/push'))
```

- [ ] **Step 4: Create service worker `frontend/public/sw.js`**

```js
// frontend/public/sw.js
self.addEventListener('push', event => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Chicago Explore', {
      body: data.body || '',
      icon: '/favicon.ico',
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/tonight'))
})
```

- [ ] **Step 5: Register service worker in `frontend/src/App.jsx`**

Add `useEffect` in App component:
```js
useEffect(() => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  navigator.serviceWorker.register('/sw.js').then(async reg => {
    // Get VAPID key
    const r = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/push/vapid-key`)
    const { key } = await r.json()
    if (!key) return
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    })
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))), auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))) } }),
    })
  }).catch(() => {}) // Silently skip if SW registration fails
}, [])
```

- [ ] **Step 6: Commit**

```bash
git add backend/routes/push.js backend/server.js frontend/public/sw.js frontend/src/App.jsx
cd backend && npm install web-push --save
git add backend/package.json backend/package-lock.json
git commit -m "feat: add PWA push notification infrastructure (VAPID)"
```

---

## Environment Variables Summary

### Phase 1 (all already have these):
| Variable | Used by |
|---|---|
| `OPENWEATHER_KEY` | Tonight, Beach pages |
| `TICKETMASTER_KEY` | Tonight events |
| `CTA_API_KEY` | Tonight train count, Bus routes |

### Phase 2 (new):
| Variable | Required for | Where to get |
|---|---|---|
| `SEATGEEK_CLIENT_ID` | Sports ticket prices | seatgeek.com/api (free) |
| `VAPID_PUBLIC_KEY` | Push notifications | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Push notifications | same |
| `VAPID_EMAIL` | Push notifications | your email |

All missing keys → graceful fallback. App fully functional without any Phase 2 keys.

---

## Final Sidebar Order (after all features)

```js
const NAV = [
  { to: '/',              label: 'Home' },
  { to: '/tonight',       label: 'Tonight' },        // NEW
  { to: '/explore',       label: 'Explore' },
  { to: '/transit',       label: 'Transit' },
  { to: '/nightlife',     label: 'Nightlife' },
  { to: '/food',          label: 'Food & Drink' },
  { to: '/sports',        label: 'Sports' },
  { to: '/events',        label: 'Events' },
  { to: '/beach',         label: 'Beaches' },         // NEW
  { to: '/weather',       label: 'Weather & Lake' },
  { to: '/neighborhoods', label: 'Neighborhoods' },
  { to: '/311',           label: 'Chicago 311' },     // NEW
  { to: '/me',            label: 'My Chicago' },
]
```

Walking tours and Day Plan are tabs within existing pages (Explore and My Chicago), not new routes.
Bus layer is a toggle within Transit — not a new route.
