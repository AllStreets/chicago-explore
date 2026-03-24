// frontend/src/pages/HomePage.jsx
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import IntelFeed from '../components/IntelFeed'
import MapPlaceholder from '../components/MapPlaceholder'
import useCTA from '../hooks/useCTA'
import useWeather from '../hooks/useWeather'
import useYelp from '../hooks/useYelp'
import useHomeFeed from '../hooks/useHomeFeed'
import './HomePage.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN

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
  const pulseRef     = useRef(null)
  const { trains }            = useCTA()
  const { weather, lake }     = useWeather()
  const { places }            = useYelp({ type: 'restaurants', limit: 20 })
  const { feed }              = useHomeFeed()

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

      // 3D buildings
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

      // CTA trains source + layer
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

      // Buzz spots source + layer
      map.addSource('buzz-spots', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })
      map.addLayer({
        id: 'buzz-spot-dots',
        type: 'circle',
        source: 'buzz-spots',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'rating'], 0, 4, 5, 9],
          'circle-color': '#f97316',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
          'circle-opacity': 0.75,
        }
      })
      map.on('click', 'buzz-spot-dots', e => {
        const { name, rating, category } = e.features[0].properties
        new mapboxgl.Popup({ closeButton: false })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(`<strong>${name}</strong><br>${rating} stars · <small>${category}</small>`)
          .addTo(map)
      })
      map.on('mouseenter', 'buzz-spot-dots', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'buzz-spot-dots', () => { map.getCanvas().style.cursor = '' })

      // Streeterville pulse marker
      const el = document.createElement('div')
      el.className = 'streeterville-pulse'
      pulseRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat(CENTER)
        .addTo(map)
    })

    mapRef.current = map
    return () => {
      if (pulseRef.current) { pulseRef.current.remove(); pulseRef.current = null }
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Update CTA train dots
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

  // Update buzz spots
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    const source = map.getSource('buzz-spots')
    if (!source) return
    source.setData({
      type: 'FeatureCollection',
      features: places
        .filter(p => p.lat && p.lon)
        .map(p => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
          properties: { name: p.name, rating: p.rating || 0, category: p.categories?.[0] || '' }
        }))
    })
  }, [places])

  return (
    <div className="home-page">
      {MAPBOX_TOKEN ? <div ref={mapContainer} className="home-map" /> : <div className="home-map"><MapPlaceholder /></div>}
      <IntelFeed
        weather={weather}
        lake={lake}
        trains={trains}
        trainCount={feed.trainCount}
        nextEvent={feed.nextEvent}
        topSpots={places.slice(0, 3)}
      />
    </div>
  )
}
