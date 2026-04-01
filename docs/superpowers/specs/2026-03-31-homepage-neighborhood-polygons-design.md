# Homepage Neighborhood Polygons — Design Spec

## Goal

Add colored neighborhood polygon overlays to the homepage Mapbox map. All 12 neighborhoods from the Neighborhoods page are rendered as semi-transparent filled polygons with colored borders, positioned geographically on the map. Existing icons (bars, stadiums, CTA routes, train dots) render above the polygons. Hovering a polygon shows the neighborhood name and tagline; clicking navigates to that neighborhood's detail on the Neighborhoods page.

## Architecture

```
Chicago Open Data API (GeoJSON, free)
         ↓  first request only, then cached 24h in SQLite
GET /api/neighborhoods/boundaries
         ↓  filtered GeoJSON (12 features) with id + color + tagline injected
HomePage.jsx — fetched on mount
         ↓
Mapbox source: neighborhood-boundaries
Mapbox fill layer (opacity 0.15)   ← below all existing layers
Mapbox line layer (opacity 0.5)    ← below all existing layers
         ↓
CTA routes → train dots → stadium/bar icons (untouched, above)
```

**Data source:** City of Chicago Neighborhoods GeoJSON
`https://data.cityofchicago.org/api/geospatial/bbvz-uum9?method=export&type=GeoJSON`
98 neighborhoods, name-matched to our 12 by the `pri_neigh` field (case-insensitive). Boundaries respect the lakefront — polygons never extend into Lake Michigan.

## Backend

### File: `backend/routes/neighborhoods.js`

Add one new endpoint to the existing router:

```
GET /api/neighborhoods/boundaries
```

**Behavior:**
1. Check `yelp_cache` for key `neighborhood_boundaries_v1` — return cached data if age < 24h
2. Fetch city GeoJSON (8s timeout)
3. Filter features to the 12 neighborhoods by case-insensitive match on `feature.properties.pri_neigh`
4. For each matched feature, inject `id`, `color`, and `tagline` into `feature.properties` — look up all three from the local `NEIGHBORHOODS` array by matching `n.name.toLowerCase()` against `pri_neigh.toLowerCase()`
5. Cache the filtered FeatureCollection in `yelp_cache` as JSON
6. Return the FeatureCollection

**`id`** comes from `n.id` (e.g. `'wicker-park'`). **`tagline`** comes from `n.tagline`. **`color`** comes from the color map below. All three are required for the frontend to work correctly.

**No new files, no new routes file, no schema changes.** The `yelp_cache` table already exists. The developer must add `const db = require('../db')` and declare new `stmtGet`/`stmtSet` prepared statements at the top of `neighborhoods.js`, following the same pattern used in `yelp.js`:

```js
const db = require('../db')
const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')
```

### Neighborhood color map

Taglines are sourced at runtime from the existing `NEIGHBORHOODS` array — do not hardcode them. Colors are defined here:

| Neighborhood (`n.name`) | Color |
|---|---|
| Streeterville | `#1e40af` |
| Wicker Park | `#8b5cf6` |
| Lincoln Park | `#eab308` |
| Logan Square | `#f43f5e` |
| River North | `#f97316` |
| South Loop | `#06b6d4` |
| Bucktown | `#84cc16` |
| Andersonville | `#10b981` |
| Pilsen | `#ef4444` |
| Hyde Park | `#6366f1` |
| Old Town | `#ec4899` |
| West Loop | `#00d4ff` |

## Frontend

### File: `frontend/src/pages/HomePage.jsx`

**New state + ref** (mirrors the existing `foodRef`/`nightlifeRef` pattern in `HomePage.jsx`):
```js
const [boundaries, setBoundaries] = useState(null)
const boundariesRef = useRef(null)
```

**Fetch** (alongside existing weather/feed fetches, in the top-level `useEffect` on mount):
```js
fetch(`${API}/api/neighborhoods/boundaries`)
  .then(r => r.json())
  .then(data => {
    boundariesRef.current = data  // ref is readable inside stale closures (e.g. load callback)
    setBoundaries(data)           // state update triggers the recovery useEffect
  })
  .catch(() => {})  // silent fail — map works fine without polygons
```

The `boundariesRef` is necessary because the map `load` callback is defined once inside a `useEffect([])` mount effect and closes over `boundaries = null`. Even if the fetch resolves before `load` fires, the closure will read the stale initial value. Reading `boundariesRef.current` inside the callback always reflects the latest value.

**Map layer setup — helper function:**

Extract a standalone function `addNeighborhoodLayers(map, data)` that adds the source and both layers. This is called from two places (see race condition handling below):

