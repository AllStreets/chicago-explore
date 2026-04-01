# Homepage Neighborhood Polygons Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render colored, semi-transparent neighborhood polygon overlays on the homepage Mapbox map, sourced from Chicago's open data API, with hover tooltips and click-to-navigate behavior.

**Architecture:** A new `GET /api/neighborhoods/boundaries` backend endpoint fetches Chicago neighborhood GeoJSON, filters to our 12 neighborhoods, injects color/id/tagline per feature, and caches 24h in SQLite. The frontend fetches this on mount, adds Mapbox fill + line layers below all existing icon/symbol layers, and handles hover (popup) and click (navigate to `/neighborhoods#id`). The Neighborhoods page gets `id` attributes on cards + a hash-scroll flash effect.

**Tech Stack:** Express + better-sqlite3 (backend), React 18 + Mapbox GL JS + React Router v6 (frontend), Vitest (frontend tests), Jest + Supertest (backend tests)

---

## Chunk 1: Backend + Tests

### Task 1: Backend `/api/neighborhoods/boundaries` endpoint

**Files:**
- Modify: `backend/routes/neighborhoods.js`
- Modify: `backend/__tests__/phase2.test.js`

**Context:** `neighborhoods.js` currently has no `db` import and no cache. The `yelp_cache` table exists in SQLite (defined in `backend/db.js`). The pattern to follow is identical to `backend/routes/yelp.js` lines 1-14.

The Chicago Neighborhoods GeoJSON URL is:
`https://data.cityofchicago.org/api/geospatial/bbvz-uum9?method=export&type=GeoJSON`

The field to match on is `feature.properties.pri_neigh` (case-insensitive). Our 12 neighborhood names from the `NEIGHBORHOODS` array: Streeterville, Wicker Park, Lincoln Park, Logan Square, River North, South Loop, Bucktown, Andersonville, Pilsen, Hyde Park, Old Town, West Loop.

---

- [ ] **Step 1: Write the failing backend test**

Add to `backend/__tests__/phase2.test.js` (after the existing neighborhood tests):

```js
it('GET /api/neighborhoods/boundaries returns GeoJSON FeatureCollection', async () => {
  const res = await request(app).get('/api/neighborhoods/boundaries')
  expect(res.status).toBe(200)
  expect(res.body.type).toBe('FeatureCollection')
  expect(Array.isArray(res.body.features)).toBe(true)
}, 15000)

it('GET /api/neighborhoods/boundaries features have required properties', async () => {
  const res = await request(app).get('/api/neighborhoods/boundaries')
  expect(res.status).toBe(200)
  if (res.body.features.length > 0) {
    const f = res.body.features[0]
    expect(f.properties).toHaveProperty('id')
    expect(f.properties).toHaveProperty('color')
    expect(f.properties).toHaveProperty('tagline')
    expect(f.properties).toHaveProperty('name')
  }
}, 15000)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/connorevans/Downloads/chicago-explorer/backend
npx jest __tests__/phase2.test.js --testNamePattern="boundaries" -t "boundaries"
```

Expected: FAIL — `GET /api/neighborhoods/boundaries` returns 404

- [ ] **Step 3: Implement the endpoint**

At the top of `backend/routes/neighborhoods.js`, add after line 2 (`const router = require('express').Router()`):

```js
const db = require('../db')
const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

const BOUNDARY_TTL = 24 * 60 * 60 * 1000  // 24 hours

const HOOD_COLORS = {
  'streeterville': '#1e40af',
  'wicker-park':   '#8b5cf6',
  'lincoln-park':  '#eab308',
  'logan-square':  '#f43f5e',
  'river-north':   '#f97316',
  'south-loop':    '#06b6d4',
  'bucktown':      '#84cc16',
  'andersonville': '#10b981',
  'pilsen':        '#ef4444',
  'hyde-park':     '#6366f1',
  'old-town':      '#ec4899',
  'west-loop':     '#00d4ff',
}
```

