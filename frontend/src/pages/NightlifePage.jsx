import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import useYelp from '../hooks/useYelp'
import MapPlaceholder from '../components/MapPlaceholder'
import './NightlifePage.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN

const CATEGORIES = ['bars', 'nightlife', 'jazzandblues', 'danceclub', 'rooftop_bars', 'wine_bars', 'cocktailbars']

const SCENES = [
  { name: 'Wicker Park / Bucktown', vibe: 'Indie bars, late-night tacos, no dress code', color: '#8b5cf6' },
  { name: 'River North', vibe: 'Upscale clubs, rooftops, see-and-be-seen', color: '#f97316' },
  { name: 'Wrigleyville', vibe: 'Sports bars, Cubs game crowds, rowdy fun', color: '#ef4444' },
  { name: 'Andersonville', vibe: 'LGBTQ+ welcoming, cozy bars, diverse crowd', color: '#10b981' },
  { name: 'West Loop', vibe: 'Craft cocktails, chef-driven, wine bars', color: '#00d4ff' },
  { name: 'Lincoln Park', vibe: 'Bar crawls, DePaul crowd, rooftop patios', color: '#eab308' },
]

export default function NightlifePage() {
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const [category, setCategory] = useState('bars')
  const { places, loading } = useYelp({ type: category })

  useEffect(() => {
    if (mapRef.current) return
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-87.6350, 41.9000],
      zoom: 12.5,
      pitch: 20,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left')
    map.on('load', () => {
      map.addSource('nightlife', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'nightlife-dots',
        type: 'circle',
        source: 'nightlife',
        paint: {
          'circle-radius': 7,
          'circle-color': '#8b5cf6',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
          'circle-opacity': 0.85,
        }
      })
      map.on('click', 'nightlife-dots', e => {
        const { name, rating, price } = e.features[0].properties
        new mapboxgl.Popup({ closeButton: false })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(`<strong>${name}</strong><br>${rating} stars ${price ? '· ' + price : ''}`)
          .addTo(map)
      })
      map.on('mouseenter', 'nightlife-dots', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'nightlife-dots', () => { map.getCanvas().style.cursor = '' })
    })
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const src = map.getSource('nightlife')
    if (!src) return
    src.setData({
      type: 'FeatureCollection',
      features: places.filter(p => p.lat && p.lon).map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: { name: p.name, rating: p.rating, price: p.price || '' }
      }))
    })
  }, [places])

  return (
    <div className="nightlife-page">
      <div className="nightlife-header">
        <span className="nightlife-title">Nightlife</span>
        <div className="nightlife-filters">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`nightlife-filter-btn${category === c ? ' active' : ''}`}
            >
              {c.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="nightlife-layout">
        <div className="nightlife-sidebar">
          <div className="nightlife-scenes-label">SCENE PROFILES</div>
          {SCENES.map(s => (
            <div key={s.name} className="nightlife-scene" style={{ borderLeftColor: s.color }}>
              <div className="nightlife-scene-name">{s.name}</div>
              <div className="nightlife-scene-vibe">{s.vibe}</div>
            </div>
          ))}

          <div className="nightlife-list-label">PLACES</div>
          {loading && <div className="nightlife-loading">Loading...</div>}
          {places.slice(0, 12).map(p => (
            <div key={p.id} className="nightlife-card">
              <div className="nightlife-card-name">{p.name}</div>
              <div className="nightlife-card-meta">
                <span className="nightlife-card-rating">{p.rating}</span>
                {p.price && <span className="nightlife-card-price">{p.price}</span>}
                <span className="nightlife-card-hood">{p.neighborhood}</span>
              </div>
            </div>
          ))}
        </div>
        {MAPBOX_TOKEN ? <div ref={mapContainer} className="nightlife-map" /> : <div className="nightlife-map"><MapPlaceholder /></div>}
      </div>
    </div>
  )
}
