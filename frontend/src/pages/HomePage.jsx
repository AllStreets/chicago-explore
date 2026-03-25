// frontend/src/pages/HomePage.jsx
import { useEffect, useRef } from 'react'
import { RiWifiLine, RiRefreshLine } from 'react-icons/ri'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import IntelFeed from '../components/IntelFeed'
import MapPlaceholder from '../components/MapPlaceholder'
import useCTA from '../hooks/useCTA'
import { sharedTrainState } from '../hooks/trainAnimState'
import useWeather from '../hooks/useWeather'
import useYelp from '../hooks/useYelp'
import { makeMapPin } from '../utils/mapIcons'
import useHomeFeed from '../hooks/useHomeFeed'
import './HomePage.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const CENTER = [-87.6172, 41.8921]
const ZOOM   = 13.5

const LINE_COLOR_MAP = {
  Red: '#ff0033', Blue: '#3b82f6', Brn: '#92400e',
  G: '#10b981', Org: '#f97316', P: '#8b5cf6',
  Pink: '#ec4899', Y: '#eab308',
}
const LINE_NAME_MAP = {
  Red: 'Red Line', Blue: 'Blue Line', Brn: 'Brown Line',
  G: 'Green Line', Org: 'Orange Line', P: 'Purple Line',
  Pexp: 'Purple Line Express', Pink: 'Pink Line', Y: 'Yellow Line',
}

const BAR_KEYWORDS = ['bar', 'cocktail', 'lounge', 'nightlife', 'wine', 'beer', 'pub', 'spirits', 'tavern', 'brewery']
function isBar(place) {
  if (place.amenity === 'bar' || place.amenity === 'nightclub') return true
  const cats = (place.categories || []).map(c => c.toLowerCase())
  return cats.some(c => BAR_KEYWORDS.some(k => c.includes(k)))
}


const SPORTS_BAR_KEYS = ['sport', 'slugger', 'bleacher', 'cubby', 'tap', 'game day', 'game bar', 'pub', 'bar & grill', 'grill & bar', 'irish', 'fado', 'sideline', 'draft', 'replay']

function getBuzzingSpots(tonightGames, nightlifePlaces, foodPlaces) {
  const day = new Date().getDay()          // 0=Sun … 6=Sat
  const isWeekendNight = day === 5 || day === 6
  const hasGame = tonightGames.length > 0

  if (hasGame) {
    // During game nights: prefer sports bars, then other bars
    const sportsBars = nightlifePlaces.filter(p =>
      isBar(p) && SPORTS_BAR_KEYS.some(k => (p.name || '').toLowerCase().includes(k))
    )
    const otherBars = nightlifePlaces.filter(p =>
      isBar(p) && !sportsBars.some(s => s.id === p.id)
    )
    const combined = [...sportsBars, ...otherBars].slice(0, 5)
    if (combined.length >= 3) return combined
    // Pad with food if not enough bars
    return [...combined, ...foodPlaces.filter(f => !combined.some(c => c.id === f.id))].slice(0, 4)
  }

  if (isWeekendNight) {
    // Fri/Sat: bars and nightclubs
    const barsAndClubs = nightlifePlaces.filter(p => isBar(p) || p.amenity === 'nightclub')
    if (barsAndClubs.length >= 3) return barsAndClubs.slice(0, 5)
    return [...barsAndClubs, ...foodPlaces].slice(0, 4)
  }

  // Default: popular restaurants
  return foodPlaces.slice(0, 3)
}

function toFoodGeoJSON(places) {
  return {
    type: 'FeatureCollection',
    features: places.filter(p => p.lat && p.lon).map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: {
        name:     p.name,
        address:  p.address || '',
        category: p.categories?.[0] || '',
        icon:     isBar(p) ? 'home-bar' : 'home-food',
      },
    })),
  }
}

// ── Stadium icons ──────────────────────────────────────────────────────────────
const STADIUMS = [
  { name: 'Cubs',       sport: 'baseball',   color: '#0e3386', coords: [-87.6554, 41.9484], stadium: 'Wrigley Field' },
  { name: 'White Sox',  sport: 'baseball',   color: '#1a1a1a', coords: [-87.6338, 41.8300], stadium: 'Guaranteed Rate Field' },
  { name: 'Bears',      sport: 'football',   color: '#0b162a', coords: [-87.6167, 41.8623], stadium: 'Soldier Field' },
  { name: 'Bulls',      sport: 'basketball', color: '#ce1141', coords: [-87.6742, 41.8806], stadium: 'United Center' },
  { name: 'Blackhawks', sport: 'hockey',     color: '#cf0a2c', coords: [-87.6756, 41.8815], stadium: 'United Center' },
  { name: 'Fire',       sport: 'soccer',     color: '#9d2235', coords: [-87.6185, 41.8610], stadium: 'Soldier Field' },
]

