import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { RiHeartLine, RiHeartFill, RiCheckboxCircleLine, RiMusicFill, RiBuildingLine } from 'react-icons/ri'
import useYelp from '../hooks/useYelp'
import { addFavorite, removeFavorite, addVisited, removeVisited } from '../hooks/useMe'
import MapPlaceholder from '../components/MapPlaceholder'
import './NightlifePage.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN

// Inline SVG icon components — exact shapes for each category
const AllIcon       = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
const BeerMugIcon   = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="9" height="12" rx="1.5" fill="currentColor" fillOpacity=".25"/><path d="M11 6h2.5a1.5 1.5 0 010 3H11"/><line x1="4" y1="3" x2="4" y2="1"/><line x1="7" y1="3" x2="7" y2="1.5"/></svg>
const DancerIcon    = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="2.5" r="1.5" fill="currentColor" stroke="none"/><line x1="8" y1="4" x2="8" y2="9"/><line x1="8" y1="6" x2="4" y2="4"/><line x1="8" y1="6" x2="12" y2="5"/><line x1="8" y1="9" x2="5.5" y2="14"/><line x1="8" y1="9" x2="11" y2="13.5"/></svg>
const WineGlassIcon = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 2C4 2 3.5 8 8 8S12 2 12 2H4z" fill="currentColor" fillOpacity=".25"/><line x1="8" y1="8" x2="8" y2="14"/><line x1="5" y1="14" x2="11" y2="14"/></svg>
const MartiniIcon   = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2L14 2L8 9Z" fill="currentColor" fillOpacity=".25"/><line x1="8" y1="9" x2="8" y2="14"/><line x1="5" y1="14" x2="11" y2="14"/></svg>

const CATEGORIES = [
  { key: 'nightlife_all', label: 'All',           color: '#00d4ff', Icon: AllIcon,       shape: null       },
  { key: 'bars',          label: 'Bars',           color: '#a78bfa', Icon: BeerMugIcon,   shape: 'beer'     },
  { key: 'danceclub',     label: 'Night Clubs',    color: '#f43f5e', Icon: DancerIcon,    shape: 'dancer'   },
  { key: 'cocktailbars',  label: 'Cocktail Bars',  color: '#2dd4bf', Icon: MartiniIcon,   shape: 'martini'  },
  { key: 'rooftop_bars',  label: 'Rooftop Bars',   color: '#38bdf8', Icon: RiBuildingLine,shape: 'building' },
  { key: 'wine_bars',     label: 'Wine Bars',      color: '#fb7185', Icon: WineGlassIcon, shape: 'wine'     },
  { key: 'jazzandblues',  label: 'Jazz & Blues',   color: '#fbbf24', Icon: RiMusicFill,   shape: 'music'    },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

// Neighborhood bounding polygons — trimmed east to avoid Lake Michigan
const SCENES = [
  { key: 'river_north',   name: 'River North',            vibe: 'Upscale clubs, rooftops, see-and-be-seen',    color: '#f97316',
    poly: [[-87.648,41.883],[-87.625,41.883],[-87.625,41.900],[-87.648,41.900],[-87.648,41.883]] },
  { key: 'wicker_park',   name: 'Wicker Park / Bucktown', vibe: 'Indie bars, late-night tacos, no dress code',  color: '#8b5cf6',
    poly: [[-87.691,41.908],[-87.664,41.908],[-87.664,41.924],[-87.691,41.924],[-87.691,41.908]] },
  { key: 'wrigleyville',  name: 'Wrigleyville',            vibe: 'Sports bars, Cubs game crowds, rowdy fun',     color: '#ef4444',
    poly: [[-87.663,41.943],[-87.647,41.943],[-87.647,41.958],[-87.663,41.958],[-87.663,41.943]] },
  { key: 'andersonville', name: 'Andersonville',           vibe: 'LGBTQ+ welcoming, cozy bars, diverse crowd',  color: '#10b981',
    poly: [[-87.669,41.974],[-87.654,41.974],[-87.654,41.986],[-87.669,41.986],[-87.669,41.974]] },
  { key: 'west_loop',     name: 'West Loop',               vibe: 'Craft cocktails, chef-driven, wine bars',      color: '#00d4ff',
    poly: [[-87.657,41.875],[-87.643,41.875],[-87.643,41.889],[-87.657,41.889],[-87.657,41.875]] },
  { key: 'lincoln_park',  name: 'Lincoln Park',            vibe: 'Bar crawls, DePaul crowd, rooftop patios',    color: '#eab308',
    poly: [[-87.648,41.918],[-87.631,41.918],[-87.631,41.935],[-87.648,41.935],[-87.648,41.918]] },
  { key: 'streeterville', name: 'Streeterville',           vibe: 'Hotel rooftop bars, lakefront views, Mag Mile adjacent', color: '#1e40af',
    poly: [[-87.624,41.888],[-87.614,41.888],[-87.614,41.898],[-87.624,41.898],[-87.624,41.888]] },
]

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

function makeIcon(shape, color) {
  const S = 28
  const canvas = document.createElement('canvas')
  canvas.width = S; canvas.height = S
  const ctx = canvas.getContext('2d')

  // Background circle
  ctx.beginPath()
  ctx.arc(S/2, S/2, S/2 - 0.5, 0, Math.PI * 2)
  ctx.fillStyle = color; ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; ctx.stroke()

  ctx.strokeStyle = 'white'; ctx.fillStyle = 'white'
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'

  if (shape === 'beer') {
    // Body x:7-18, y:8-21 → body center x=12.5, handle to x:24 → optical center ~14
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.rect(7, 8, 11, 13); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(18, 11); ctx.bezierCurveTo(24, 11, 24, 18, 18, 18); ctx.stroke()
    ctx.lineWidth = 1.8
    ctx.beginPath(); ctx.moveTo(10, 8); ctx.lineTo(10, 5); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14, 8); ctx.lineTo(14, 6); ctx.stroke()
  } else if (shape === 'dancer') {
    // Head y:5.5-10, legs to y:22 → center ~(14,13.75)
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.arc(14, 8, 2.5, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.moveTo(14, 11); ctx.lineTo(14, 18); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14, 13); ctx.lineTo(8,   9); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14, 13); ctx.lineTo(20, 10); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14, 18); ctx.lineTo(9,  23); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14, 18); ctx.lineTo(20, 22); ctx.stroke()
  } else if (shape === 'music') {
    // Note head y:17, stem y:7-17 → center ~(14,13)
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.arc(11, 18, 2.8, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.moveTo(13.8, 18); ctx.lineTo(13.8, 7); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(13.8, 7); ctx.bezierCurveTo(20, 7, 21, 12, 18, 14); ctx.stroke()
  } else if (shape === 'building') {
    // Body x:9-21, y:6-22 → center (15, 14) — shift left 1px for better optical center
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.fillRect(8, 6, 12, 16)
    ctx.fillStyle = color
    ctx.fillRect(10,  8, 2, 2); ctx.fillRect(14,  8, 2, 2)
    ctx.fillRect(10, 12, 2, 2); ctx.fillRect(14, 12, 2, 2)
    ctx.fillRect(10, 16, 2, 2); ctx.fillRect(14, 16, 2, 2)
  } else if (shape === 'wine') {
    // Bowl top y:7, base y:21 → center y:14
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(9,  7); ctx.bezierCurveTo(8,  13, 11, 15, 14, 16); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(19, 7); ctx.bezierCurveTo(20, 13, 17, 15, 14, 16); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(9, 7); ctx.lineTo(19, 7); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14, 16); ctx.lineTo(14, 21); ctx.stroke()
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(11, 21); ctx.lineTo(17, 21); ctx.stroke()
  } else {
    // martini: top y:7, base y:21 → center y:14
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(8, 7); ctx.lineTo(14, 15); ctx.lineTo(20, 7); ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fill()
    ctx.strokeStyle = 'white'; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14, 15); ctx.lineTo(14, 21); ctx.stroke()
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(11, 21); ctx.lineTo(17, 21); ctx.stroke()
  }

  const img = ctx.getImageData(0, 0, S, S)
  return { width: S, height: S, data: img.data }
}

