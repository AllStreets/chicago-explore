// frontend/src/pages/SettingsPage.jsx
import { useState, useEffect, useCallback } from 'react'
import {
  RiUserSettingsLine, RiNewspaperLine, RiBellLine, RiMapPinLine, RiPaletteLine,
  RiPlugLine, RiDatabaseLine, RiInformationLine,
  RiUserLine, RiMapLine, RiCommunityLine,
  RiCloudLine, RiSubwayLine, RiCalendarEventLine, RiFootballLine,
  RiAlertLine, RiTimeLine, RiSparklingLine, RiVolumeUpLine,
  RiServerLine, RiKeyLine, RiRobotLine,
  RiSaveLine, RiDownload2Line, RiCheckLine,
  RiExternalLinkLine, RiBug2Line, RiKeyboardLine,
  RiTerminalLine, RiLayoutLine, RiContrastLine, RiSettings3Line,
  RiRestaurantLine, RiHeartPulseLine, RiCompassDiscoverLine,
  RiMoonLine, RiLineChartLine,
} from 'react-icons/ri'
import './SettingsPage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ── localStorage hook ────────────────────────────────────────────────────────
function useSetting(key, defaultValue) {
  const [val, setVal] = useState(() => {
    const s = localStorage.getItem(key)
    if (s === null) return defaultValue
    if (typeof defaultValue === 'boolean') return s === 'true'
    if (typeof defaultValue === 'number') return Number(s) || defaultValue
    return s
  })
  const save = useCallback((newVal) => {
    setVal(newVal)
    localStorage.setItem(key, String(newVal))
  }, [key])
  return [val, save]
}

// ── Reusable primitives ──────────────────────────────────────────────────────
function SettingToggle({ value, onChange }) {
  return (
    <button
      type="button"
      className={`setting-toggle${value ? ' on' : ''}`}
      onClick={() => onChange(!value)}
      aria-pressed={value}
    >
      <span className="setting-toggle-thumb" />
    </button>
  )
}

function SettingRow({ label, description, icon: Icon, children }) {
  return (
    <div className="setting-row">
      <div className="setting-row-left">
        <div className="setting-label">
          {Icon && <Icon size={13} style={{ marginRight: 6, color: '#64748b', flexShrink: 0 }} />}
          {label}
        </div>
        {description && <div className="setting-desc">{description}</div>}
      </div>
      <div className="setting-row-control">{children}</div>
    </div>
  )
}

function SettingCard({ title, children }) {
  return (
    <div className="settings-card">
      {title && <div className="settings-group-title">{title}</div>}
      {children}
    </div>
  )
}

function SavedFlash({ show }) {
  return (
    <span className={`settings-saved-flash${show ? ' visible' : ''}`}>
      <RiCheckLine size={11} /> Saved
    </span>
  )
}

function DangerButton({ label, onConfirm }) {
  const [confirming, setConfirming] = useState(false)
  const [timer, setTimer] = useState(null)

  const handleClick = () => {
    if (confirming) {
      clearTimeout(timer)
      setConfirming(false)
      onConfirm()
    } else {
      setConfirming(true)
      const t = setTimeout(() => setConfirming(false), 3500)
      setTimer(t)
    }
  }

  return (
    <button
      type="button"
      className={`btn-danger${confirming ? ' confirming' : ''}`}
      onClick={handleClick}
    >
      {confirming ? 'Confirm?' : label}
    </button>
  )
}

// ── Chicago neighborhoods ────────────────────────────────────────────────────
const CHICAGO_NEIGHBORHOODS = [
  'Lincoln Park', 'Wicker Park', 'Logan Square', 'Bucktown', 'Andersonville',
  'River North', 'West Loop', 'South Loop', 'Hyde Park', 'Pilsen',
  'Boystown / Lakeview', 'Roscoe Village', 'Uptown', 'Edgewater', 'Rogers Park',
  'Old Town', 'Gold Coast', 'Streeterville', 'Printer\'s Row', 'Bridgeport',
  'Bronzeville', 'Woodlawn', 'Englewood', 'Austin', 'Humboldt Park',
  'Ukrainian Village', 'Noble Square', 'Avondale', 'Ravenswood', 'Jefferson Park',
]

// ── Section components ───────────────────────────────────────────────────────

