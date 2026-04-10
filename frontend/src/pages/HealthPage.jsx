import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  RiHeartPulseLine,
  RiRunLine,
  RiHospitalLine,
  RiLeafLine,
  RiStoreLine,
  RiSwordLine,
  RiFirstAidKitLine,
} from 'react-icons/ri'
import { makeMapPin } from '../utils/mapIcons'
import MapPlaceholder from '../components/MapPlaceholder'
import './HealthPage.css'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const CATEGORIES = [
  { key: 'gyms',      label: 'Gyms & Fitness',  color: '#00d4ff', Icon: RiHeartPulseLine  },
  { key: 'wellness',  label: 'Wellness & Spa',   color: '#10b981', Icon: RiLeafLine        },
  { key: 'grocery',   label: 'Healthy Grocery',  color: '#84cc16', Icon: RiStoreLine       },
  { key: 'running',   label: 'Running Paths',    color: '#f59e0b', Icon: RiRunLine         },
  { key: 'courts',    label: 'Sports Courts',    color: '#8b5cf6', Icon: RiSwordLine       },
  { key: 'urgent',    label: 'Urgent Care',      color: '#f97316', Icon: RiFirstAidKitLine },
  { key: 'hospitals', label: 'Hospitals',        color: '#ef4444', Icon: RiHospitalLine    },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`
}

function toGeoJSON(places) {
  return {
    type: 'FeatureCollection',
    features: places
      .filter(p => p.lat && p.lng && p.lat > 41.5 && p.lat < 42.1 && p.lng > -88.1 && p.lng < -87.2)
      .map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { name: p.name, address: p.address || '' },
      })),
  }
}

function PlaceCard({ place }) {
  return (
    <div className="hl-place-card">
      <div className="hl-place-name">{place.name}</div>
      {place.address && <div className="hl-place-addr">{place.address}</div>}
      {place.hours && <div className="hl-place-hours">{place.hours}</div>}
      {place.website && (
        <a href={place.website} target="_blank" rel="noopener noreferrer" className="hl-place-link">
          Website
        </a>
      )}
    </div>
  )
}

export default function HealthPage() {
  const mapContainer      = useRef(null)
  const mapRef            = useRef(null)
  const mapInitialized    = useRef(false)
  const popupRef          = useRef(null)

  const [activeCategory, setActiveCategory] = useState('gyms')
  const [places, setPlaces]                 = useState([])
  const [loading, setLoading]               = useState(false)

  // Init map once
  useEffect(() => {
    if (mapInitialized.current || !MAPBOX_TOKEN) return
    mapInitialized.current = true

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-87.65, 41.88],
      zoom: 12,
      minZoom: 10,
      maxBounds: [[-88.5, 41.3], [-87.0, 42.4]],
    })

    map.on('load', () => {
      // Force correct position after any init with zero-height container
      map.jumpTo({ center: [-87.65, 41.88], zoom: 12 })

      // Pre-register icons for all categories
      CATEGORIES.forEach(c => {
        const imgId = `health-${c.key}`
        if (!map.hasImage(imgId)) {
          map.addImage(imgId, makeMapPin(c.key, c.color), { pixelRatio: 2 })
        }
      })

      map.addSource('health-pins', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'health-icons',
        type: 'symbol',
        source: 'health-pins',
        layout: {
          'icon-image':            'health-gyms',
          'icon-size':             1,
          'icon-allow-overlap':    true,
          'icon-ignore-placement': true,
          'icon-anchor':           'center',
        },
      })

      map.on('mouseenter', 'health-icons', e => {
        map.getCanvas().style.cursor = 'pointer'
        const { name, address } = e.features[0].properties
        const coords = e.features[0].geometry.coordinates.slice()
        popupRef.current = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 16 })
          .setLngLat(coords)
          .setHTML(
            `<strong>${name}</strong>` +
            (address ? `<div style="color:#94a3b8;font-size:11px;margin-top:3px">${address}</div>` : '')
          )
          .addTo(map)
      })
      map.on('mouseleave', 'health-icons', () => {
        map.getCanvas().style.cursor = ''
        popupRef.current?.remove()
        popupRef.current = null
      })
    })

    mapRef.current = map

    const ro = new ResizeObserver(() => mapRef.current?.resize())
    ro.observe(mapContainer.current)

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      mapInitialized.current = false
    }
  }, [])

  // Update map icon immediately when category changes
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const applyIcon = () => {
      if (map.getLayer('health-icons')) {
        map.setLayoutProperty('health-icons', 'icon-image', `health-${activeCategory}`)
      }
    }
    if (map.isStyleLoaded()) applyIcon()
    else map.once('load', applyIcon)
  }, [activeCategory])

  // Fetch data + update map markers when category changes
  useEffect(() => {
    const cat = CAT_MAP[activeCategory]
    if (!cat) return

    setLoading(true)
    setPlaces([])

    fetch(`${API}/api/health-places?category=${activeCategory}`)
      .then(r => r.json())
      .then(data => {
        const fetched = data.places || []
        setPlaces(fetched)

        const map = mapRef.current
        if (!map) return

        const updateMarkers = () => {
          const src = map.getSource('health-pins')
          if (src) src.setData(toGeoJSON(fetched))
        }

        if (map.isStyleLoaded()) updateMarkers()
        else map.once('load', updateMarkers)
      })
      .catch(() => setPlaces([]))
      .finally(() => setLoading(false))
  }, [activeCategory])

  const activeCat = CAT_MAP[activeCategory]

  return (
    <div className="hl-page">
      <div className="hl-header">
        <div className="hl-title-row">
          <span className="hl-title">Chicago Health</span>
          {loading && <span className="hl-loading-badge">Loading...</span>}
        </div>
        <div className="hl-cats">
          {CATEGORIES.map(c => {
            const active = activeCategory === c.key
            return (
              <button
                key={c.key}
                className={`hl-cat-btn${active ? ' active' : ''}`}
                style={active ? {
                  color: c.color,
                  borderColor: c.color,
                  background: `rgba(${hexToRgb(c.color)},0.12)`,
                  boxShadow: `0 0 8px rgba(${hexToRgb(c.color)},0.4)`,
                } : {}}
                onClick={() => setActiveCategory(c.key)}
              >
                <c.Icon size={12} />
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="hl-body">
        {MAPBOX_TOKEN
          ? <div ref={mapContainer} className="hl-map-wrap" />
          : <div className="hl-map-wrap"><MapPlaceholder /></div>
        }

        <div className="hl-sidebar">
          <div className="hl-results-count">
            {loading
              ? 'Fetching...'
              : `${places.length} result${places.length !== 1 ? 's' : ''} — ${activeCat?.label || ''}`
            }
          </div>

          {loading && (
            <div className="hl-skeleton-list">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="hl-skeleton-card" />
              ))}
            </div>
          )}

          {!loading && places.map(p => (
            <PlaceCard key={p.id} place={p} />
          ))}
        </div>
      </div>
    </div>
  )
}
