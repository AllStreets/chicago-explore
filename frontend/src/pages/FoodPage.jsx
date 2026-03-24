import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import useYelp from '../hooks/useYelp'
import MapPlaceholder from '../components/MapPlaceholder'
import './FoodPage.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN

const TYPES = ['restaurants', 'bars', 'cafes', 'pizza', 'sushi', 'tacos', 'brunch']

export default function FoodPage() {
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const [type, setType] = useState('restaurants')
  const [openNow, setOpenNow] = useState(false)
  const { places, loading } = useYelp({ type, open_now: openNow ? 'true' : undefined })

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
      map.addSource('places', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'place-dots',
        type: 'circle',
        source: 'places',
        paint: {
          'circle-radius': 6,
          'circle-color': '#00d4ff',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
          'circle-opacity': 0.85,
        }
      })
      map.on('click', 'place-dots', e => {
        const { name, rating, price, category } = e.features[0].properties
        new mapboxgl.Popup()
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(`<strong>${name}</strong><br>${rating} stars · ${price}<br><small>${category}</small>`)
          .addTo(map)
      })
      map.on('mouseenter', 'place-dots', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'place-dots', () => { map.getCanvas().style.cursor = '' })
    })
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const src = map.getSource('places')
    if (!src) return
    src.setData({
      type: 'FeatureCollection',
      features: places
        .filter(p => p.lat && p.lon)
        .map(p => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: {
            name:     p.name,
            rating:   p.rating,
            price:    p.price,
            category: p.categories?.[0] || ''
          }
        }))
    })
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
          <label className="food-filter-toggle">
            <input type="checkbox" checked={openNow} onChange={e => setOpenNow(e.target.checked)} />
            Open now
          </label>
        </div>
      </div>

      <div className="food-layout">
        <div className="food-list">
          {loading && <div className="food-loading">Loading places...</div>}
          {places.map(p => (
            <div key={p.id} className="food-card">
              <div className="food-card-name">{p.name}</div>
              <div className="food-card-meta">
                <span className="food-card-rating">{p.rating}</span>
                <span className="food-card-price">{p.price}</span>
                <span className="food-card-category">{p.categories?.[0]}</span>
              </div>
              <div className="food-card-neighborhood">{p.neighborhood}</div>
            </div>
          ))}
        </div>
        {MAPBOX_TOKEN ? <div ref={mapContainer} className="food-map" /> : <div className="food-map"><MapPlaceholder /></div>}
      </div>
    </div>
  )
}