Then add this route **before** `router.get('/:id', ...)` (currently line 155) — NOT at the end of the file. Express matches routes in order; if `/boundaries` is placed after `/:id`, the string `"boundaries"` is treated as an id parameter and returns a 404.

The correct order in the file must be:
1. `router.get('/', ...)` — list all neighborhoods
2. `router.get('/boundaries', ...)` — new endpoint ← add here
3. `router.get('/:id', ...)` — get single neighborhood
4. `module.exports = router`

```js
router.get('/boundaries', async (_req, res) => {
  const CACHE_KEY = 'neighborhood_boundaries_v1'
  const cached = stmtGet.get(CACHE_KEY)
  if (cached && Date.now() - cached.cached_at < BOUNDARY_TTL) {
    return res.json(JSON.parse(cached.data))
  }

  try {
    const r = await fetch(
      'https://data.cityofchicago.org/api/geospatial/bbvz-uum9?method=export&type=GeoJSON',
      { signal: AbortSignal.timeout(8000) }
    )
    if (!r.ok) throw new Error(`City API ${r.status}`)
    const geojson = await r.json()

    // Build lookup map: lowercase name → neighborhood object
    const lookup = {}
    for (const n of NEIGHBORHOODS) {
      lookup[n.name.toLowerCase()] = n
    }

    const features = (geojson.features || [])
      .filter(f => {
        const name = (f.properties?.pri_neigh || '').toLowerCase()
        return !!lookup[name]
      })
      .map(f => {
        const name = (f.properties.pri_neigh || '').toLowerCase()
        const n = lookup[name]
        return {
          ...f,
          properties: {
            ...f.properties,
            id:      n.id,
            name:    n.name,
            color:   HOOD_COLORS[n.id] || '#00d4ff',
            tagline: n.tagline,
          },
        }
      })

    const result = { type: 'FeatureCollection', features }
    stmtSet.run(CACHE_KEY, JSON.stringify(result), Date.now())
    res.json(result)
  } catch (err) {
    // Return empty FeatureCollection on error — frontend handles gracefully
    res.json({ type: 'FeatureCollection', features: [] })
  }
})
```

