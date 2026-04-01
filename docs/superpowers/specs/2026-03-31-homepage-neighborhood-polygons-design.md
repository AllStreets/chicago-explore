# Homepage Neighborhood Polygons — Design Spec

## Goal

Add colored neighborhood polygon overlays to the homepage Mapbox map. All 12 neighborhoods from the Neighborhoods page are rendered as semi-transparent filled polygons with colored borders, positioned geographically on the map. Existing icons (bars, stadiums, CTA routes, train dots) render above the polygons. Hovering a polygon shows the neighborhood name and tagline; clicking navigates to that neighborhood's detail on the Neighborhoods page.

## Architecture

```
Chicago Open Data API (GeoJSON, free)
         ↓  first request only, then cached 24h in SQLite
GET /api/neighborhoods/boundaries
         ↓  filtered GeoJSON (12 features) with color + tagline injected
HomePage.jsx — fetched on map load
         ↓
Mapbox source: neighborhood-boundaries
Mapbox fill layer (opacity 0.15)   ← below all existing layers
Mapbox line layer (opacity 0.5)    ← below all existing layers
         ↓
CTA routes → train dots → stadium/bar icons (untouched, above)
```

**Data source:** City of Chicago Neighborhoods GeoJSON
`https://data.cityofchicago.org/api/geospatial/bbvz-uum9?method=export&type=GeoJSON`
98 neighborhoods, name-matched to our 12. Boundaries respect the lakefront — polygons never extend into Lake Michigan.

## Backend

### File: `backend/routes/neighborhoods.js`

Add one new endpoint to the existing router:

```
GET /api/neighborhoods/boundaries
```

**Behavior:**
1. Check `yelp_cache` for key `neighborhood_boundaries_v1` — return cached data if age < 24h
2. Fetch city GeoJSON (8s timeout)
3. Filter features to the 12 neighborhoods by case-insensitive name match
4. Inject `color` and `tagline` into each feature's `properties`
5. Cache the filtered FeatureCollection in `yelp_cache` as JSON
6. Return the FeatureCollection

**No new files, no new routes file, no schema changes.** Uses existing `yelp_cache` table and existing `stmtGet`/`stmtSet` prepared statements already in `neighborhoods.js`.

### Neighborhood color + tagline map

| Neighborhood | Color | Tagline (from existing NEIGHBORHOODS array) |
|---|---|---|
| Streeterville | `#1e40af` | Lakefront luxury, Navy Pier steps away |
| Wicker Park | `#8b5cf6` | Indie soul, vintage shops, late nights |
| Lincoln Park | `#eab308` | Lakefront parks, zoo, young professionals |
| Logan Square | `#f43f5e` | Boulevards, best restaurants, rising fast |
| River North | `#f97316` | Galleries, upscale dining, rooftop bars |
| South Loop | `#06b6d4` | Museum Campus, young pros, lakefront access |
| Bucktown | `#84cc16` | Residential, artsy, family-friendly |
| Andersonville | `#10b981` | Swedish heritage, LGBTQ+, indie shops |
| Pilsen | `#ef4444` | Murals everywhere, Mexican-American culture |
| Hyde Park | `#6366f1` | UChicago, Obama's neighborhood, architecture |
| Old Town | `#ec4899` | Comedy clubs, Second City, tree-lined streets |
| West Loop | `#00d4ff` | Fulton Market, Google HQ, best dining in city |

## Frontend

### File: `frontend/src/pages/HomePage.jsx`

**New state:**
```js
const [boundaries, setBoundaries] = useState(null)
```

**Fetch** (alongside existing weather/feed fetches, in `useEffect` on mount):
```js
fetch(`${API}/api/neighborhoods/boundaries`)
  .then(r => r.json())
  .then(setBoundaries)
  .catch(() => {})  // silent fail — map works fine without polygons
```

**Map layer setup** (inside the existing map `load` callback, after CTA routes are added):

1. Add source:
```js
map.addSource('neighborhood-boundaries', { type: 'geojson', data: boundaries })
```

2. Add fill layer (inserted before first symbol layer):
```js
map.addLayer({
  id: 'neighborhood-fill',
  type: 'fill',
  source: 'neighborhood-boundaries',
  paint: {
    'fill-color': ['get', 'color'],
    'fill-opacity': 0.15,
  }
}, firstSymbolLayerId)
```

3. Add line layer (inserted before first symbol layer):
```js
map.addLayer({
  id: 'neighborhood-line',
  type: 'line',
  source: 'neighborhood-boundaries',
  paint: {
    'line-color': ['get', 'color'],
    'line-opacity': 0.5,
    'line-width': 1.5,
  }
}, firstSymbolLayerId)
```

`firstSymbolLayerId` is determined by iterating `map.getStyle().layers` and finding the first layer with `type === 'symbol'`, ensuring all icons stay above the polygons.

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
  const id = e.features[0].properties.id
  navigate(`/neighborhoods#${id}`)
})
```

`useNavigate` already imported (or added alongside existing React Router imports).

The Neighborhoods page receives the hash on load, finds the matching card, and scrolls it into view + briefly highlights it (standard `scrollIntoView` + a CSS flash class).

**If boundaries haven't loaded yet when the map fires `load`:** a `useEffect` watches `boundaries` — when it becomes non-null and the map is already loaded, it adds the source and layers at that point instead.

## Interaction with Existing Layers

- CTA route lines: unaffected, render above polygons
- Train position dots: unaffected, render above polygons
- Stadium/bar/Streeterville pulse icons: unaffected, all symbol layers stay above fill and line layers
- The `noGlowColor` Mapbox expression on glow layers: unaffected

## Error Handling

- City API down or slow: `boundaries` stays `null`, map loads normally with no polygons, no error shown to user
- Neighborhood name not found in city data: that neighborhood is silently omitted (no crash)
- Cache hit path: `stmtGet` returns cached JSON, parsed and returned immediately with no outbound fetch

## What This Does NOT Include

- No polygon editing or custom boundary drawing
- No neighborhood-specific data (weather, events) shown in the polygon tooltip — name + tagline only
- No new page, no new CSS file — all changes are additive to existing files
- The Neighborhoods page scroll-highlight behavior on hash navigation is a small additive change, not a redesign
