const { Router } = require('express')
const db = require('../db')
const router = Router()

const stmtGet = db.prepare('SELECT data, cached_at FROM yelp_cache WHERE cache_key = ?')
const stmtSet = db.prepare('INSERT OR REPLACE INTO yelp_cache (cache_key, data, cached_at) VALUES (?, ?, ?)')

const CHICAGO_STOCKS = [
  { symbol: 'CME',  name: 'CME Group',           sector: 'Finance'    },
  { symbol: 'BA',   name: 'Boeing',               sector: 'Aerospace'  },
  { symbol: 'UAL',  name: 'United Airlines',      sector: 'Travel'     },
  { symbol: 'ABT',  name: 'Abbott Labs',          sector: 'Healthcare' },
  { symbol: 'ABBV', name: 'AbbVie',               sector: 'Pharma'     },
  { symbol: 'EXC',  name: 'Exelon',               sector: 'Energy'     },
  { symbol: 'MORN', name: 'Morningstar',          sector: 'Finance'    },
  { symbol: 'ALL',  name: 'Allstate',             sector: 'Insurance'  },
  { symbol: 'H',    name: 'Hyatt Hotels',         sector: 'Hospitality'},
  { symbol: 'MCD',  name: "McDonald's",           sector: 'Food'       },
  { symbol: 'MSI',  name: 'Motorola Solutions',   sector: 'Tech'       },
  { symbol: 'WBA',  name: 'Walgreens',            sector: 'Retail'     },
  { symbol: 'KHC',  name: 'Kraft Heinz',          sector: 'Food'       },
  { symbol: 'NTRS', name: 'Northern Trust',       sector: 'Finance'    },
  { symbol: 'ITW',  name: 'Ill. Tool Works',      sector: 'Industry'   },
  { symbol: 'CDW',  name: 'CDW Corporation',      sector: 'Tech'       },
  { symbol: 'TRU',  name: 'TransUnion',           sector: 'Finance'    },
  { symbol: 'ZBRA', name: 'Zebra Technologies',   sector: 'Tech'       },
  { symbol: 'GATX', name: 'GATX Corporation',     sector: 'Industry'   },
  { symbol: 'USFD', name: 'US Foods',             sector: 'Food'       },
]