**Important:** This route must be placed BEFORE the `router.get('/:id', ...)` route, otherwise Express will match `/boundaries` as an `:id` parameter and return a 404.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/connorevans/Downloads/chicago-explorer/backend
npx jest __tests__/phase2.test.js --testNamePattern="boundaries" -t "boundaries"
```

Expected: PASS (both tests). The city API call will be live. If the city API is slow or down, the endpoint returns an empty FeatureCollection — this is expected and not a test failure (the test checks `status 200`, not feature count).

- [ ] **Step 5: Commit**

```bash
cd /Users/connorevans/Downloads/chicago-explorer
git add backend/routes/neighborhoods.js backend/__tests__/phase2.test.js
git commit -m "feat: add /api/neighborhoods/boundaries endpoint with 24h SQLite cache"
```

---

## Chunk 2: Frontend — HomePage layers

### Task 2: Neighborhood polygon layers on the homepage map

**Files:**
- Modify: `frontend/src/pages/HomePage.jsx`
- Modify: `frontend/src/pages/__tests__/HomePage.test.jsx`

**Context before starting — read these sections of `HomePage.jsx`:**
- Line 2: `import { useEffect, useRef } from 'react'` — needs `useState` added
- Line 234–242: component function start + existing refs (`foodRef`, `nightlifeRef`) — add `boundariesRef` here
- Line 281–504: the `map.on('load', async () => { ... })` callback — add neighborhood layers inside here, after line 436 (the `if (foodRef.current.length > 0)` block)
- Lines 514–526: the two `useEffect` hooks for food/nightlife — add a third one for boundaries after line 526
- React Router `useNavigate` is NOT currently imported — must add it

**The exact insertion point for `addNeighborhoodLayers` call inside the `load` callback** is after line 436 (the nightlife data check block). The function definition `addNeighborhoodLayers` goes outside the component, near the other helper functions at the top of the file.

---

- [ ] **Step 1: Write the failing frontend test**

Add to `frontend/src/pages/__tests__/HomePage.test.jsx` (after the existing two `it(...)` blocks, inside the `describe` block):

```js
it('fetches neighborhood boundaries on mount', async () => {
  const fetchMock = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }) })
  )
  global.fetch = fetchMock
  const { unmount } = render(<MemoryRouter><HomePage /></MemoryRouter>)
  await new Promise(r => setTimeout(r, 50))
  const calls = fetchMock.mock.calls.map(c => c[0])
  expect(calls.some(url => url.includes('/api/neighborhoods/boundaries'))).toBe(true)
  unmount()
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/connorevans/Downloads/chicago-explorer/frontend
npx vitest run src/pages/__tests__/HomePage.test.jsx
```

Expected: FAIL — the test checking for boundaries fetch will fail since it doesn't exist yet.

- [ ] **Step 3: Implement — imports + state + ref**

In `frontend/src/pages/HomePage.jsx`:

**Change line 2** from:
```js
import { useEffect, useRef } from 'react'
```
to:
```js
import { useEffect, useRef, useState } from 'react'
```

**Change line 3** from:
```js
import { RiWifiLine, RiRefreshLine } from 'react-icons/ri'
```
to:
```js
import { useNavigate } from 'react-router-dom'
import { RiWifiLine, RiRefreshLine } from 'react-icons/ri'
```

**Inside the component function** (after line 242, after `const nightlifeRef = useRef([])`), add:
```js
const boundariesRef  = useRef(null)
const [boundaries, setBoundaries] = useState(null)
const navigate = useNavigate()
```

- [ ] **Step 4: Implement — `addNeighborhoodLayers` + `wireNeighborhoodEvents` helpers**

Add both functions to `HomePage.jsx` **outside the component**, near the other helper functions (e.g., after the `toNlGeoJSON` function, before `let _routesCache = null`):

```js
function addNeighborhoodLayers(map, data) {
  if (map.getSource('neighborhood-boundaries')) return  // guard against double-add
  const layers = map.getStyle().layers
  const labelLayer = layers.find(l => l.type === 'symbol' && l.layout?.['text-field'])
  const beforeId = labelLayer?.id

  map.addSource('neighborhood-boundaries', { type: 'geojson', data })

  map.addLayer({
    id: 'neighborhood-fill',
    type: 'fill',
    source: 'neighborhood-boundaries',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': 0.15,
    },
  }, beforeId)

  map.addLayer({
    id: 'neighborhood-line',
    type: 'line',
    source: 'neighborhood-boundaries',
    paint: {
      'line-color': ['get', 'color'],
      'line-opacity': 0.5,
      'line-width': 1.5,
    },
  }, beforeId)
}