```js
function addNeighborhoodLayers(map, data) {
  if (map.getSource('neighborhood-boundaries')) return  // guard against double-add

  // Find the first text-label symbol layer — matches existing labelLayer pattern in this file
  const layers = map.getStyle().layers
  const labelLayer = layers.find(l => l.type === 'symbol' && l.layout?.['text-field'])
  const beforeId = labelLayer?.id  // undefined is safe — Mapbox appends to top if omitted

  map.addSource('neighborhood-boundaries', { type: 'geojson', data })

  map.addLayer({
    id: 'neighborhood-fill',
    type: 'fill',
    source: 'neighborhood-boundaries',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': 0.15,
    }
  }, beforeId)

  map.addLayer({
    id: 'neighborhood-line',
    type: 'line',
    source: 'neighborhood-boundaries',
    paint: {
      'line-color': ['get', 'color'],
      'line-opacity': 0.5,
      'line-width': 1.5,
    }
  }, beforeId)
}
```

The `labelLayer` pattern (`l.type === 'symbol' && l.layout?.['text-field']`) matches the existing pattern already used in `HomePage.jsx` for inserting CTA route layers. Using plain `type === 'symbol'` would match non-label symbol layers (road shields, POI icons) earlier in the Mapbox style stack and cause incorrect z-ordering.

**Race condition handling — two call sites:**

The fetch and the map `load` event are independent. Handle both cases:

*Case 1 — boundaries arrive before or after `load`:*
Inside the existing map `load` callback, after CTA routes are added, read from the ref (not the state variable — the state variable is stale inside this closure):
```js
if (boundariesRef.current) {
  addNeighborhoodLayers(map, boundariesRef.current)
}
```

*Case 2 — boundaries arrive before `load` fires, or after `load` but `boundaries` was null at the time:*
```js
useEffect(() => {
  const map = mapRef.current
  if (!boundaries || !map) return
  if (!map.isStyleLoaded()) return  // load callback will handle it
  if (map.getSource('neighborhood-boundaries')) return  // already added
  addNeighborhoodLayers(map, boundaries)
}, [boundaries])
```

The `getSource` guard in `addNeighborhoodLayers` and the `getSource` check in the `useEffect` together prevent any possibility of calling `addSource` twice (which throws a runtime error in Mapbox GL JS).

**Hover interaction:**
```js
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
```

Popup reuses the existing map popup CSS already defined in `HomePage.css`.

**Click interaction:**
```js
map.on('click', 'neighborhood-fill', (e) => {
  const id = e.features[0].properties.id  // e.g. 'wicker-park', injected by backend
  navigate(`/neighborhoods#${id}`)
})
```

`useNavigate` already imported (or added alongside existing React Router imports).

### File: `frontend/src/pages/NeighborhoodsPage.jsx`

Add hash-based scroll and highlight when navigating from the map.

**Step 1 — Add `id` attribute to each neighborhood card DOM element:**
```jsx
<div
  key={h.id}
  id={h.id}   // ← add this
  className={`neighborhood-card${selected?.id === h.id ? ' selected' : ''}`}
  ...
>
```

**Step 2 — Scroll and highlight after data loads:**
```js
useEffect(() => {
  if (!hoods.length) return  // wait for data
  const hash = window.location.hash.slice(1)  // e.g. 'wicker-park'
  if (!hash) return
  const el = document.getElementById(hash)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('neighborhood-card--flash')
  el.addEventListener('animationend', () => el.classList.remove('neighborhood-card--flash'), { once: true })
}, [hoods])  // runs once after hoods populates
```

**Step 3 — Add flash animation to `NeighborhoodsPage.css`:**
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

`--accent` is `#00d4ff` globally. The animation flashes once and cleans up via `animationend`.

## Interaction with Existing Layers

- CTA route lines: unaffected, render above polygons
- Train position dots: unaffected, render above polygons
- Stadium/bar/Streeterville pulse icons: unaffected, all symbol layers stay above fill and line layers
- The `noGlowColor` Mapbox expression on glow layers: unaffected

## Error Handling

- City API down or slow: `boundaries` stays `null`, map loads normally with no polygons, no error shown to user
- Neighborhood name not found in city data: that neighborhood is silently omitted (no crash)
- Cache hit path: `stmtGet` returns cached JSON, parsed and returned immediately with no outbound fetch
- `addSource` called twice: guarded by `map.getSource('neighborhood-boundaries')` check in `addNeighborhoodLayers`

## What This Does NOT Include

- No polygon editing or custom boundary drawing
- No neighborhood-specific data (weather, events) shown in the polygon tooltip — name + tagline only
- No new page, no new CSS file beyond the flash animation in the existing `NeighborhoodsPage.css`
- All changes are additive — no existing behavior is modified except adding `id` attributes to neighborhood cards
