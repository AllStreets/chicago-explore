import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { RiHeartLine, RiHeartFill, RiCheckboxCircleLine } from 'react-icons/ri'
import useYelp from '../hooks/useYelp'
import { addFavorite, removeFavorite, addVisited, removeVisited } from '../hooks/useMe'
import MapPlaceholder from '../components/MapPlaceholder'
import './FoodPage.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN

const TYPES = ['all', 'restaurants', 'bars', 'cafes', 'pizza', 'sushi', 'tacos', 'brunch']

const BAR_KEYWORDS = ['bar', 'cocktail', 'lounge', 'nightlife', 'wine', 'beer', 'pub', 'spirits', 'tavern', 'brewery']

function isBar(place) {
  if (place.amenity === 'bar' || place.amenity === 'nightclub') return true
  const cats = (place.categories || []).map(c => c.toLowerCase())
  return cats.some(c => BAR_KEYWORDS.some(k => c.includes(k)))
}

// Returns ImageData — the one type mapboxgl.addImage accepts unconditionally
function makeIcon(bar) {
  const S = 28
  const canvas = document.createElement('canvas')
  canvas.width = S; canvas.height = S
  const ctx = canvas.getContext('2d')

  // Background circle
  ctx.beginPath()
  ctx.arc(S / 2, S / 2, S / 2 - 0.5, 0, Math.PI * 2)
  ctx.fillStyle = bar ? '#8b5cf6' : '#f97316'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 1; ctx.stroke()

  ctx.strokeStyle = 'white'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'

  if (bar) {
    // Martini glass
    ctx.lineWidth = 1.6
    ctx.beginPath(); ctx.moveTo(8, 7); ctx.lineTo(14, 15); ctx.lineTo(20, 7); ctx.closePath()
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(14, 15); ctx.lineTo(14, 21); ctx.stroke()
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(11, 21); ctx.lineTo(17, 21); ctx.stroke()
  } else {
    ctx.lineWidth = 1.6
    // Fork outer tines
    ctx.beginPath(); ctx.moveTo(8.5, 7); ctx.lineTo(8.5, 12); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(11.5, 7); ctx.lineTo(11.5, 12); ctx.stroke()
    // Fork center handle
    ctx.beginPath(); ctx.moveTo(10, 7); ctx.lineTo(10, 21); ctx.stroke()
    // Fork arch
    ctx.beginPath(); ctx.moveTo(8.5, 12); ctx.quadraticCurveTo(10, 13.5, 11.5, 12); ctx.stroke()
    // Knife
    ctx.beginPath(); ctx.moveTo(17, 7)
    ctx.bezierCurveTo(19.5, 8.5, 19.5, 13, 17, 14); ctx.lineTo(17, 21); ctx.stroke()
  }

  // Return plain object with Uint8ClampedArray — unambiguously matches mapboxgl.addImage signature
  const imageData = ctx.getImageData(0, 0, S, S)
  return { width: S, height: S, data: imageData.data }
}

function toGeoJSON(places) {
  return {
    type: 'FeatureCollection',
    features: places.filter(p => p.lat && p.lon).map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: {
        name:     p.name,
        rating:   p.rating,
        price:    p.price,
        category: p.categories?.[0] || '',
        address:  p.address || '',
        icon:     isBar(p) ? 'bar-icon' : 'food-icon',
      },
    })),
  }
}