// Wires hover + click events for neighborhood polygons.
// Safe to call once — guarded by checking if the layer exists first.
// Navigate is passed in so this function can live outside the component.
function wireNeighborhoodEvents(map, navigate) {
  if (!map.getLayer('neighborhood-fill')) return  // layers not added yet
  if (map._nhEventsWired) return                  // already wired — don't stack listeners
  map._nhEventsWired = true

  const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false })

  map.on('mousemove', 'neighborhood-fill', (e) => {
    map.getCanvas().style.cursor = 'pointer'
    const { name, tagline } = e.features[0].properties
    popup.setLngLat(e.lngLat)
      .setHTML(`<strong>${name}</strong><br/><span>${tagline}</span>`)
      .addTo(map)
  })
  map.on('mouseleave', 'neighborhood-fill', () => {
    map.getCanvas().style.cursor = ''
    popup.remove()
  })
  map.on('click', 'neighborhood-fill', (e) => {
    const id = e.features[0].properties.id
    navigate(`/neighborhoods#${id}`)
  })
}
```

- [ ] **Step 5: Implement — boundaries fetch in mount useEffect**

Inside the existing top-level `useEffect(() => { ... }, [])` that runs on mount (NOT the map init useEffect — look for the one that fetches food/nightlife/feed data, or add alongside the existing fetch pattern).

Actually, looking at the code, the food/nightlife data comes from hooks (`useYelp`), not a manual fetch. The boundaries fetch is standalone. Add it as a separate one-line useEffect alongside the existing ones:

After line 526 (`}, [nightlifePlaces])`), add:

```js
// Fetch neighborhood boundaries once on mount
useEffect(() => {
  fetch(`${API}/api/neighborhoods/boundaries`)
    .then(r => r.json())
    .then(data => {
      boundariesRef.current = data
      setBoundaries(data)
    })
    .catch(() => {})
}, [])
```

- [ ] **Step 6: Implement — call inside load callback**

Inside the `map.on('load', async () => { ... })` callback, after the existing block that checks `nightlifeRef.current.length > 0` (around line 434–436), add:

```js
// Neighborhood polygon overlays — below all icon layers
if (boundariesRef.current) {
  addNeighborhoodLayers(map, boundariesRef.current)
  wireNeighborhoodEvents(map, navigate)
}
```

`navigate` is captured in the closure when the `useEffect([])` runs — this is safe because `useNavigate()` returns a stable reference.

- [ ] **Step 7: Implement — recovery useEffect (boundaries arrive after load)**

After the boundaries fetch useEffect (after Step 5), add:

```js
// Recovery: boundaries arrived after map was already loaded
useEffect(() => {
  const map = mapRef.current
  if (!boundaries || !map) return
  if (!map.isStyleLoaded()) return
  addNeighborhoodLayers(map, boundaries)   // no-op if source already exists
  wireNeighborhoodEvents(map, navigate)    // no-op if already wired (_nhEventsWired guard)
}, [boundaries])  // eslint-disable-line react-hooks/exhaustive-deps
```

The `_nhEventsWired` flag on the map instance in `wireNeighborhoodEvents` ensures event listeners are never stacked regardless of how many times this effect fires.

- [ ] **Step 8: Run tests to verify they pass**

```bash
cd /Users/connorevans/Downloads/chicago-explorer/frontend
npx vitest run src/pages/__tests__/HomePage.test.jsx
```

Expected: all 3 tests PASS.

- [ ] **Step 9: Commit**

```bash
cd /Users/connorevans/Downloads/chicago-explorer
git add frontend/src/pages/HomePage.jsx frontend/src/pages/__tests__/HomePage.test.jsx
git commit -m "feat: add neighborhood polygon overlays to homepage map"
```

---

## Chunk 3: Frontend — NeighborhoodsPage hash-scroll

### Task 3: Hash-based scroll and flash highlight on the Neighborhoods page

**Files:**
- Modify: `frontend/src/pages/NeighborhoodsPage.jsx`
- Modify: `frontend/src/pages/NeighborhoodsPage.css`
- Modify: `frontend/src/pages/__tests__/NeighborhoodsPage.test.jsx`

**Context:** `NeighborhoodsPage.jsx` has a `useNeighborhoods()` hook that returns `{ hoods, loading }`. `hoods` is populated asynchronously. Cards are rendered at line 176–193 in a `.map(h => ...)`. Currently no `id` attribute on card elements.

---

- [ ] **Step 1: Write the failing test**

Replace the contents of `frontend/src/pages/__tests__/NeighborhoodsPage.test.jsx` with:

```jsx
import { render, screen, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const MOCK_HOODS = [
  { id: 'wicker-park', name: 'Wicker Park', tagline: 'Indie soul', vibe: ['artsy'] },
  { id: 'lincoln-park', name: 'Lincoln Park', tagline: 'Green space', vibe: ['family'] },
]

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_HOODS) })
  )
  // jsdom's window.location is non-configurable — delete then reassign is the standard pattern
  delete window.location
  window.location = { ...window.location, hash: '' }
})