// Official team logo URLs (ESPN CDN — publicly accessible)
const STADIUM_LOGOS = {
  'Cubs':       'https://a.espncdn.com/combiner/i?img=/i/teamlogos/mlb/500/chc.png',
  'White Sox':  'https://a.espncdn.com/combiner/i?img=/i/teamlogos/mlb/500/cws.png',
  'Bears':      'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/chi.png',
  'Bulls':      'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/chi.png',
  'Blackhawks': 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nhl/500/chi.png',
  'Fire':       'https://a.espncdn.com/combiner/i?img=/i/teamlogos/soccer/500/chif.png',
}

function loadStadiumLogo(map, s) {
  const iconKey = `stadium-${s.sport}-${s.name.toLowerCase().replace(' ', '')}`
  const url = STADIUM_LOGOS[s.name]
  if (!url) { map.addImage(iconKey, makeStadiumIcon(s.sport, s.color)); return Promise.resolve() }
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const S = 64
      const c = document.createElement('canvas')
      c.width = S; c.height = S
      const x = c.getContext('2d')
      // Colored circle background, clipped
      x.save()
      x.beginPath(); x.arc(S/2, S/2, S/2 - 1, 0, Math.PI * 2)
      x.fillStyle = s.color; x.fill()
      x.clip()
      const pad = 5
      x.drawImage(img, pad, pad, S - pad * 2, S - pad * 2)
      x.restore()
      // White border ring
      x.beginPath(); x.arc(S/2, S/2, S/2 - 1.5, 0, Math.PI * 2)
      x.strokeStyle = 'rgba(255,255,255,0.65)'; x.lineWidth = 2.5; x.stroke()
      const data = x.getImageData(0, 0, S, S)
      map.addImage(iconKey, { width: S, height: S, data: data.data }, { pixelRatio: 2 })
      resolve()
    }
    img.onerror = () => { map.addImage(iconKey, makeStadiumIcon(s.sport, s.color)); resolve() }
    img.src = url
  })
}

function makeStadiumIcon(sport, color) {
  const S = 30
  const canvas = document.createElement('canvas')
  canvas.width = S; canvas.height = S
  const ctx = canvas.getContext('2d')
  // Background circle
  ctx.beginPath(); ctx.arc(S/2, S/2, S/2 - 1, 0, Math.PI * 2)
  ctx.fillStyle = color; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  const cx = S/2, cy = S/2
  if (sport === 'basketball') {
    ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(cx, cy-7); ctx.lineTo(cx, cy+7); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx-7, cy); ctx.lineTo(cx+7, cy); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0.35, Math.PI-0.35); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy, 5, Math.PI+0.35, 2*Math.PI-0.35); ctx.stroke()
  } else if (sport === 'baseball') {
    ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.moveTo(cx-5, cy-5); ctx.bezierCurveTo(cx-8, cy, cx-8, cy, cx-5, cy+5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx+5, cy-5); ctx.bezierCurveTo(cx+8, cy, cx+8, cy, cx+5, cy+5); ctx.stroke()
    for (let i = -1; i <= 1; i++) {
      ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(cx-6, cy + i*2.5); ctx.lineTo(cx-4, cy + i*2.5 + 1.5); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx+6, cy + i*2.5); ctx.lineTo(cx+4, cy + i*2.5 + 1.5); ctx.stroke()
    }
  } else if (sport === 'football') {
    ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.ellipse(cx, cy, 7.5, 5, 0, 0, Math.PI*2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx, cy-4.5); ctx.lineTo(cx, cy+4.5); ctx.stroke()
    for (const dy of [-1.5, 1.5]) {
      ctx.beginPath(); ctx.moveTo(cx-2.5, cy+dy); ctx.lineTo(cx+2.5, cy+dy); ctx.stroke()
    }
  } else if (sport === 'hockey') {
    ctx.lineWidth = 1.4
    ctx.beginPath(); ctx.ellipse(cx, cy, 8, 4.5, 0, 0, Math.PI*2)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke()
    ctx.beginPath(); ctx.ellipse(cx, cy, 5.5, 2.5, 0, 0, Math.PI*2)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke()
  } else if (sport === 'soccer') {
    ctx.lineWidth = 1.4
    // Central pentagon
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI / 5) - Math.PI / 2
      if (i === 0) ctx.moveTo(cx + 3.5*Math.cos(a), cy + 3.5*Math.sin(a))
      else ctx.lineTo(cx + 3.5*Math.cos(a), cy + 3.5*Math.sin(a))
    }
    ctx.closePath(); ctx.stroke()
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI / 5) - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(cx + 3.5*Math.cos(a), cy + 3.5*Math.sin(a))
      ctx.lineTo(cx + 7*Math.cos(a), cy + 7*Math.sin(a))
      ctx.stroke()
    }
  }
  const img = ctx.getImageData(0, 0, S, S)
  return { width: S, height: S, data: img.data }
}

function stadiumGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: STADIUMS.map(s => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: s.coords },
      properties: { name: s.name, stadium: s.stadium, icon: `stadium-${s.sport}-${s.name.toLowerCase().replace(' ','')}` },
    })),
  }
}

function toNlGeoJSON(places) {
  return {
    type: 'FeatureCollection',
    features: places.filter(p => p.lat && p.lon).map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: {
        name:     p.name,
        address:  p.address || '',
        category: p.categories?.[0] || '',
        icon:     p.amenity === 'nightclub' ? 'home-nl-dancer' : 'home-nl-bar',
      },
    })),
  }
}

let _routesCache = null

export default function HomePage() {
  const mapContainer   = useRef(null)
  const mapRef         = useRef(null)
  const pulseRef       = useRef(null)
  const rafRef         = useRef(null)
  const trainDataRef   = useRef([])
  const trainStateRef  = useRef(sharedTrainState)
  const foodRef        = useRef([])
  const nightlifeRef   = useRef([])
  const GLIDE_MS = 8000

  const { trains, loading, refresh }          = useCTA()
  const { weather, lake }                     = useWeather()
  const { places: foodPlaces }                = useYelp({ type: 'all' })
  const { places: nightlifePlaces }           = useYelp({ type: 'nightlife_all' })
  const { feed }                              = useHomeFeed()

  useEffect(() => {
    trainDataRef.current = trains
    const now = Date.now()
    trains.forEach(t => {
      const prev = trainStateRef.current[t.rn]
      trainStateRef.current[t.rn] = {
        lat:  prev?.lat  ?? t.lat,
        lon:  prev?.lon  ?? t.lon,
        fromLat: prev?.lat ?? t.lat,
        fromLon: prev?.lon ?? t.lon,
        toLat: t.lat,
        toLon: t.lon,
        startTime: now,
      }
    })
  }, [trains])

  useEffect(() => {
    if (mapRef.current || !MAPBOX_TOKEN) return
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: CENTER,
      zoom: ZOOM,
      pitch: 45,
      bearing: -17.6,
      antialias: true,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left')

    map.on('load', async () => {
      const layers = map.getStyle().layers
      const labelLayer = layers.find(l => l.type === 'symbol' && l.layout?.['text-field'])

      // 3D buildings
      map.addLayer({
        id: '3d-buildings', source: 'composite', 'source-layer': 'building',
        filter: ['==', 'extrude', 'true'], type: 'fill-extrusion', minzoom: 12,
        paint: {
          'fill-extrusion-color': '#0f1f3a',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.8,
        },
      }, labelLayer?.id)

      // CTA routes
      map.addSource('cta-routes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      ((_routesCache
        ? Promise.resolve(_routesCache)
        : fetch(`${API}/api/cta/routes`).then(r => r.json()).then(d => { _routesCache = d; return d })
      ).then(g => { if (map.getSource('cta-routes')) map.getSource('cta-routes').setData(g) }).catch(() => {}))

      const noGlowColor = ['case',
        ['any',
          ['==', ['get', 'color'], '#92400e'],
          ['==', ['get', 'color'], '#ec4899'],
          ['==', ['get', 'color'], '#ff0033'],
        ],
        'rgba(0,0,0,0)',
        ['get', 'color'],
      ]
      map.addLayer({ id: 'cta-routes-atmo', type: 'line', source: 'cta-routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': noGlowColor, 'line-width': 24, 'line-blur': 18, 'line-opacity': 0.04 },
      }, labelLayer?.id)
      map.addLayer({ id: 'cta-routes-glow', type: 'line', source: 'cta-routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': noGlowColor, 'line-width': 5, 'line-blur': 2, 'line-opacity': 0.22 },
      }, labelLayer?.id)
      map.addLayer({ id: 'cta-routes-solid', type: 'line', source: 'cta-routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 2.5, 'line-opacity': 0.92 },
      }, labelLayer?.id)
      map.addLayer({ id: 'cta-routes-core', type: 'line', source: 'cta-routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 0.75, 'line-opacity': 0.22 },
      }, labelLayer?.id)

      // Train sources + layers
      map.addSource('cta-trains', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'cta-train-ring', type: 'circle', source: 'cta-trains',
        paint: {
          'circle-radius': 11, 'circle-color': ['get', 'color'],
          'circle-opacity': 0.12, 'circle-stroke-width': 0,
        }
      })
      map.addLayer({ id: 'cta-train-dots', type: 'circle', source: 'cta-trains',
        paint: {
          'circle-radius': 4, 'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5,
          'circle-stroke-opacity': 0.85, 'circle-opacity': 1,
        }
      })
      map.on('click', 'cta-train-dots', e => {
        const { line, rn } = e.features[0].properties
        new mapboxgl.Popup({ closeButton: false, offset: 10 })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(`<strong>${LINE_NAME_MAP[line] || line || 'CTA'}</strong><small>Train #${rn}</small>`)
          .addTo(map)
      })
      map.on('mouseenter', 'cta-train-dots', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'cta-train-dots', () => { map.getCanvas().style.cursor = '' })

      // Food + nightlife icons
      map.addImage('home-food',      makeMapPin('fork',    '#00d4ff'), { pixelRatio: 2 })
      map.addImage('home-bar',       makeMapPin('martini', '#7c3aed'), { pixelRatio: 2 })
      map.addImage('home-nl-bar',    makeMapPin('martini', '#7c3aed'), { pixelRatio: 2 })
      map.addImage('home-nl-dancer', makeMapPin('dancer',  '#f43f5e'), { pixelRatio: 2 })

      // Food places layer
      map.addSource('home-food', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'home-food-icons', type: 'symbol', source: 'home-food',
        layout: {
          'icon-image': ['get', 'icon'], 'icon-size': 0.85,
          'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-anchor': 'center',
        },
      })
      map.on('click', 'home-food-icons', e => {
        const { name, address, category } = e.features[0].properties
        new mapboxgl.Popup({ closeButton: false, offset: 16 })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(
            `<strong>${name}</strong>` +
            (address  ? `<div style="color:#94a3b8;font-size:11px;margin:3px 0 2px">${address}</div>` : '') +
            (category ? `<small>${category}</small>` : '')
          )
          .addTo(map)
      })
      map.on('mouseenter', 'home-food-icons', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'home-food-icons', () => { map.getCanvas().style.cursor = '' })

      // Nightlife places layer
      map.addSource('home-nightlife', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'home-nl-icons', type: 'symbol', source: 'home-nightlife',
        layout: {
          'icon-image': ['get', 'icon'], 'icon-size': 0.85,
          'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-anchor': 'center',
        },
      })
      map.on('click', 'home-nl-icons', e => {
        const { name, address, category } = e.features[0].properties
        new mapboxgl.Popup({ closeButton: false, offset: 16 })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(
            `<strong>${name}</strong>` +
            (address  ? `<div style="color:#94a3b8;font-size:11px;margin:3px 0 2px">${address}</div>` : '') +
            (category ? `<small>· ${category}</small>` : '')
          )
          .addTo(map)
      })
      map.on('mouseenter', 'home-nl-icons', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'home-nl-icons', () => { map.getCanvas().style.cursor = '' })

      // Stadium team logos — load from ESPN CDN, fall back to canvas icons
      await Promise.allSettled(STADIUMS.map(s => loadStadiumLogo(map, s)))
      map.addSource('stadiums', { type: 'geojson', data: stadiumGeoJSON() })
      map.addLayer({
        id: 'stadium-icons', type: 'symbol', source: 'stadiums',
        layout: {
          'icon-image': ['get', 'icon'],
          // Bulls + Bears scale up when zoomed out so they dominate their shared venues
          'icon-size': 0.9,
          'symbol-sort-key': ['match', ['get', 'name'], ['Bulls', 'Bears'], 1, 0],
          'icon-allow-overlap': true, 'icon-ignore-placement': true, 'icon-anchor': 'center',
        },
      })
      map.on('click', 'stadium-icons', e => {
        const { name, stadium } = e.features[0].properties
        new mapboxgl.Popup({ closeButton: false, offset: 16 })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(`<strong>${name}</strong><div style="color:#94a3b8;font-size:11px;margin-top:3px">${stadium}</div>`)
          .addTo(map)
      })
      map.on('mouseenter', 'stadium-icons', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'stadium-icons', () => { map.getCanvas().style.cursor = '' })

      // If data arrived before map loaded, paint now
      if (foodRef.current.length > 0) {
        map.getSource('home-food').setData(toFoodGeoJSON(foodRef.current))
      }
      if (nightlifeRef.current.length > 0) {
        map.getSource('home-nightlife').setData(toNlGeoJSON(nightlifeRef.current))
      }

      // Pulse marker
      const el = document.createElement('div')
      el.className = 'streeterville-pulse'
      el.innerHTML = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="pointer-events:none">
        <polyline points="2,9 10,2 18,9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <rect x="4" y="9" width="12" height="9" rx="0.5" fill="white" fill-opacity="0.9"/>
        <rect x="7.5" y="13" width="5" height="5" rx="0.5" fill="#e11d48"/>
      </svg>`
      el.style.cursor = 'pointer'
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        new mapboxgl.Popup({ closeButton: false, offset: 18 })
          .setLngLat(CENTER)
          .setHTML(
            `<strong>Moment Apartments</strong>` +
            `<div style="color:#94a3b8;font-size:11px;margin:3px 0 2px">545 N. McClurg Ct., Chicago, IL 60611</div>` +
            `<small>· Apartment building</small>`
          )
          .addTo(map)
      })
      pulseRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(CENTER).addTo(map)

      // Animation loop — glow breathing + ring pulsing + smooth train position lerp
      let glowPhase = 0, ringPhase = 0
      const animate = () => {
        glowPhase += 0.006
        ringPhase += 0.03

        if (map.getLayer('cta-routes-glow')) {
          const glow = 0.28 + Math.sin(glowPhase) * 0.12
          map.setPaintProperty('cta-routes-glow', 'line-opacity', glow)
          map.setPaintProperty('cta-routes-atmo', 'line-opacity', 0.04 + Math.sin(glowPhase) * 0.04)
        }
        if (map.getLayer('cta-train-ring')) {
          const halo = 0.07 + (1 + Math.sin(ringPhase)) / 2 * 0.13
          map.setPaintProperty('cta-train-ring', 'circle-opacity', halo)
        }

        const now = Date.now()
        const states = trainStateRef.current
        const trainList = trainDataRef.current
        if (trainList.length > 0) {
          for (const state of Object.values(states)) {
            const t = Math.min((now - state.startTime) / GLIDE_MS, 1)
            const p = 1 - Math.pow(1 - t, 3)  // cubic ease-out
            state.lat = state.fromLat + (state.toLat - state.fromLat) * p
            state.lon = state.fromLon + (state.toLon - state.fromLon) * p
          }
          if (map.getSource('cta-trains') && map.isStyleLoaded()) {
            map.getSource('cta-trains').setData({
              type: 'FeatureCollection',
              features: trainList.map(t => {
                const s = states[t.rn]
                return {
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: [s?.lon ?? t.lon, s?.lat ?? t.lat] },
                  properties: { rn: t.rn, line: t.line, color: LINE_COLOR_MAP[t.line] || '#00d4ff' }
                }
              })
            })
          }
        }

        rafRef.current = requestAnimationFrame(animate)
      }
      rafRef.current = requestAnimationFrame(animate)
    })

    mapRef.current = map
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (pulseRef.current) { pulseRef.current.remove(); pulseRef.current = null }
      map.remove(); mapRef.current = null
    }
  }, [])

  // Update food layer
  useEffect(() => {
    foodRef.current = foodPlaces
    const src = mapRef.current?.getSource('home-food')
    if (src) src.setData(toFoodGeoJSON(foodPlaces))
  }, [foodPlaces])

  // Update nightlife layer
  useEffect(() => {
    nightlifeRef.current = nightlifePlaces
    const src = mapRef.current?.getSource('home-nightlife')
    if (src) src.setData(toNlGeoJSON(nightlifePlaces))
  }, [nightlifePlaces])

  return (
    <div className="home-page">
      {MAPBOX_TOKEN
        ? <div ref={mapContainer} className="home-map" />
        : <div className="home-map"><MapPlaceholder /></div>}
      <div className="home-map-overlay">
        <span className="home-live-badge">
          <RiWifiLine size={9} />
          LIVE CTA DATA
        </span>
        <button
          className={`home-refresh-btn${loading ? ' spinning' : ''}`}
          onClick={refresh}
          title="Refresh train data"
        >
          <RiRefreshLine size={13} />
        </button>
      </div>
      <IntelFeed
        weather={weather} lake={lake} trains={trains}
        trainCount={trains.length || feed.trainCount} nextEvent={feed.nextEvent}
        topSpots={getBuzzingSpots(feed.tonightGames || [], nightlifePlaces, foodPlaces)}
        tonightGames={feed.tonightGames || []}
      />
    </div>
  )
}
