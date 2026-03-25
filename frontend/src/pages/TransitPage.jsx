import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { RiWifiLine, RiRefreshLine, RiBusLine, RiBikeLine } from 'react-icons/ri'
import useCTA from '../hooks/useCTA'
import { sharedTrainState } from '../hooks/trainAnimState'
import MapPlaceholder from '../components/MapPlaceholder'
import './TransitPage.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const LINE_COLOR_MAP = {
  Red: '#ff1a1a', Blue: '#3b82f6', Brn: '#92400e',
  G: '#10b981', Org: '#f97316', P: '#8b5cf6',
  Pink: '#ec4899', Y: '#eab308',
}
const LINE_NAME_MAP = {
  Red: 'Red Line', Blue: 'Blue Line', Brn: 'Brown Line',
  G: 'Green Line', Org: 'Orange Line', P: 'Purple Line',
  Pexp: 'Purple Line Express', Pink: 'Pink Line', Y: 'Yellow Line',
}

const LINES = [
  { id: 'Red',  label: 'Red Line',    color: '#ff1a1a' },
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
  const [showBuses, setShowBuses]   = useState(false)
  const [buses, setBuses]           = useState([])
  const [showDivvy, setShowDivvy]   = useState(false)

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

      const noGlowColor = ['case',
        ['any', ['==', ['get', 'color'], '#92400e'], ['==', ['get', 'color'], '#ec4899']],
        'rgba(0,0,0,0)',
        ['get', 'color'],
      ]
      map.addLayer({ id: 'cta-routes-atmo', type: 'line', source: 'cta-routes',
        paint: { 'line-color': noGlowColor, 'line-width': 22, 'line-blur': 16, 'line-opacity': 0.04 }
      })
      map.addLayer({ id: 'cta-routes-glow', type: 'line', source: 'cta-routes',
        paint: { 'line-color': noGlowColor, 'line-width': 5, 'line-blur': 2, 'line-opacity': 0.22 }
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
          .setHTML(`<strong>${LINE_NAME_MAP[line] || line || 'CTA'}</strong><br>Train #${rn}`)
          .addTo(map)
      })
      map.on('mouseenter', 'train-dots', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'train-dots', () => { map.getCanvas().style.cursor = '' })

      // Divvy stations layer
      map.addSource('divvy', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'divvy-dots', type: 'circle', source: 'divvy',
        layout: { visibility: 'none' },
        paint: {
          'circle-radius': 3.5,
          'circle-color': ['case', ['==', ['get', 'renting'], true], '#10b981', '#64748b'],
          'circle-stroke-color': '#060b18', 'circle-stroke-width': 1,
        }
      })
      map.on('click', 'divvy-dots', e => {
        const { name, bikes, docks, renting } = e.features[0].properties
        new mapboxgl.Popup({ closeButton: false })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(
            `<strong>${name}</strong>` +
            `<div style="margin-top:6px;font-size:11px">` +
            `<span style="color:#10b981">${bikes} bikes</span> · ` +
            `<span style="color:#00d4ff">${docks} docks</span>` +
            (!renting ? `<br><span style="color:#ef4444">Not currently renting</span>` : '') +
            `</div>`
          )
          .addTo(map)
      })
      map.on('mouseenter', 'divvy-dots', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'divvy-dots', () => { map.getCanvas().style.cursor = '' })

      // Load Divvy station data
      fetch(`${API}/api/divvy/stations`)
        .then(r => r.json())
        .then(d => {
          if (map.getSource('divvy')) {
            map.getSource('divvy').setData({
              type: 'FeatureCollection',
              features: (d.stations || []).map(s => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
                properties: { name: s.name, bikes: s.bikesAvailable, docks: s.docksAvailable, renting: s.isRenting },
              }))
            })
          }
        }).catch(() => {})

      // Bus dots layer
      map.addSource('cta-buses', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: 'bus-dots', type: 'circle', source: 'cta-buses',
        paint: {
          'circle-radius': 4, 'circle-color': '#f59e0b',
          'circle-stroke-color': '#060b18', 'circle-stroke-width': 1.2,
        }
      })
      map.on('click', 'bus-dots', e => {
        const { route, destination } = e.features[0].properties
        new mapboxgl.Popup({ closeButton: false })
          .setLngLat(e.features[0].geometry.coordinates)
          .setHTML(`<strong>Route ${route}</strong><br><small>${destination}</small>`)
          .addTo(map)
      })
      map.on('mouseenter', 'bus-dots', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'bus-dots', () => { map.getCanvas().style.cursor = '' })

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

  // Bus fetch effect
  useEffect(() => {
    if (!showBuses) { setBuses([]); return }
    async function fetchBuses() {
      try {
        const r = await fetch(`${API}/api/cta/buses`)
        const d = await r.json()
        setBuses(d.buses || [])
      } catch {}
    }
    fetchBuses()
    const id = setInterval(fetchBuses, 30000)
    return () => clearInterval(id)
  }, [showBuses])

  // Sync bus positions to map source
  useEffect(() => {
    const src = mapRef.current?.getSource('cta-buses')
    if (!src) return
    src.setData({
      type: 'FeatureCollection',
      features: buses.map(b => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [b.lon, b.lat] },
        properties: { route: b.route, destination: b.destination },
      }))
    })
  }, [buses])

  // Toggle Divvy layer visibility
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded() || !map.getLayer('divvy-dots')) return
    map.setLayoutProperty('divvy-dots', 'visibility', showDivvy ? 'visible' : 'none')
  }, [showDivvy])

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
            className={`transit-bike-btn${showDivvy ? ' active' : ''}`}
            onClick={() => setShowDivvy(s => !s)}
            title={showDivvy ? 'Hide Divvy stations' : 'Show Divvy stations'}
          >
            <RiBikeLine size={13} />
          </button>
          <button
            className={`transit-bus-btn${showBuses ? ' active' : ''}`}
            onClick={() => setShowBuses(s => !s)}
            title={showBuses ? 'Hide buses' : 'Show buses'}
          >
            <RiBusLine size={13} />
          </button>
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
