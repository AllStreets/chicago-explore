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
import useHomeFeed from '../hooks/useHomeFeed'
import './HomePage.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const CENTER = [-87.6172, 41.8921]
const ZOOM   = 13.5

const LINE_COLOR_MAP = {
  Red: '#ef4444', Blue: '#3b82f6', Brn: '#92400e',
  G: '#10b981', Org: '#f97316', P: '#8b5cf6',
  Pink: '#ec4899', Y: '#eab308',
}

const BAR_KEYWORDS = ['bar', 'cocktail', 'lounge', 'nightlife', 'wine', 'beer', 'pub', 'spirits', 'tavern', 'brewery']
function isBar(place) {
  if (place.amenity === 'bar' || place.amenity === 'nightclub') return true
  const cats = (place.categories || []).map(c => c.toLowerCase())
  return cats.some(c => BAR_KEYWORDS.some(k => c.includes(k)))
}

function makeFoodIcon(bar) {
  const S = 28
  const canvas = document.createElement('canvas')
  canvas.width = S; canvas.height = S
  const ctx = canvas.getContext('2d')
  ctx.beginPath()
  ctx.arc(S/2, S/2, S/2 - 0.5, 0, Math.PI * 2)
  ctx.fillStyle = bar ? '#7c3aed' : '#f59e0b'; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.strokeStyle = 'white'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  if (bar) {
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(8,7); ctx.lineTo(14,15); ctx.lineTo(20,7); ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14,15); ctx.lineTo(14,21); ctx.stroke()
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(11,21); ctx.lineTo(17,21); ctx.stroke()
  } else {
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(8.5,7); ctx.lineTo(8.5,12); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(11.5,7); ctx.lineTo(11.5,12); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(10,7); ctx.lineTo(10,21); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(8.5,12); ctx.quadraticCurveTo(10,13.5,11.5,12); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(17,7)
    ctx.bezierCurveTo(19.5,8.5,19.5,13,17,14); ctx.lineTo(17,21); ctx.stroke()
  }
  const img = ctx.getImageData(0, 0, S, S)
  return { width: S, height: S, data: img.data }
}

function makeNlIcon(shape, color) {
  const S = 28
  const canvas = document.createElement('canvas')
  canvas.width = S; canvas.height = S
  const ctx = canvas.getContext('2d')
  ctx.beginPath()
  ctx.arc(S/2, S/2, S/2 - 0.5, 0, Math.PI * 2)
  ctx.fillStyle = color; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.strokeStyle = 'white'; ctx.fillStyle = 'white'
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  if (shape === 'beer') {
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.rect(7,8,11,13); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(18,11); ctx.bezierCurveTo(24,11,24,18,18,18); ctx.stroke()
    ctx.lineWidth = 1.8
    ctx.beginPath(); ctx.moveTo(10,8); ctx.lineTo(10,5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14,8); ctx.lineTo(14,6); ctx.stroke()
  } else {
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.arc(14,8,2.5,0,Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.moveTo(14,11); ctx.lineTo(14,18); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14,13); ctx.lineTo(8,9); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14,13); ctx.lineTo(20,10); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14,18); ctx.lineTo(9,23); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14,18); ctx.lineTo(20,22); ctx.stroke()
  }
  const img = ctx.getImageData(0, 0, S, S)
  return { width: S, height: S, data: img.data }
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
  { name: 'White Sox',  sport: 'baseball',   color: '#808080', coords: [-87.6338, 41.8300], stadium: 'Guaranteed Rate Field' },
  { name: 'Bears',      sport: 'football',   color: '#4a6c8c', coords: [-87.6167, 41.8623], stadium: 'Soldier Field' },
  { name: 'Bulls',      sport: 'basketball', color: '#ce1141', coords: [-87.6742, 41.8806], stadium: 'United Center' },
  { name: 'Blackhawks', sport: 'hockey',     color: '#cf0a2c', coords: [-87.6756, 41.8815], stadium: 'United Center' },
  { name: 'Fire',       sport: 'soccer',     color: '#9d2235', coords: [-87.6185, 41.8610], stadium: 'Soldier Field' },
]

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

    map.on('load', () => {
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

      map.addLayer({ id: 'cta-routes-atmo', type: 'line', source: 'cta-routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 40, 'line-blur': 28, 'line-opacity': 0.07 },
      }, labelLayer?.id)
      map.addLayer({ id: 'cta-routes-glow', type: 'line', source: 'cta-routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 7, 'line-blur': 2.5, 'line-opacity': 0.35 },
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
          .setHTML(`<strong>${line} Line</strong><small>Train #${rn}</small>`)
          .addTo(map)
      })
      map.on('mouseenter', 'cta-train-dots', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'cta-train-dots', () => { map.getCanvas().style.cursor = '' })

      // Food + nightlife icons
      map.addImage('home-food',      makeFoodIcon(false))
      map.addImage('home-bar',       makeFoodIcon(true))
      map.addImage('home-nl-bar',    makeNlIcon('beer',   '#a78bfa'))
      map.addImage('home-nl-dancer', makeNlIcon('dancer', '#f43f5e'))

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

      // Stadium sport icons
      STADIUMS.forEach(s => {
        map.addImage(`stadium-${s.sport}-${s.name.toLowerCase().replace(' ','')}`, makeStadiumIcon(s.sport, s.color))
      })
      map.addSource('stadiums', { type: 'geojson', data: stadiumGeoJSON() })
      map.addLayer({
        id: 'stadium-icons', type: 'symbol', source: 'stadiums',
        layout: {
          'icon-image': ['get', 'icon'], 'icon-size': 0.9,
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
        trainCount={feed.trainCount} nextEvent={feed.nextEvent}
        topSpots={getBuzzingSpots(feed.tonightGames || [], nightlifePlaces, foodPlaces)}
        tonightGames={feed.tonightGames || []}
      />
    </div>
  )
}
