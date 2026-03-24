const { Router } = require('express')
const router = Router()

const BASE = 'http://lapi.transitchicago.com/api/1.0'
const key = () => process.env.CTA_API_KEY

function normalizeTrain(t) {
  return {
    rn:          t.rn,
    lat:         parseFloat(t.lat),
    lon:         parseFloat(t.lon),
    heading:     parseInt(t.heading, 10),
    line:        t.rt,
    nextStation: t.nextStaNm,
    predTime:    t.prdt,
    arrTime:     t.arrT,
  }
}

// GET /api/cta/trains — all active train positions
router.get('/trains', async (_req, res) => {
  try {
    const r = await fetch(`${BASE}/ttpositions.aspx?rt=Red,Blue,Brn,G,Org,P,Pink,Y&key=${key()}&outputType=JSON`)
    const data = await r.json()
    const raw = data?.ctatt?.train
    const trains = raw ? (Array.isArray(raw) ? raw : [raw]).map(normalizeTrain) : []
    res.json({ trains })
  } catch (e) {
    res.status(502).json({ error: 'CTA trains unavailable', detail: e.message })
  }
})

// GET /api/cta/arrivals?stop=:stopId — arrivals for a stop
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

// GET /api/cta/alerts — service alerts
router.get('/alerts', async (_req, res) => {
  try {
    const r = await fetch(`https://lapi.transitchicago.com/api/1.0/alerts.aspx?activeonly=true&outputType=JSON`)
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