function ProfileSection() {
  const [name,         setName]         = useSetting('chi_profile_name',         '')
  const [neighborhood, setNeighborhood] = useSetting('chi_profile_neighborhood', '')
  const [bio,          setBio]          = useSetting('chi_profile_bio',          '')
  const [saved,        setSaved]        = useState(false)

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500) }
  const field = (setter) => (e) => { setter(e.target.value); flash() }

  return (
    <>
      <SettingCard title="Identity">
        <SettingRow label="Display Name" description="Your name shown in My Chicago and personal sections" icon={RiUserLine}>
          <input className="setting-input setting-input-wide" value={name} onChange={field(setName)} placeholder="Your name" />
        </SettingRow>
        <SettingRow label="Home Neighborhood" description="Used to personalize local recommendations" icon={RiCommunityLine}>
          <select
            className="setting-input setting-select"
            value={neighborhood}
            onChange={field(setNeighborhood)}
          >
            <option value="">Select neighborhood...</option>
            {CHICAGO_NEIGHBORHOODS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </SettingRow>
      </SettingCard>

      <SettingCard title="About You">
        <div className="setting-desc" style={{ marginBottom: 10 }}>
          Notes about your Chicago life — favorite spots, interests, areas you frequent.
        </div>
        <textarea
          className="setting-input setting-textarea"
          value={bio}
          onChange={field(setBio)}
          placeholder="e.g. Cubs season ticket holder, love Logan Square brunch spots, commute on the Blue Line..."
          rows={4}
        />
      </SettingCard>

      <SavedFlash show={saved} />
    </>
  )
}

function HomeFeedSection() {
  const [weather,  setWeather]  = useSetting('chi_feed_weather',  true)
  const [transit,  setTransit]  = useSetting('chi_feed_transit',  true)
  const [events,   setEvents]   = useSetting('chi_feed_events',   true)
  const [sports,   setSports]   = useSetting('chi_feed_sports',   true)
  const [finance,  setFinance]  = useSetting('chi_feed_finance',  false)
  const [refresh,  setRefresh]  = useSetting('chi_feed_refresh',  '30')
  const [saved,    setSaved]    = useState(false)

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500) }
  const tog = (setter) => (v) => { setter(v); flash() }

  return (
    <>
      <SettingCard title="Feed Cards">
        <SettingRow label="Weather & Lake Conditions" description="Current temp, wind, lake swim status" icon={RiCloudLine}>
          <SettingToggle value={weather} onChange={tog(setWeather)} />
        </SettingRow>
        <SettingRow label="CTA Train Status" description="Live L train alerts and service advisories" icon={RiSubwayLine}>
          <SettingToggle value={transit} onChange={tog(setTransit)} />
        </SettingRow>
        <SettingRow label="Events Today" description="Ticketmaster events happening in Chicago" icon={RiCalendarEventLine}>
          <SettingToggle value={events} onChange={tog(setEvents)} />
        </SettingRow>
        <SettingRow label="Sports Scores" description="Cubs, Sox, Bears, Bulls, Blackhawks, Fire" icon={RiFootballLine}>
          <SettingToggle value={sports} onChange={tog(setSports)} />
        </SettingRow>
        <SettingRow label="Chicago Finance" description="CME, Boeing, United, Exelon and other Chicago stocks" icon={RiLineChartLine}>
          <SettingToggle value={finance} onChange={tog(setFinance)} />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Data Refresh">
        <SettingRow label="Feed Refresh Interval" description="How often the home feed refetches live data" icon={RiTimeLine}>
          <select
            className="setting-input setting-select"
            value={refresh}
            onChange={e => { setRefresh(e.target.value); flash() }}
          >
            <option value="15">Every 15 minutes</option>
            <option value="30">Every 30 minutes (default)</option>
            <option value="60">Every hour</option>
            <option value="0">Manual only</option>
          </select>
        </SettingRow>
      </SettingCard>

      <SavedFlash show={saved} />
    </>
  )
}

