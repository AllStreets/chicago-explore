import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { RiWifiLine, RiRefreshLine } from 'react-icons/ri'
import useCTA from '../hooks/useCTA'
import { sharedTrainState } from '../hooks/trainAnimState'
import MapPlaceholder from '../components/MapPlaceholder'
import './TransitPage.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const LINE_COLOR_MAP = {
  Red: '#ef4444', Blue: '#3b82f6', Brn: '#92400e',
  G: '#10b981', Org: '#f97316', P: '#8b5cf6',
  Pink: '#ec4899', Y: '#eab308',
}

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

let _routesCache = null

export default function TransitPage() {
  const mapContainer  = useRef(null)
  const mapRef        = useRef(null)
  const rafRef        = useRef(null)
  const trainDataRef  = useRef([])
  const trainStateRef = useRef(sharedTrainState)   // shared with HomePage — no position reset on navigate
  const GLIDE_MS = 14000
  const { trains, loading, refresh } = useCTA()

  useEffect(() => {
    trainDataRef.current = trains
    const now = Date.now()
    trains.forEach(t => {
      const prev = trainStateRef.current[t.rn]
      trainStateRef.current[t.rn] = {
        lat:     prev?.lat  ?? t.lat,
        lon:     prev?.lon  ?? t.lon,
        fromLat: prev?.lat  ?? t.lat,
        fromLon: prev?.lon  ?? t.lon,
        toLat:   t.lat,
        toLon:   t.lon,
        startTime: now,
      }
    })
  }, [trains])

  useEffect(() => {
    if (mapRef.current || !MAPBOX_TOKEN) return
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-87.6298, 41.8781],
      zoom: 11, pitch: 0,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left')

    map.on('load', () => {
      // CTA route lines
      map.addSource('cta-routes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      ((_routesCache
        ? Promise.resolve(_routesCache)
        : fetch(`${API}/api/cta/routes`).then(r => r.json()).then(d => { _routesCache = d; return d })
      ).then(g => { if (map.getSource('cta-routes')) map.getSource('cta-routes').setData(g) }).catch(() => {}))

      map.addLayer({ id: 'cta-routes-atmo', type: 'line', source: 'cta-routes',
        paint: { 'line-color': ['get', 'color'], 'line-width': 36, 'line-blur': 22, 'line-opacity': 0.08 }
      })
      map.addLayer({ id: 'cta-routes-glow', type: 'line', source: 'cta-routes',
        paint: { 'line-color': ['get', 'color'], 'line-width': 16, 'line-blur': 10, 'line-opacity': 0.18 }
      })
      map.addLayer({ id: 'cta-routes-solid', type: 'line', source: 'cta-routes',
        paint: { 'line-color': ['get', 'color'], 'line-width': 2.5, 'line-opacity': 0.85 }
      })

      // Train layers
      map.addSource('trains', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'train-ring', type: 'circle', source: 'trains',
        paint: {
          'circle-radius': 8, 'circle-color': 'rgba(0,0,0,0)',
          'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 1.5,
          'circle-stroke-opacity': 0.35,
        }
      })
      map.addLayer({ id: 'train-dots', type: 'circle', source: 'trains',
        paint: {
          'circle-radius': 4.5, 'circle-color': ['get', 'color'],
          'circle-stroke-color': '#060b18', 'circle-stroke-width': 1.5, 'circle-opacity': 1,
        }
      })

      map.on('click', 'train-dots', e => {
        const { line, rn } = e.features[0].properties
        new mapboxgl.Popup({ closeButton: false })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(`<strong>${line || 'CTA'} Line</strong><br>Train #${rn}`)
          .addTo(map)
      })
      map.on('mouseenter', 'train-dots', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'train-dots', () => { map.getCanvas().style.cursor = '' })

      // Animation loop
      let glowPhase = 0, ringPhase = 0
      const animate = () => {
        glowPhase += 0.006; ringPhase += 0.03

        if (map.getLayer('cta-routes-glow')) {
          const op = 0.10 + Math.sin(glowPhase) * 0.16
          map.setPaintProperty('cta-routes-glow', 'line-opacity', op)
          map.setPaintProperty('cta-routes-atmo', 'line-opacity', 0.04 + Math.sin(glowPhase) * 0.06)
        }
        if (map.getLayer('train-ring')) {
          map.setPaintProperty('train-ring', 'circle-radius', 6 + Math.sin(ringPhase) * 4)
          map.setPaintProperty('train-ring', 'circle-stroke-opacity', Math.max(0, 0.08 + Math.sin(ringPhase) * 0.25))
        }

        const now = Date.now()
        const states = trainStateRef.current
        const trainList = trainDataRef.current
        if (trainList.length > 0) {
          for (const state of Object.values(states)) {
            const p = Math.min((now - state.startTime) / GLIDE_MS, 1)
            state.lat = state.fromLat + (state.toLat - state.fromLat) * p
            state.lon = state.fromLon + (state.toLon - state.fromLon) * p
          }
          if (map.getSource('trains') && map.isStyleLoaded()) {
            map.getSource('trains').setData({
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

    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(mapContainer.current)

    return () => { ro.disconnect(); cancelAnimationFrame(rafRef.current); map.remove(); mapRef.current = null }
  }, [])

  const trainsByLine = Object.fromEntries(LINES.map(l => [l.id, trains.filter(t => t.line === l.id)]))

  return (
    <div className="transit-page">
      <div className="transit-header">
        <span className="transit-title">CTA Live Transit</span>
        <span className="transit-sub">{loading ? 'Loading...' : `${trains.length} active trains`}</span>
        <div className="transit-live-controls">
          <span className="transit-live-badge">
            <RiWifiLine size={9} />
            LIVE CTA DATA
          </span>
          <button
            className={`transit-refresh-btn${loading ? ' spinning' : ''}`}
            onClick={refresh}
            title="Refresh train data"
          >
            <RiRefreshLine size={13} />
          </button>
        </div>
      </div>
      <div className="transit-layout">
        <div className="transit-sidebar">
          {LINES.map(line => (
            <div key={line.id} className="line-card">
              <div className="line-card-swatch" style={{ background: line.color }} />
              <div className="line-card-info">
                <span className="line-card-name">{line.label}</span>
                <span className="line-card-count" style={{ color: line.color }}>
                  {trainsByLine[line.id]?.length || 0} trains
                </span>
              </div>
            </div>
          ))}
        </div>
        {MAPBOX_TOKEN
          ? <div ref={mapContainer} className="transit-map" />
          : <div className="transit-map"><MapPlaceholder /></div>}
      </div>
    </div>
  )
}