export default function FoodPage() {
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const placesRef    = useRef([])   // latest places, readable inside map callbacks
  const [type, setType]   = useState('all')
  const [saved, setSaved] = useState({})
  const { places, loading } = useYelp({ type })

  // Init map once
  useEffect(() => {
    if (mapRef.current || !MAPBOX_TOKEN) return
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-87.6197, 41.8919],
      zoom: 13,
      pitch: 30,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left')

    map.on('load', () => {
      // Canvas icons — synchronous, no async loading issues
      map.addImage('food-icon', makeIcon(false))
      map.addImage('bar-icon',  makeIcon(true))

      map.addSource('places', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'place-icons',
        type: 'symbol',
        source: 'places',
        layout: {
          'icon-image':             ['get', 'icon'],
          'icon-size':              1,
          'icon-allow-overlap':     true,
          'icon-ignore-placement':  true,
          'icon-anchor':            'center',
        },
      })

      // If places arrived before the map loaded, paint them now
      if (placesRef.current.length > 0) {
        map.getSource('places').setData(toGeoJSON(placesRef.current))
      }

      map.on('click', 'place-icons', e => {
        const { name, rating, price, category, address } = e.features[0].properties
        new mapboxgl.Popup({ closeButton: false, offset: 16 })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(
            `<strong>${name}</strong>` +
            (address ? `<div style="color:#94a3b8;font-size:11px;margin:3px 0 2px">${address}</div>` : '') +
            `<small>${rating ? `${rating} ★  ` : ''}${price || ''}${category ? ` · ${category}` : ''}</small>`
          )
          .addTo(map)
      })
      map.on('mouseenter', 'place-icons', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'place-icons', () => { map.getCanvas().style.cursor = '' })
    })

    mapRef.current = map

    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(mapContainer.current)

    return () => { ro.disconnect(); map.remove(); mapRef.current = null }
  }, [])

  // Update markers whenever places changes
  useEffect(() => {
    placesRef.current = places
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const src = map.getSource('places')
    if (!src) return
    src.setData(toGeoJSON(places))
  }, [places])

  return (
    <div className="food-page">
      <div className="food-header">
        <span className="food-title">Food & Drink</span>
        <div className="food-filters">
          <div className="food-filter-types">
            {TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`food-filter-btn${type === t ? ' active' : ''}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="food-layout">
        <div className="food-list">
          {loading && <div className="food-loading">Loading places...</div>}
          {places.map(p => (
            <div key={p.id} className="food-card">
              <div className="food-card-name">
                <span className="food-card-type-dot" style={{ background: isBar(p) ? '#8b5cf6' : '#f97316' }} />
                {p.name}
              </div>
              <div className="food-card-meta">
                {p.rating != null && <span className="food-card-rating">{p.rating}</span>}
                {p.distance != null && <span className="food-card-rating">{(p.distance / 1000).toFixed(1)} km</span>}
                {p.price && <span className="food-card-price">{p.price}</span>}
                <span className="food-card-category">{p.categories?.[0]}</span>
              </div>
              <div className="food-card-neighborhood">{p.neighborhood}</div>
              <div className="food-card-actions">
                <button
                  className={`food-action-btn${saved[p.id] === 'favorite' ? ' active' : ''}`}
                  title={saved[p.id] === 'favorite' ? 'Remove from favorites' : 'Save to favorites'}
                  onClick={() => {
                    if (saved[p.id] === 'favorite') {
                      removeFavorite(p.id)
                      setSaved(s => ({ ...s, [p.id]: null }))
                    } else {
                      addFavorite({ id: p.id, name: p.name, lat: p.lat, lon: p.lon })
                      setSaved(s => ({ ...s, [p.id]: 'favorite' }))
                    }
                  }}
                >
                  {saved[p.id] === 'favorite' ? <RiHeartFill /> : <RiHeartLine />}
                </button>
                <button
                  className={`food-action-btn${saved[p.id] === 'visited' ? ' active visited' : ''}`}
                  title={saved[p.id] === 'visited' ? 'Remove from been there' : 'Mark as been there'}
                  onClick={() => {
                    if (saved[p.id] === 'visited') {
                      removeVisited(p.id)
                      setSaved(s => ({ ...s, [p.id]: null }))
                    } else {
                      addVisited({ id: p.id, name: p.name })
                      setSaved(s => ({ ...s, [p.id]: 'visited' }))
                    }
                  }}
                >
                  <RiCheckboxCircleLine />
                </button>
              </div>
            </div>
          ))}
        </div>
        {MAPBOX_TOKEN ? <div ref={mapContainer} className="food-map" /> : <div className="food-map"><MapPlaceholder /></div>}
      </div>
    </div>
  )
}