function NotificationsSection() {
  const [transit,  setTransit]  = useSetting('chi_notif_transit',  true)
  const [weather,  setWeather]  = useSetting('chi_notif_weather',  true)
  const [reports,  setReports]  = useSetting('chi_notif_311',      false)
  const [sound,    setSound]    = useSetting('chi_notif_sound',    false)
  const [saved,    setSaved]    = useState(false)

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500) }
  const tog = (setter) => (v) => { setter(v); flash() }

  const pushEnabled = 'PushManager' in window && 'serviceWorker' in navigator

  return (
    <>
      {!pushEnabled && (
        <div className="settings-card" style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
          <div className="setting-desc" style={{ color: '#f59e0b' }}>
            Push notifications require a browser that supports the Push API. Enable notifications in your browser settings to activate these.
          </div>
        </div>
      )}

      <SettingCard title="Push Alerts">
        <SettingRow label="CTA Major Disruptions" description="Alert when a train line has a significant service gap" icon={RiSubwayLine}>
          <SettingToggle value={transit} onChange={tog(setTransit)} />
        </SettingRow>
        <SettingRow label="Severe Weather Alerts" description="Alert for wind advisories, storm warnings, lake conditions" icon={RiCloudLine}>
          <SettingToggle value={weather} onChange={tog(setWeather)} />
        </SettingRow>
        <SettingRow label="311 Major Incidents" description="Alert for high-urgency Chicago 311 reports in your area" icon={RiAlertLine}>
          <SettingToggle value={reports} onChange={tog(setReports)} />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Sound">
        <SettingRow label="Alert Sound" description="Play a chime when a push notification arrives" icon={RiVolumeUpLine}>
          <SettingToggle value={sound} onChange={tog(setSound)} />
        </SettingRow>
      </SettingCard>

      <SavedFlash show={saved} />
    </>
  )
}

const MAP_STYLES = [
  { value: 'mapbox://styles/mapbox/dark-v11',      label: 'Dark',       dot: '#060b18' },
  { value: 'mapbox://styles/mapbox/satellite-v9',  label: 'Satellite',  dot: '#1a3a2a' },
  { value: 'mapbox://styles/mapbox/streets-v12',   label: 'Streets',    dot: '#2a2a3a' },
  { value: 'mapbox://styles/mapbox/outdoors-v12',  label: 'Outdoors',   dot: '#2a3a1a' },
]

function MapDisplaySection() {
  const [mapStyle,  setMapStyle]  = useSetting('chi_map_style',   'mapbox://styles/mapbox/dark-v11')
  const [showCTA,   setShowCTA]   = useSetting('chi_map_trains',  true)
  const [showFood,  setShowFood]  = useSetting('chi_map_food',    true)
  const [showBike,  setShowBike]  = useSetting('chi_map_bikes',   false)
  const [units,     setUnits]     = useSetting('chi_units',       'fahrenheit')
  const [zoom,      setZoom]      = useSetting('chi_map_zoom',    12)
  const [saved,     setSaved]     = useState(false)

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500) }
  const tog = (setter) => (v) => { setter(v); flash() }

  return (
    <>
      <SettingCard title="Map Style">
        <div className="setting-desc" style={{ marginBottom: 12 }}>
          Default base map style. Changes apply when you navigate to map-enabled pages.
        </div>
        <div className="map-style-picker">
          {MAP_STYLES.map(({ value, label, dot }) => (
            <button
              key={value}
              type="button"
              className={`map-style-opt${mapStyle === value ? ' selected' : ''}`}
              onClick={() => {
                setMapStyle(value)
                flash()
                window.dispatchEvent(new StorageEvent('storage', { key: 'chi_map_style', newValue: value }))
              }}
            >
              <span className="map-style-dot" style={{ background: dot }} />
              {label}
            </button>
          ))}
        </div>
      </SettingCard>

      <SettingCard title="Map Layers">
        <SettingRow label="CTA Train Routes" description="Show L train lines and station markers on the map" icon={RiSubwayLine}>
          <SettingToggle value={showCTA} onChange={tog(setShowCTA)} />
        </SettingRow>
        <SettingRow label="Restaurant & Bar Markers" description="Show food and drink pins from OpenStreetMap" icon={RiRestaurantLine}>
          <SettingToggle value={showFood} onChange={tog(setShowFood)} />
        </SettingRow>
        <SettingRow label="Divvy Bike Stations" description="Show available Divvy bikes near you" icon={RiCompassDiscoverLine}>
          <SettingToggle value={showBike} onChange={tog(setShowBike)} />
        </SettingRow>
      </SettingCard>

      <SettingCard title="Display">
        <SettingRow label="Temperature Units" description="Fahrenheit or Celsius across all weather data" icon={RiCloudLine}>
          <select
            className="setting-input setting-select"
            value={units}
            onChange={e => { setUnits(e.target.value); flash() }}
          >
            <option value="fahrenheit">Fahrenheit (°F)</option>
            <option value="celsius">Celsius (°C)</option>
          </select>
        </SettingRow>
        <SettingRow label="Default Map Zoom" description="Starting zoom level (10 = neighborhood, 14 = block level)" icon={RiMapLine}>
          <input
            className="setting-input setting-number"
            type="number"
            min="10"
            max="16"
            value={zoom}
            onChange={e => { setZoom(Math.min(16, Math.max(10, parseInt(e.target.value, 10) || 12))); flash() }}
          />
        </SettingRow>
      </SettingCard>

      <SavedFlash show={saved} />
    </>
  )
}

