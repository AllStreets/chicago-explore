const { Router } = require('express')
const db = require('../db')
const router = Router()

const BASE = 'http://lapi.transitchicago.com/api/1.0'
const key = () => process.env.CTA_API_KEY

const LINE_COLORS = {
  Red: '#ef4444', Blue: '#3b82f6', Brn: '#92400e',
  G: '#10b981', Org: '#f97316', P: '#8b5cf6',
  Pink: '#ec4899', Y: '#eab308',
}
const LINE_NAME_MAP = {
  red: 'Red', blue: 'Blue', brown: 'Brn', green: 'G',
  orange: 'Org', purple: 'P', pink: 'Pink', yellow: 'Y',
}

function normalizeTrain(t) {
  return {
    rn:          t.rn,
    lat:         parseFloat(t.lat),
    lon:         parseFloat(t.lon),
    heading:     parseInt(t.heading, 10),
    line:        t.rt ? t.rt.charAt(0).toUpperCase() + t.rt.slice(1) : undefined,
    nextStation: t.nextStaNm,
    predTime:    t.prdt,
    arrTime:     t.arrT,
  }
}

// Parse WKT MULTILINESTRING / LINESTRING → array of coordinate arrays
function parseWKT(wkt) {
  const stripped = wkt.replace(/MULTILINESTRING|LINESTRING/g, '').trim()
  const inner = stripped.slice(1, -1)  // remove outermost ()
  const parts = inner.split(/\)\s*,\s*\(/)
  const result = []
  for (const part of parts) {
    const clean = part.replace(/[()]/g, '').trim()
    const coords = clean.split(',').map(pair => {
      const [lng, lat] = pair.trim().split(/\s+/).map(Number)
      return [lng, lat]
    }).filter(c => !isNaN(c[0]) && !isNaN(c[1]))
    if (coords.length >= 2) result.push(coords)
  }
  return result
}

const stmtRoutesGet = db.prepare('SELECT data, cached_at FROM cta_routes_cache LIMIT 1')
const stmtRoutesSet = db.prepare('INSERT OR REPLACE INTO cta_routes_cache (id, data, cached_at) VALUES (1, ?, ?)')
const ROUTES_TTL = 24 * 60 * 60 * 1000

// GET /api/cta/routes — official CTA L line GeoJSON from City of Chicago
router.get('/routes', async (_req, res) => {
  const cached = stmtRoutesGet.get()
  if (cached && Date.now() - cached.cached_at < ROUTES_TTL) {
    return res.json(JSON.parse(cached.data))
  }
  try {
    const r = await fetch(
      'https://data.cityofchicago.org/api/views/xbyr-jnvx/rows.json?limit=200',
      { signal: AbortSignal.timeout(15000) }
    )
    const d = await r.json()
    const rows = d.data || []
    const cols = (d.meta?.view?.columns || []).map(c => c.name)
    const geomIdx = cols.indexOf('the_geom')
    const linesIdx = cols.indexOf('LINES')

    const features = []
    for (const row of rows) {
      const wkt = row[geomIdx]
      const linesStr = row[linesIdx] || ''
      if (!wkt) continue
      const segCoords = parseWKT(wkt)
      // Determine which lines use this segment
      const lineIds = [...new Set(
        linesStr.split(',')
          .map(l => l.trim()
            .replace(/\s*\(.*?\)/g, '')   // remove (O'Hare), (Express), etc.
            .replace(/\bLine\b/gi, '')     // remove "Line" suffix
            .trim()
            .toLowerCase()
          )
          .map(l => LINE_NAME_MAP[l])
          .filter(Boolean)
      )]
      for (const lineId of lineIds) {
        for (const coords of segCoords) {
          features.push({
            type: 'Feature',
            properties: { line: lineId, color: LINE_COLORS[lineId] },
            geometry: { type: 'LineString', coordinates: coords },
          })
        }
      }
    }

    const payload = { type: 'FeatureCollection', features }
    stmtRoutesSet.run(JSON.stringify(payload), Date.now())
    res.json(payload)
  } catch (e) {
    if (cached) return res.json(JSON.parse(cached.data))
    res.status(502).json({ error: 'CTA routes unavailable', detail: e.message })
  }
})

// GET /api/cta/trains — all active train positions
router.get('/trains', async (_req, res) => {
  try {
    const r = await fetch(`${BASE}/ttpositions.aspx?rt=Red,Blue,Brn,G,Org,P,Pink,Y&key=${key()}&outputType=JSON`)
    const data = await r.json()
    const routes = data?.ctatt?.route || []
    const allTrains = (Array.isArray(routes) ? routes : [routes]).flatMap(r => {
      const routeName = r['@name']
      const t = r.train
      const list = t ? (Array.isArray(t) ? t : [t]) : []
      return list.map(train => ({ ...train, rt: routeName }))
    })
    const trains = allTrains.map(normalizeTrain)
    res.json({ trains })
  } catch (e) {
    res.status(502).json({ error: 'CTA trains unavailable', detail: e.message })
  }
})

// GET /api/cta/arrivals?stop=:stopId
router.get('/arrivals', async (req, res) => {
  const { stop } = req.query
  if (!stop) return res.status(400).json({ error: 'stop param required' })
  try {
    const r = await fetch(`${BASE}/ttarrivals.aspx?stpid=${stop}&key=${key()}&outputType=JSON`)
    const data = await r.json()
    const raw = data?.ctatt?.eta
    const arrivals = raw
      ? (Array.isArray(raw) ? raw : [raw]).map(e => ({
          station:       e.staNm,
          line:          e.rt,
          arrTime:       e.arrT,
          isApproaching: e.isApp === '1',
          isDelayed:     e.isDly === '1',
        }))
      : []
    res.json({ arrivals })
  } catch (e) {
    res.status(502).json({ error: 'CTA arrivals unavailable', detail: e.message })
  }
})

// GET /api/cta/alerts
router.get('/alerts', async (_req, res) => {
  try {
    const r = await fetch('https://lapi.transitchicago.com/api/1.0/alerts.aspx?activeonly=true&outputType=JSON')
    const data = await r.json()
    const raw = data?.CTAAlerts?.Alert
    const alerts = raw ? (Array.isArray(raw) ? raw : [raw]).map(a => ({
      id:       a.AlertId,
      headline: a.Headline,
      impact:   a.Impact,
      affected: a.ImpactedService?.Service?.map?.(s => s.ShortDescription) || [],
    })) : []
    res.json({ alerts })
  } catch (e) {
    res.status(502).json({ error: 'CTA alerts unavailable', detail: e.message })
  }
})

module.exports = router