function toGeoJSON(places, catKey) {
  return {
    type: 'FeatureCollection',
    features: places.filter(p => p.lat && p.lon).map(p => {
      const icon = catKey === 'nightlife_all'
        ? (p.amenity === 'nightclub' ? 'nl-danceclub' : 'nl-bars')
        : `nl-${catKey}`
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: { name: p.name, category: p.categories?.[0] || '', address: p.address || '', icon },
      }
    }),
  }
}

export default function NightlifePage() {
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const placesRef    = useRef([])
  const catRef       = useRef('nightlife_all')
  const [cat, setCat]     = useState('nightlife_all')
  const [saved, setSaved] = useState({})

  const { places, loading } = useYelp({ type: cat })

  useEffect(() => {
    if (mapRef.current || !MAPBOX_TOKEN) return
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-87.645, 41.920],
      zoom: 11.8,
      pitch: 20,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left')

    map.on('load', () => {
      // Register one icon per category + defaults for "all"
      CATEGORIES.filter(c => c.shape).forEach(c => {
        map.addImage(`nl-${c.key}`, makeIcon(c.shape, c.color))
      })
      map.addImage('nl-bars',     makeIcon('beer',   '#a78bfa'))
      map.addImage('nl-danceclub',makeIcon('dancer', '#f43f5e'))

      // Neighborhood highlight polygons (static context — always shown)
      map.addSource('nl-hoods', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: SCENES.map(s => ({
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [s.poly] },
            properties: { color: s.color },
          })),
        },
      })
      map.addLayer({ id: 'nl-hood-fill', type: 'fill',   source: 'nl-hoods',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.1 } })
      map.addLayer({ id: 'nl-hood-line', type: 'line',   source: 'nl-hoods',
        paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-opacity': 0.5 } })

      // Places icon layer
      map.addSource('nl-places', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'nl-icons', type: 'symbol', source: 'nl-places',
        layout: {
          'icon-image':            ['get', 'icon'],
          'icon-size':             1,
          'icon-allow-overlap':    true,
          'icon-ignore-placement': true,
          'icon-anchor':           'center',
        },
      })

      // If places already loaded before map was ready, paint them now
      if (placesRef.current.length > 0) {
        map.getSource('nl-places').setData(toGeoJSON(placesRef.current, catRef.current))
      }

      map.on('click', 'nl-icons', e => {
        const { name, category, address } = e.features[0].properties
        new mapboxgl.Popup({ closeButton: false, offset: 16 })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(
            `<strong>${name}</strong>` +
            (address  ? `<div style="color:#94a3b8;font-size:11px;margin:3px 0 2px">${address}</div>` : '') +
            (category ? `<small>· ${category}</small>` : '')
          )
          .addTo(map)
      })
      map.on('mouseenter', 'nl-icons', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'nl-icons', () => { map.getCanvas().style.cursor = '' })
    })

    mapRef.current = map

    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(mapContainer.current)

    return () => { ro.disconnect(); map.remove(); mapRef.current = null }
  }, [])

  // Update icons whenever places change — source existence check replaces isStyleLoaded()
  useEffect(() => {
    placesRef.current = places
    const src = mapRef.current?.getSource('nl-places')
    if (src) src.setData(toGeoJSON(places, catRef.current))
  }, [places])

  const handleCat = (key) => {
    catRef.current = key
    setCat(key)
    // Immediately re-render with current places in new icon style
    const src = mapRef.current?.getSource('nl-places')
    if (src) src.setData(toGeoJSON(placesRef.current, key))
  }

  const activeCat = CAT_MAP[cat]

  return (
    <div className="nightlife-page">
      <div className="nightlife-header">
        <span className="nightlife-title">Nightlife</span>
        <div className="nightlife-filters">
          {CATEGORIES.map(c => {
            const active = cat === c.key
            return (
              <button
                key={c.key}
                className={`nightlife-filter-btn${active ? ' active' : ''}`}
                style={active ? {
                  borderColor: c.color,
                  color: c.color,
                  background: `rgba(${hexToRgb(c.color)},0.12)`,
                } : {}}
                onClick={() => handleCat(c.key)}
              >
                <c.Icon size={12} />
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="nightlife-layout">
        <div className="nightlife-sidebar">
          <div className="nightlife-scenes-label">SCENE PROFILES</div>
          {SCENES.map(s => (
            <div key={s.key} className="nightlife-scene" style={{ borderLeftColor: s.color }}>
              <div className="nightlife-scene-name">{s.name}</div>
              <div className="nightlife-scene-vibe">{s.vibe}</div>
            </div>
          ))}

          <div className="nightlife-list-label">PLACES</div>
          {loading && <div className="nightlife-loading">Loading...</div>}
          {places.map(p => {
            const dotColor = cat === 'nightlife_all'
              ? (p.amenity === 'nightclub' ? '#f43f5e' : '#a78bfa')
              : (activeCat?.color || '#a78bfa')
            return (
              <div key={p.id} className="nightlife-card">
                <div className="nightlife-card-top">
                  <div className="nightlife-card-name">
                    <span className="nightlife-card-dot" style={{ background: dotColor }} />
                    {p.name}
                  </div>
                </div>
                <div className="nightlife-card-meta">
                  <span className="nightlife-card-hood">{p.address || p.neighborhood}</span>
                </div>
                <div className="nightlife-card-actions">
                  <button
                    className={`nightlife-action-btn${saved[p.id] === 'favorite' ? ' active' : ''}`}
                    title={saved[p.id] === 'favorite' ? 'Remove from favorites' : 'Save to favorites'}
                    onClick={() => {
                      if (saved[p.id] === 'favorite') {
                        removeFavorite(p.id)
                        setSaved(sv => ({ ...sv, [p.id]: null }))
                      } else {
                        addFavorite({ id: p.id, name: p.name, lat: p.lat, lon: p.lon })
                        setSaved(sv => ({ ...sv, [p.id]: 'favorite' }))
                      }
                    }}
                  >
                    {saved[p.id] === 'favorite' ? <RiHeartFill /> : <RiHeartLine />}
                  </button>
                  <button
                    className={`nightlife-action-btn${saved[p.id] === 'visited' ? ' active visited' : ''}`}
                    title={saved[p.id] === 'visited' ? 'Remove from been there' : 'Mark as been there'}
                    onClick={() => {
                      if (saved[p.id] === 'visited') {
                        removeVisited(p.id)
                        setSaved(sv => ({ ...sv, [p.id]: null }))
                      } else {
                        addVisited({ id: p.id, name: p.name })
                        setSaved(sv => ({ ...sv, [p.id]: 'visited' }))
                      }
                    }}
                  >
                    <RiCheckboxCircleLine />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {MAPBOX_TOKEN
          ? <div ref={mapContainer} className="nightlife-map" />
          : <div className="nightlife-map"><MapPlaceholder /></div>}
      </div>
    </div>
  )
}