const MOCK_QUOTES = {
  CME:  { price: 227.84, change: 1.23,  changePct: 0.54,  high: 229.10, low: 225.30, open: 226.00, prevClose: 226.61, history: [224.10, 225.30, 223.80, 226.50, 225.90, 226.61, 227.84], week52Low: 185.20, week52High: 243.40 },
  BA:   { price: 172.45, change: -2.18, changePct: -1.25, high: 174.80, low: 171.20, open: 174.50, prevClose: 174.63, history: [178.20, 176.50, 175.80, 177.40, 175.20, 174.63, 172.45], week52Low: 159.80, week52High: 267.54 },
  UAL:  { price: 68.92,  change: 0.87,  changePct: 1.28,  high: 69.45,  low: 67.80,  open: 68.10,  prevClose: 68.05,  history: [65.80,  66.40,  67.10,  66.80,  68.20,  68.05,  68.92],  week52Low: 37.45,  week52High: 102.38 },
  ABT:  { price: 126.34, change: -0.45, changePct: -0.35, high: 127.20, low: 125.80, open: 126.70, prevClose: 126.79, history: [128.10, 127.50, 126.90, 127.80, 127.20, 126.79, 126.34], week52Low: 100.34, week52High: 137.80 },
  ABBV: { price: 171.24, change: 0.83,  changePct: 0.49,  high: 172.00, low: 170.10, open: 170.50, prevClose: 170.41, history: [168.50, 169.20, 170.10, 169.80, 170.90, 170.41, 171.24], week52Low: 148.70, week52High: 202.84 },
  EXC:  { price: 42.18,  change: 0.32,  changePct: 0.76,  high: 42.55,  low: 41.90,  open: 41.95,  prevClose: 41.86,  history: [41.20,  41.50,  42.10,  41.80,  42.30,  41.86,  42.18],  week52Low: 34.80,  week52High: 47.20  },
  MORN: { price: 289.60, change: 3.40,  changePct: 1.19,  high: 290.80, low: 286.20, open: 287.00, prevClose: 286.20, history: [281.20, 283.50, 285.80, 284.20, 287.00, 286.20, 289.60], week52Low: 240.10, week52High: 312.50 },
  ALL:  { price: 198.75, change: -1.05, changePct: -0.53, high: 200.10, low: 198.20, open: 199.50, prevClose: 199.80, history: [202.10, 201.50, 200.80, 201.20, 200.40, 199.80, 198.75], week52Low: 155.30, week52High: 218.90 },
  H:    { price: 156.22, change: 0.68,  changePct: 0.44,  high: 157.00, low: 155.40, open: 155.80, prevClose: 155.54, history: [153.40, 154.20, 155.80, 154.90, 156.10, 155.54, 156.22], week52Low: 128.50, week52High: 182.40 },
  MCD:  { price: 296.40, change: 1.95,  changePct: 0.66,  high: 297.50, low: 294.80, open: 295.10, prevClose: 294.45, history: [291.20, 293.50, 292.80, 294.10, 295.50, 294.45, 296.40], week52Low: 243.70, week52High: 316.95 },
  MSI:  { price: 484.30, change: -3.20, changePct: -0.66, high: 488.00, low: 483.10, open: 487.20, prevClose: 487.50, history: [492.10, 490.50, 488.20, 489.80, 487.50, 487.50, 484.30], week52Low: 362.40, week52High: 521.20 },
  WBA:  { price: 10.84,  change: -0.23, changePct: -2.08, high: 11.20,  low: 10.75,  open: 11.05,  prevClose: 11.07,  history: [12.40,  11.90,  11.50,  11.20,  11.10,  11.07,  10.84],  week52Low: 8.60,   week52High: 20.30  },
  KHC:  { price: 29.45,  change: 0.12,  changePct: 0.41,  high: 29.70,  low: 29.10,  open: 29.30,  prevClose: 29.33,  history: [28.90,  29.10,  29.30,  29.20,  29.40,  29.33,  29.45],  week52Low: 27.05,  week52High: 40.84  },
  NTRS: { price: 94.18,  change: -0.62, changePct: -0.65, high: 95.10,  low: 93.80,  open: 94.75,  prevClose: 94.80,  history: [96.20,  95.80,  95.20,  94.90,  95.40,  94.80,  94.18],  week52Low: 69.40,  week52High: 105.60 },
  ITW:  { price: 255.40, change: 1.85,  changePct: 0.73,  high: 256.20, low: 253.80, open: 254.10, prevClose: 253.55, history: [251.20, 252.80, 254.10, 253.50, 255.20, 253.55, 255.40], week52Low: 220.80, week52High: 285.30 },
  CDW:  { price: 187.30, change: -1.20, changePct: -0.64, high: 189.00, low: 186.90, open: 188.50, prevClose: 188.50, history: [192.10, 191.50, 190.20, 189.80, 189.10, 188.50, 187.30], week52Low: 165.20, week52High: 239.45 },
  TRU:  { price: 78.45,  change: 0.55,  changePct: 0.71,  high: 79.20,  low: 77.90,  open: 78.10,  prevClose: 77.90,  history: [76.80,  77.20,  77.90,  77.50,  78.30,  77.90,  78.45],  week52Low: 61.30,  week52High: 96.50  },
  ZBRA: { price: 312.80, change: -2.40, changePct: -0.76, high: 315.60, low: 311.20, open: 314.90, prevClose: 315.20, history: [318.50, 317.20, 315.90, 316.80, 315.40, 315.20, 312.80], week52Low: 240.10, week52High: 358.80 },
  GATX: { price: 126.55, change: 0.95,  changePct: 0.76,  high: 127.20, low: 125.90, open: 126.00, prevClose: 125.60, history: [123.80, 124.50, 125.20, 124.90, 125.80, 125.60, 126.55], week52Low: 98.40,  week52High: 142.60 },
  USFD: { price: 41.30,  change: 0.18,  changePct: 0.44,  high: 41.60,  low: 40.95,  open: 41.10,  prevClose: 41.12,  history: [40.20,  40.60,  40.90,  41.10,  41.30,  41.12,  41.30],  week52Low: 34.80,  week52High: 53.40  },
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
