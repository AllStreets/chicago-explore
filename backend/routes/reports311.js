// backend/routes/reports311.js
const { Router } = require('express')
const router = Router()

// Chicago Data Portal — 311 service requests (public, no key)
const BASE = 'https://data.cityofchicago.org/resource/v6vf-nfxy.json'

const TYPE_COLOR = {
  'Graffiti Removal':         '#f97316',
  'Pothole in Street':        '#ef4444',
  'Street Light Out':         '#eab308',
  'Garbage Cart Maintenance': '#10b981',
  'Tree Trim':                '#22c55e',
  'Rodent Baiting':           '#8b5cf6',
}

router.get('/', async (req, res) => {
  try {
    const where = encodeURIComponent(
      `latitude > 41.87 AND latitude < 41.92 AND longitude > -87.65 AND longitude < -87.61`
    )
    const url = `${BASE}?$where=${where}&$order=created_date DESC&$limit=50`
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!r.ok) throw new Error(`311 API ${r.status}`)
    const raw = await r.json()
    const reports = raw.map(item => ({
      id:      item.service_request_number || item.sr_number || String(Math.random()),
      type:    item.type_of_service_request || item.sr_type || 'Service Request',
      status:  item.status || 'Open',
      address: item.street_address || item.address || '',
      created: item.created_date || '',
      lat:     parseFloat(item.latitude),
      lon:     parseFloat(item.longitude),
      color:   TYPE_COLOR[item.type_of_service_request] || '#64748b',
    })).filter(r => r.lat && r.lon)
    res.json({ reports })
  } catch (e) {
    res.status(502).json({ error: '311 data unavailable', detail: e.message })
  }
})

module.exports = router