describe('NeighborhoodsPage', () => {
  it('renders', async () => {
    const { default: P } = await import('../NeighborhoodsPage')
    await act(async () => { render(<P />) })
    expect(screen.getByText('Neighborhoods')).toBeInTheDocument()
  })

  it('renders neighborhood cards after load', async () => {
    const { default: P } = await import('../NeighborhoodsPage')
    await act(async () => { render(<P />) })
    await waitFor(() => expect(screen.getByText('Wicker Park')).toBeInTheDocument())
    expect(document.getElementById('wicker-park')).toBeTruthy()
  })

  it('cards have id attributes matching neighborhood ids', async () => {
    const { default: P } = await import('../NeighborhoodsPage')
    await act(async () => { render(<P />) })
    await waitFor(() => expect(screen.getByText('Lincoln Park')).toBeInTheDocument())
    expect(document.getElementById('lincoln-park')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/connorevans/Downloads/chicago-explorer/frontend
npx vitest run src/pages/__tests__/NeighborhoodsPage.test.jsx
```

Expected: the `id attributes` test FAILS (cards don't have `id` yet).

- [ ] **Step 3: Add `id` attribute to neighborhood cards**

In `frontend/src/pages/NeighborhoodsPage.jsx`, find the card `<div>` at line ~177:

```jsx
<div
  key={h.id}
  className={`neighborhood-card${selected?.id === h.id ? ' selected' : ''}`}
  onClick={() => setSelected(h)}
>
```

Change to:

```jsx
<div
  key={h.id}
  id={h.id}
  className={`neighborhood-card${selected?.id === h.id ? ' selected' : ''}`}
  onClick={() => setSelected(h)}
>
```

- [ ] **Step 4: Add hash-scroll useEffect**

In `frontend/src/pages/NeighborhoodsPage.jsx`, inside the `NeighborhoodsPage` component function, add this after the existing state declarations (`const [selected, setSelected] = useState(null)` etc.):

```js
// Scroll to + highlight card when arriving from map polygon click
useEffect(() => {
  if (!hoods.length) return
  const hash = window.location.hash.slice(1)
  if (!hash) return
  const el = document.getElementById(hash)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('neighborhood-card--flash')
  el.addEventListener('animationend', () => el.classList.remove('neighborhood-card--flash'), { once: true })
}, [hoods])
```

- [ ] **Step 5: Add flash animation CSS**

In `frontend/src/pages/NeighborhoodsPage.css`, append at the end of the file:

```css
@keyframes hood-flash {
  0%   { box-shadow: 0 0 0 2px var(--accent); }
  50%  { box-shadow: 0 0 12px 4px var(--accent); }
  100% { box-shadow: none; }
}
.neighborhood-card--flash {
  animation: hood-flash 0.8s ease-out forwards;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /Users/connorevans/Downloads/chicago-explorer/frontend
npx vitest run src/pages/__tests__/NeighborhoodsPage.test.jsx
```

Expected: all 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/connorevans/Downloads/chicago-explorer
git add frontend/src/pages/NeighborhoodsPage.jsx frontend/src/pages/NeighborhoodsPage.css frontend/src/pages/__tests__/NeighborhoodsPage.test.jsx
git commit -m "feat: add hash-scroll flash highlight to neighborhoods page"
```

---

## Final verification

- [ ] **Run all tests**

```bash
cd /Users/connorevans/Downloads/chicago-explorer/backend && npx jest
cd /Users/connorevans/Downloads/chicago-explorer/frontend && npx vitest run
```

Expected: all tests pass.

- [ ] **Push to GitHub**

```bash
cd /Users/connorevans/Downloads/chicago-explorer
git push origin main
```
