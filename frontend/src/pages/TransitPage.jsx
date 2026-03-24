import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import useCTA from '../hooks/useCTA'
import MapPlaceholder from '../components/MapPlaceholder'
import './TransitPage.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const LINES = [
  { id: 'Red',  label: 'Red Line',    color: '#ef4444' },
  { id: 'Blue', label: 'Blue Line',   color: '#3b82f6' },
  { id: 'Brn',  label: 'Brown Line',  color: '#92400e' },
  { id: 'G',    label: 'Green Line',  color: '#10b981' },
  { id: 'Org',  label: 'Orange Line', color: '#f97316' },
  { id: 'P',    label: 'Purple Line', color: '#8b5cf6' },
  { id: 'Pink', label: 'Pink Line',   color: '#ec4899' },
  { id: 'Y',    label: 'Yellow Line', color: '#eab308' },
]

const LINE_COLORS = Object.fromEntries(LINES.map(l => [l.id, l.color]))

export default function TransitPage() {
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const { trains, loading } = useCTA()
  const [divvyStations, setDivvyStations] = useState([])

  useEffect(() => {
    fetch(`${API}/api/divvy/stations`)
      .then(r => r.json())
      .then(d => setDivvyStations(d.stations || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (mapRef.current || !MAPBOX_TOKEN) return
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-87.6298, 41.8781],
      zoom: 11,
      pitch: 0,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left')
    map.on('load', () => {
      map.addSource('trains', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'train-dots',
        type: 'circle',
        source: 'trains',
        paint: {
          'circle-radius': 5,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
        }
      })
      map.addSource('divvy', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'divvy-dots',
        type: 'circle',
        source: 'divvy',
        paint: { 'circle-radius': 3, 'circle-color': '#22c55e', 'circle-opacity': 0.7 }
      })
    })
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const src = map.getSource('trains')
    if (!src) return
    src.setData({
      type: 'FeatureCollection',
      features: trains.map(t => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
        properties: { color: LINE_COLORS[t.line] || '#00d4ff' }
      }))
    })
  }, [trains])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded() || !divvyStations.length) return
    const src = map.getSource('divvy')
    if (!src) return
    src.setData({
      type: 'FeatureCollection',
      features: divvyStations
        .filter(s => s.lat && s.lon)
        .map(s => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
          properties: { bikes: s.bikesAvailable, name: s.name }
        }))
    })
  }, [divvyStations])

  const trainsByLine = Object.fromEntries(LINES.map(l => [l.id, trains.filter(t => t.line === l.id)]))

  return (
    <div className="transit-page">
      <div className="transit-header">
        <span className="transit-title">CTA Live Transit</span>
        <span className="transit-sub">{loading ? 'Loading...' : `${trains.length} active trains`}</span>
      </div>

      <div className="transit-layout">
        <div className="transit-sidebar">
          {LINES.map(line => (
            <div key={line.id} className="line-card">
              <div className="line-card-dot" style={{ background: line.color }} />
              <div className="line-card-info">
                <span className="line-card-name">{line.label}</span>
                <span className="line-card-count" style={{ color: line.color }}>
                  {trainsByLine[line.id]?.length || 0} trains
                </span>
              </div>
            </div>
          ))}
          <div className="line-card">
            <div className="line-card-dot" style={{ background: '#22c55e' }} />
            <div className="line-card-info">
              <span className="line-card-name">Divvy Bikes</span>
              <span className="line-card-count" style={{ color: '#22c55e' }}>
                {divvyStations.length} stations
              </span>
            </div>
          </div>
        </div>

        {MAPBOX_TOKEN ? <div ref={mapContainer} className="transit-map" /> : <div className="transit-map"><MapPlaceholder /></div>}
      </div>
    </div>
  )
}
