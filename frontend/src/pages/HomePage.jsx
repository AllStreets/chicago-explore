// frontend/src/pages/HomePage.jsx
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import IntelFeed from '../components/IntelFeed'
import useCTA from '../hooks/useCTA'
import useWeather from '../hooks/useWeather'
import './HomePage.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

const CENTER = [-87.6197, 41.8919]  // Streeterville
const ZOOM   = 13.5

const LINE_COLOR_MAP = {
  Red: '#ef4444', Blue: '#3b82f6', Brn: '#92400e',
  G: '#10b981', Org: '#f97316', P: '#8b5cf6',
  Pink: '#ec4899', Y: '#eab308',
}

export default function HomePage() {
  const mapContainer = useRef(null)
  const mapRef       = useRef(null)
  const { trains }   = useCTA()
  const { weather, lake } = useWeather()

  useEffect(() => {
    if (mapRef.current) return
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

      map.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 12,
          paint: {
            'fill-extrusion-color': '#0f1f3a',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.8,
          },
        },
        labelLayer?.id
      )

      map.addSource('cta-trains', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })

      map.addLayer({
        id: 'cta-train-dots',
        type: 'circle',
        source: 'cta-trains',
        paint: {
          'circle-radius': 5,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
          'circle-opacity': 0.9,
        }
      })
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const source = map.getSource('cta-trains')
    if (!source) return
    source.setData({
      type: 'FeatureCollection',
      features: trains.map(t => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [t.lon, t.lat] },
        properties: { rn: t.rn, line: t.line, color: LINE_COLOR_MAP[t.line] || '#00d4ff' }
      }))
    })
  }, [trains])

  return (
    <div className="home-page">
      <div ref={mapContainer} className="home-map" />
      <IntelFeed weather={weather} lake={lake} trains={trains} />
    </div>
  )
}