const ACCENT_PRESETS = [
  { color: '#00d4ff', label: 'Cyan (default)' },
  { color: '#a78bfa', label: 'Purple'          },
  { color: '#10b981', label: 'Emerald'         },
  { color: '#f59e0b', label: 'Amber'           },
  { color: '#ef4444', label: 'Red'             },
]

function AppearanceSection() {
  const [accent,     setAccent]     = useSetting('chi_ui_accent',           '#00d4ff')
  const [sidebar,    setSidebar]    = useSetting('chi_ui_sidebar_default',  'expanded')
  const [density,    setDensity]    = useSetting('chi_ui_density',          'normal')
  const [animations, setAnimations] = useSetting('chi_ui_animations',       true)
  const [saved,      setSaved]      = useState(false)

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500) }

  return (
    <>
      <SettingCard title="Accent Color">
        <div className="accent-swatches">
          {ACCENT_PRESETS.map(({ color, label }) => (
            <button
              key={color}
              type="button"
              className={`accent-swatch${accent === color ? ' selected' : ''}`}
              style={{ background: color }}
              title={label}
              onClick={() => {
                setAccent(color)
                flash()
                const r = parseInt(color.slice(1, 3), 16) || 0
                const g = parseInt(color.slice(3, 5), 16) || 212
                const b = parseInt(color.slice(5, 7), 16) || 255
                document.documentElement.style.setProperty('--accent', color)
                document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`)
              }}
            />
          ))}
        </div>
      </SettingCard>

      <SettingCard title="Layout">
        <SettingRow label="Sidebar Default" description="Expanded or collapsed when the app loads" icon={RiLayoutLine}>
          <select
            className="setting-input setting-select"
            value={sidebar}
            onChange={e => {
              setSidebar(e.target.value)
              flash()
              window.dispatchEvent(new StorageEvent('storage', { key: 'chi_ui_sidebar_default', newValue: e.target.value }))
            }}
          >
            <option value="expanded">Expanded</option>
            <option value="collapsed">Collapsed</option>
          </select>
        </SettingRow>
        <SettingRow label="Content Density" description="Adjust spacing between cards and panels" icon={RiContrastLine}>
          <select
            className="setting-input setting-select"
            value={density}
            onChange={e => {
              setDensity(e.target.value)
              flash()
              document.documentElement.setAttribute('data-density', e.target.value)
            }}
          >
            <option value="compact">Compact</option>
            <option value="normal">Normal</option>
            <option value="spacious">Spacious</option>
          </select>
        </SettingRow>
      </SettingCard>

      <SettingCard title="Animations">
        <SettingRow label="Page Animations" description="Fade-in and transition effects when navigating between pages" icon={RiSparklingLine}>
          <SettingToggle value={animations} onChange={(v) => { setAnimations(v); flash() }} />
        </SettingRow>
      </SettingCard>

      <SavedFlash show={saved} />
    </>
  )
}

function IntegrationsSection({ health, onTestHealth, healthLoading }) {
  const [saved, setSaved] = useState(false)
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500) }

  const envStatus = (key) => {
    if (!health) return <span className="health-label muted">Run health check</span>
    const ok = health.env?.[key]
    return (
      <span className={`env-badge${ok ? ' ok' : ' missing'}`}>
        {ok ? 'Configured' : 'Not set'}
      </span>
    )
  }

  return (
    <>
      <SettingCard title="Backend Connection">
        <div className="health-card">
          <div className="health-card-row">
            <span className="health-card-label">API Server</span>
            <div className="health-status">
              {health ? (
                <>
                  <span className={`health-dot ${health.status === 'ok' ? 'ok' : 'error'}`} />
                  <span className="health-label">{health.status === 'ok' ? 'Online' : 'Unreachable'}</span>
                </>
              ) : (
                <span className="health-label muted">—</span>
              )}
            </div>
          </div>
          {health && (
            <>
              <div className="health-card-row">
                <span className="health-card-label">Version</span>
                <span className="health-label mono">{health.version}</span>
              </div>
              <div className="health-card-row">
                <span className="health-card-label">Last checked</span>
                <span className="health-label mono">{new Date(health.timestamp).toLocaleTimeString()}</span>
              </div>
            </>
          )}
          <button
            type="button"
            className="btn-accent-sm"
            onClick={onTestHealth}
            disabled={healthLoading}
          >
            {healthLoading ? 'Testing...' : <><RiPlugLine size={12} /> Test Connection</>}
          </button>
        </div>
      </SettingCard>

      <SettingCard title="API Key Status (Server-side)">
        <div className="setting-desc" style={{ marginBottom: 12 }}>
          Keys are configured via backend environment variables. Status reflects whether each is currently set on the server.
        </div>
        {[
          { label: 'OpenWeatherMap', key: 'openweather', icon: RiCloudLine,    desc: 'Weather conditions, forecasts, lake temperature'       },
          { label: 'OpenAI',         key: 'openai',      icon: RiRobotLine,         desc: 'AI neighborhood briefings and city insights (GPT-4o-mini)'     },
          { label: 'Anthropic',      key: 'anthropic',   icon: RiRobotLine,         desc: 'SDK installed — not yet wired to a route'                       },
          { label: 'CTA',            key: 'cta',         icon: RiSubwayLine,        desc: 'L train real-time positions and service alerts'                 },
          { label: 'Ticketmaster',   key: 'ticketmaster',icon: RiCalendarEventLine, desc: 'Events happening today in Chicago'                              },
          { label: 'VAPID',          key: 'vapid',       icon: RiBellLine,          desc: 'Web Push API keys — required for browser push notifications'    },
        ].map(({ label, key, icon: Icon, desc }) => (
          <SettingRow key={key} label={label} description={desc} icon={Icon}>
            {envStatus(key)}
          </SettingRow>
        ))}
      </SettingCard>

      <SettingCard title="Frontend Keys">
        <div className="setting-desc" style={{ marginBottom: 8 }}>
          Frontend keys are set via <span className="inline-code">frontend/.env</span> and baked in at build time.
        </div>
        <SettingRow label="Mapbox" description="Interactive map rendering, tile layers, geocoding" icon={RiMapLine}>
          <span className={`env-badge${import.meta.env.VITE_MAPBOX_TOKEN ? ' ok' : ' missing'}`}>
            {import.meta.env.VITE_MAPBOX_TOKEN ? 'Configured' : 'Not set'}
          </span>
        </SettingRow>
      </SettingCard>

      <SavedFlash show={saved} />
    </>
  )
}

function DataSection() {
  const [exporting,  setExporting]  = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [saved,      setSaved]      = useState(false)
  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1500) }

  const handleExport = async () => {
    setExporting(true)
    try {
      const allKeys = Object.keys(localStorage).filter(k => k.startsWith('chi_'))
      const settings = {}
      allKeys.forEach(k => { settings[k] = localStorage.getItem(k) })

      const payload = {
        settings,
        exportedAt: new Date().toISOString(),
        app: 'Chicago Explorer',
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chicago-explorer-settings-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportDone(true)
      setTimeout(() => setExportDone(false), 3000)
    } finally {
      setExporting(false)
    }
  }

  const clearSettings = () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith('chi_'))
      .forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  return (
    <>
      <SettingCard title="Export">
        <div className="setting-desc" style={{ marginBottom: 14 }}>
          Download all your Chicago Explorer settings as a JSON file — includes profile, preferences, and customization choices.
        </div>
        <button
          type="button"
          className="btn-accent-sm export-btn"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            'Exporting...'
          ) : exportDone ? (
            <><RiCheckLine size={13} /> Exported</>
          ) : (
            <><RiDownload2Line size={13} /> Export Settings</>
          )}
        </button>
      </SettingCard>

      <SettingCard title="Storage">
        <div className="setting-desc" style={{ marginBottom: 12 }}>
          All preferences are stored locally in your browser via localStorage. No data is sent to any external server.
        </div>
        <div className="storage-stat-row">
          <span className="storage-stat-label">Stored keys</span>
          <span className="storage-stat-val">{Object.keys(localStorage).filter(k => k.startsWith('chi_')).length}</span>
        </div>
        <div className="storage-stat-row">
          <span className="storage-stat-label">Storage location</span>
          <span className="storage-stat-val mono">localStorage</span>
        </div>
      </SettingCard>

      <div className="danger-zone">
        <div className="danger-zone-title"><RiAlertLine size={11} style={{ marginRight: 5 }} />Danger Zone</div>
        <div className="danger-actions">
          <div className="danger-action-row">
            <div>
              <div className="setting-label">Reset All Settings</div>
              <div className="setting-desc">Clears all preferences and reloads the page back to defaults</div>
            </div>
            <DangerButton label="Reset Settings" onConfirm={clearSettings} />
          </div>
        </div>
      </div>

      <SavedFlash show={saved} />
    </>
  )
}

const SHORTCUTS = [
  { keys: ['Ctrl', '/'], action: 'Toggle sidebar collapse' },
]

const API_ROUTES = [
  { method: 'GET',  path: '/api/cta',              desc: 'Live CTA train positions and service alerts'         },
  { method: 'GET',  path: '/api/weather',           desc: 'Current conditions, temp, wind, forecasted high/low'},
  { method: 'GET',  path: '/api/lake',              desc: 'Lake Michigan conditions, water temp, swim status'   },
  { method: 'GET',  path: '/api/places',            desc: 'Restaurants, bars, cafes from OpenStreetMap'        },
  { method: 'GET',  path: '/api/divvy',             desc: 'Divvy bike station availability'                    },
  { method: 'GET',  path: '/api/home-feed',         desc: 'Aggregated home feed data across all sources'       },
  { method: 'GET',  path: '/api/neighborhoods',     desc: 'Chicago neighborhood profiles and boundaries'        },
  { method: 'GET',  path: '/api/sports',            desc: 'Live scores — Cubs, Sox, Bears, Bulls, Hawks, Fire' },
  { method: 'GET',  path: '/api/events',            desc: 'Ticketmaster events happening today in Chicago'     },
  { method: 'POST', path: '/api/ai/stream',         desc: 'AI city and neighborhood briefings (SSE stream)'    },
  { method: 'GET',  path: '/api/me',                desc: 'My Chicago personalized data and preferences'       },
  { method: 'GET',  path: '/api/tonight',           desc: 'Tonight recommendations — food, nightlife, events'  },
  { method: 'GET',  path: '/api/311',               desc: 'Chicago 311 service request reports'                },
  { method: 'GET',  path: '/api/push/vapid-key',    desc: 'Public VAPID key for push notification subscription'},
  { method: 'POST', path: '/api/push/subscribe',    desc: 'Subscribe endpoint to browser push notifications'   },
  { method: 'GET',  path: '/api/finance',           desc: 'Chicago-headquartered stock prices and data'        },
  { method: 'GET',  path: '/api/news',              desc: 'Chicago news and politics feed'                     },
  { method: 'GET',  path: '/api/health-places',     desc: 'Health and wellness locations across Chicago'       },
  { method: 'GET',  path: '/api/settings/health',   desc: 'Backend health check and API key configuration'    },
]

const PAGES = [
  { page: 'Home',            path: '/',              desc: 'Interactive Mapbox map with live feed — weather, CTA, events, sports' },
  { page: 'Tonight',         path: '/tonight',       desc: 'What\'s happening tonight — curated food, nightlife, and events'      },
  { page: 'Transit',         path: '/transit',       desc: 'Live CTA train tracker with animated L train positions'               },
  { page: 'Explore',         path: '/explore',       desc: 'Discovery mode — random Chicago finds and hidden gems'                },
  { page: 'Food & Drink',    path: '/food',          desc: 'Restaurants, bars, cafes, and brunch spots from OpenStreetMap'        },
  { page: 'Sports',          path: '/sports',        desc: 'Live and recent scores for all 6 Chicago teams'                      },
  { page: 'Nightlife',       path: '/nightlife',     desc: 'Bars, clubs, jazz venues, and cocktail bars by neighborhood'          },
  { page: 'Events',          path: '/events',        desc: 'Ticketmaster concerts, shows, and events happening today'             },
  { page: 'Health',          path: '/health',        desc: 'Hospitals, clinics, pharmacies, and health resources'                 },
  { page: 'News',            path: '/news',          desc: 'Chicago news, politics, and civic updates'                            },
  { page: 'Weather & Lake',  path: '/weather',       desc: 'Detailed weather, 8-day forecast, Lake Michigan conditions'           },
  { page: 'Finance',         path: '/finance',       desc: 'Live prices for Chicago-headquartered public companies'               },
  { page: 'Neighborhoods',   path: '/neighborhoods', desc: 'AI-powered neighborhood profiles and character briefs'                },
  { page: 'Chicago 311',     path: '/311',           desc: 'Live 311 service requests — potholes, graffiti, trees, lighting'     },
  { page: 'My Chicago',      path: '/me',            desc: 'Your personalized Chicago hub — saved spots, preferences, daily card' },
  { page: 'Settings',        path: '/settings',      desc: 'App preferences, API status, appearance, and data management'        },
]

function AboutSection({ health, onTestHealth, healthLoading }) {
  const [endpointsOpen, setEndpointsOpen] = useState(false)

  return (
    <>
      <SettingCard title="Application">
        {[
          { key: 'Application', val: 'Chicago Explorer'                    },
          { key: 'Version',     val: 'v1.0.0'                              },
          { key: 'Frontend',    val: 'React 19 + Vite 8'                   },
          { key: 'Backend',     val: 'Express 5 + better-sqlite3'             },
          { key: 'Maps',        val: 'Mapbox GL 3'                         },
          { key: 'Data',        val: 'OpenWeatherMap · CTA · Ticketmaster · OpenStreetMap · Divvy' },
          { key: 'AI',          val: 'OpenAI GPT-4o-mini · Anthropic Claude'},
          { key: 'Design',      val: '#060b18 · #00d4ff · Space Grotesk + JetBrains Mono' },
        ].map(({ key, val }) => (
          <div key={key} className="about-kv-row">
            <span className="about-key">{key}</span>
            <span className="about-val">{val}</span>
          </div>
        ))}
      </SettingCard>

      <SettingCard title="Pages">
        {PAGES.map(({ page, path, desc }) => (
          <div key={page} className="setting-row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div className="setting-label" style={{ fontSize: 12 }}>
                {page}
                <span style={{ color: '#334155', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, marginLeft: 8 }}>{path}</span>
              </div>
              <div className="setting-desc">{desc}</div>
            </div>
          </div>
        ))}
      </SettingCard>

      <SettingCard title="Server Status">
        <div className="health-card">
          <div className="health-card-row">
            <span className="health-card-label">API Server</span>
            <div className="health-status">
              {health ? (
                <>
                  <span className={`health-dot ${health.status === 'ok' ? 'ok' : 'error'}`} />
                  <span className="health-label">{health.status === 'ok' ? `Online · v${health.version}` : 'Unreachable'}</span>
                </>
              ) : <span className="health-label muted">Not checked</span>}
            </div>
          </div>
          {health && Object.entries(health.env || {}).map(([k, v]) => (
            <div key={k} className="health-card-row">
              <span className="health-card-label">{k}</span>
              <span className={`env-badge${v ? ' ok' : ' missing'}`}>{v ? 'Configured' : 'Not set'}</span>
            </div>
          ))}
          <button type="button" className="btn-accent-sm" onClick={onTestHealth} disabled={healthLoading}>
            {healthLoading ? 'Checking...' : <><RiPlugLine size={12} /> Check Now</>}
          </button>
        </div>
      </SettingCard>

      <SettingCard title="Keyboard Shortcuts">
        <table className="shortcut-table">
          <tbody>
            {SHORTCUTS.map(({ keys, action }) => (
              <tr key={action}>
                <td className="shortcut-keys">
                  {keys.map((k, i) => (
                    <span key={i}><kbd className="shortcut-key">{k}</kbd>{i < keys.length - 1 && ' + '}</span>
                  ))}
                </td>
                <td className="shortcut-action">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SettingCard>

      <SettingCard>
        <button
          type="button"
          className="endpoints-toggle"
          onClick={() => setEndpointsOpen(o => !o)}
        >
          <RiTerminalLine size={13} />
          API Endpoints Reference
          <span className="endpoints-chevron">{endpointsOpen ? '▲' : '▼'}</span>
        </button>
        {endpointsOpen && (
          <div className="endpoint-list">
            {API_ROUTES.map(({ method, path, desc }) => (
              <div key={path + method} className="endpoint-row">
                <span className={`endpoint-method method-${method.toLowerCase()}`}>{method}</span>
                <span className="endpoint-path">{path}</span>
                <span className="endpoint-desc">{desc}</span>
              </div>
            ))}
          </div>
        )}
      </SettingCard>

      <SettingCard title="Links">
        {[
          { icon: RiBug2Line,         label: 'Report a Bug',        href: 'https://github.com/' },
          { icon: RiExternalLinkLine, label: 'Mapbox GL Docs',      href: 'https://docs.mapbox.com/mapbox-gl-js/' },
          { icon: RiExternalLinkLine, label: 'OpenWeatherMap API',  href: 'https://openweathermap.org/api' },
          { icon: RiExternalLinkLine, label: 'CTA API Docs',        href: 'https://www.transitchicago.com/developers/' },
          { icon: RiExternalLinkLine, label: 'Chicago Data Portal', href: 'https://data.cityofchicago.org/' },
        ].map(({ icon: Icon, label, href }) => (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="about-link">
            <Icon size={13} />
            {label}
            <RiExternalLinkLine size={11} style={{ marginLeft: 'auto', opacity: 0.4 }} />
          </a>
        ))}
      </SettingCard>
    </>
  )
}

// ── Section config ────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'profile',       label: 'Profile',          Icon: RiUserSettingsLine, subtitle: 'Your identity and home neighborhood'              },
  { id: 'feed',          label: 'Home Feed',         Icon: RiNewspaperLine,    subtitle: 'What appears on your home dashboard'              },
  { id: 'notifications', label: 'Notifications',    Icon: RiBellLine,          subtitle: 'Push alert preferences'                          },
  { id: 'map',           label: 'Map & Display',    Icon: RiMapPinLine,        subtitle: 'Map style, layers, and units'                    },
  { id: 'appearance',    label: 'Appearance',       Icon: RiPaletteLine,       subtitle: 'Colors, layout, and density'                     },
  { id: 'integrations',  label: 'Integrations',     Icon: RiPlugLine,          subtitle: 'API status and backend connectivity'             },
  { id: 'data',          label: 'Data & Privacy',   Icon: RiDatabaseLine,      subtitle: 'Export, storage, and settings reset'             },
  { id: 'about',         label: 'About / Help',     Icon: RiInformationLine,   subtitle: 'Version, shortcuts, and documentation'           },
]

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [active,        setActive]        = useState('profile')
  const [health,        setHealth]        = useState(null)
  const [healthLoading, setHealthLoading] = useState(false)

  const testHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const data = await fetch(`${API}/api/settings/health`).then(r => r.json())
      setHealth(data)
    } catch {
      setHealth({ status: 'error', timestamp: new Date().toISOString(), env: {} })
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => { testHealth() }, [testHealth])

  const section = SECTIONS.find(s => s.id === active)

  const renderSection = () => {
    switch (active) {
      case 'profile':       return <ProfileSection />
      case 'feed':          return <HomeFeedSection />
      case 'notifications': return <NotificationsSection />
      case 'map':           return <MapDisplaySection />
      case 'appearance':    return <AppearanceSection />
      case 'integrations':  return <IntegrationsSection health={health} onTestHealth={testHealth} healthLoading={healthLoading} />
      case 'data':          return <DataSection />
      case 'about':         return <AboutSection health={health} onTestHealth={testHealth} healthLoading={healthLoading} />
      default:              return null
    }
  }

  return (
    <div className="settings-page">
      <aside className="settings-sidebar">
        <div className="settings-sidebar-title">
          <RiSettings3Line size={11} style={{ marginRight: 5 }} />
          Settings
        </div>
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`settings-nav-item${active === id ? ' active' : ''}`}
            onClick={() => setActive(id)}
          >
            <span className="settings-nav-icon"><Icon size={16} /></span>
            <span className="settings-nav-label">{label}</span>
          </button>
        ))}
      </aside>

      <div className="settings-content">
        <div className="settings-section-header">
          <div className="settings-section-icon-wrap">
            {section && <section.Icon size={18} color="var(--accent, #00d4ff)" />}
          </div>
          <div>
            <div className="settings-section-title">{section?.label}</div>
            <div className="settings-section-subtitle">{section?.subtitle}</div>
          </div>
        </div>
        <div className="settings-section-body">
          {renderSection()}
        </div>
      </div>
    </div>
  )
}
