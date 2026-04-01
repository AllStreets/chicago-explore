const { Router } = require('express')
const db = require('../db')
const router = Router()

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

const CHICAGO_STOCKS = [
  { symbol: 'CME',  name: 'CME Group',          sector: 'Finance' },
  { symbol: 'BA',   name: 'Boeing',              sector: 'Aerospace' },
  { symbol: 'UAL',  name: 'United Airlines',     sector: 'Travel' },
  { symbol: 'ABT',  name: 'Abbott Labs',         sector: 'Healthcare' },
  { symbol: 'EXC',  name: 'Exelon',              sector: 'Energy' },
  { symbol: 'MORN', name: 'Morningstar',         sector: 'Finance' },
  { symbol: 'ALL',  name: 'Allstate',            sector: 'Insurance' },
  { symbol: 'H',    name: 'Hyatt Hotels',        sector: 'Hospitality' },
  { symbol: 'MCD',  name: "McDonald's",          sector: 'Food' },
  { symbol: 'MSI',  name: 'Motorola Solutions',  sector: 'Tech' },
  { symbol: 'WBA',  name: 'Walgreens',           sector: 'Retail' },
  { symbol: 'KHC',  name: 'Kraft Heinz',         sector: 'Food' },
]

const MOCK_QUOTES = {
  CME:  { price: 227.84, change: 1.23,  changePct: 0.54,  high: 229.10, low: 225.30, open: 226.00, prevClose: 226.61 },
  BA:   { price: 172.45, change: -2.18, changePct: -1.25, high: 174.80, low: 171.20, open: 174.50, prevClose: 174.63 },
  UAL:  { price: 68.92,  change: 0.87,  changePct: 1.28,  high: 69.45,  low: 67.80,  open: 68.10,  prevClose: 68.05 },
  ABT:  { price: 126.34, change: -0.45, changePct: -0.35, high: 127.20, low: 125.80, open: 126.70, prevClose: 126.79 },
  EXC:  { price: 42.18,  change: 0.32,  changePct: 0.76,  high: 42.55,  low: 41.90,  open: 41.95,  prevClose: 41.86 },
  MORN: { price: 289.60, change: 3.40,  changePct: 1.19,  high: 290.80, low: 286.20, open: 287.00, prevClose: 286.20 },
  ALL:  { price: 198.75, change: -1.05, changePct: -0.53, high: 200.10, low: 198.20, open: 199.50, prevClose: 199.80 },
  H:    { price: 156.22, change: 0.68,  changePct: 0.44,  high: 157.00, low: 155.40, open: 155.80, prevClose: 155.54 },
  MCD:  { price: 296.40, change: 1.95,  changePct: 0.66,  high: 297.50, low: 294.80, open: 295.10, prevClose: 294.45 },
  MSI:  { price: 484.30, change: -3.20, changePct: -0.66, high: 488.00, low: 483.10, open: 487.20, prevClose: 487.50 },
  WBA:  { price: 10.84,  change: -0.23, changePct: -2.08, high: 11.20,  low: 10.75,  open: 11.05,  prevClose: 11.07 },
  KHC:  { price: 29.45,  change: 0.12,  changePct: 0.41,  high: 29.70,  low: 29.10,  open: 29.30,  prevClose: 29.33 },
}

const RENT_DATA = [
  { neighborhood: 'Streeterville',  avgRent: 3200, trend: 'up',   yoy: 4.2 },
  { neighborhood: 'West Loop',      avgRent: 2900, trend: 'up',   yoy: 6.1 },
  { neighborhood: 'River North',    avgRent: 2800, trend: 'up',   yoy: 3.8 },
  { neighborhood: 'Old Town',       avgRent: 2600, trend: 'flat', yoy: 1.2 },
  { neighborhood: 'Lincoln Park',   avgRent: 2400, trend: 'up',   yoy: 2.9 },
  { neighborhood: 'Bucktown',       avgRent: 2300, trend: 'flat', yoy: 0.8 },
  { neighborhood: 'Wicker Park',    avgRent: 2100, trend: 'up',   yoy: 3.4 },
  { neighborhood: 'South Loop',     avgRent: 2000, trend: 'down', yoy: -1.1 },
  { neighborhood: 'Logan Square',   avgRent: 1900, trend: 'up',   yoy: 4.7 },
  { neighborhood: 'Andersonville',  avgRent: 1800, trend: 'up',   yoy: 2.1 },
  { neighborhood: 'Hyde Park',      avgRent: 1700, trend: 'flat', yoy: 0.5 },
  { neighborhood: 'Pilsen',         avgRent: 1600, trend: 'up',   yoy: 5.8 },
]

// GET /api/finance/stocks
router.get('/stocks', async (req, res) => {
  const CACHE_KEY = 'finance_stocks_v1'
  const TTL_MS = 5 * 60 * 1000 // 5 minutes

  try {
    const cached = stmtGet.get(CACHE_KEY)
    if (cached && Date.now() - cached.cached_at < TTL_MS) {
      return res.json(JSON.parse(cached.data))
    }
  } catch {}

  const apiKey = process.env.FINNHUB_API_KEY

  let result

  if (apiKey) {
    try {
      const quotes = await Promise.all(
        CHICAGO_STOCKS.map(async ({ symbol, name, sector }) => {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 8000)
          try {
            const r = await fetch(
              `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
              { signal: controller.signal }
            )
            const q = await r.json()
            return {
              symbol,
              name,
              sector,
              price:     q.c,
              change:    q.d,
              changePct: q.dp,
              high:      q.h,
              low:       q.l,
              open:      q.o,
              prevClose: q.pc,
            }
          } finally {
            clearTimeout(timer)
          }
        })
      )
      result = quotes
    } catch {
      // fall through to mock
    }
  }

  if (!result) {
    result = CHICAGO_STOCKS.map(({ symbol, name, sector }) => ({
      symbol,
      name,
      sector,
      ...MOCK_QUOTES[symbol],
    }))
  }

  try {
    stmtSet.run(CACHE_KEY, JSON.stringify(result), Date.now())
  } catch {}

  res.json(result)
})

// GET /api/finance/rents
router.get('/rents', (req, res) => {
  res.json(RENT_DATA)
})

// GET /api/finance/indicators
router.get('/indicators', (req, res) => {
  res.json([
    { label: 'Chicago Unemployment',    value: '4.1%',    change: '-0.2%',  trend: 'down', note: 'vs 4.3% last month' },
    { label: 'Chicago CPI (YoY)',        value: '3.2%',    change: '+0.1%',  trend: 'up',   note: 'Core inflation' },
    { label: 'Median Household Income',  value: '$65,781', change: '+2.1%',  trend: 'up',   note: 'City of Chicago' },
    { label: 'Office Vacancy Rate',      value: '22.4%',   change: '+1.2%',  trend: 'up',   note: 'Downtown Chicago' },
    { label: 'Hotel Occupancy',          value: '71.3%',   change: '+4.8%',  trend: 'up',   note: 'City-wide YTD' },
    { label: "O'Hare Passengers",        value: '8.2M',    change: '+5.1%',  trend: 'up',   note: 'YTD monthly avg' },
    { label: 'Chicago PMI',              value: '45.5',    change: '-2.3',   trend: 'down', note: 'Manufacturing index' },
    { label: 'Midway Cargo (tons)',       value: '19,840',  change: '+3.2%',  trend: 'up',   note: 'Monthly avg' },
  ])
})

module.exports = router
