import { useEffect, useState } from 'react'
import {
  RiArrowUpLine, RiArrowDownLine, RiSubtractLine, RiRefreshLine,
  RiBarChartLine, RiBuilding2Line, RiLineChartLine, RiBarChart2Line,
  RiExchangeLine,
} from 'react-icons/ri'
import './FinancePage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function useFinance() {
  const [stocks, setStocks]         = useState([])
  const [rents, setRents]           = useState([])
  const [indicators, setIndicators] = useState([])
  const [loading, setLoading]       = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [s, r, i] = await Promise.all([
        fetch(`${API}/api/finance/stocks`).then(x => x.json()),
        fetch(`${API}/api/finance/rents`).then(x => x.json()),
        fetch(`${API}/api/finance/indicators`).then(x => x.json()),
      ])
      setStocks(Array.isArray(s) ? s : [])
      setRents(Array.isArray(r) ? r : [])
      setIndicators(Array.isArray(i) ? i : [])
      setLastUpdated(new Date())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return { stocks, rents, indicators, loading, lastUpdated, refresh: load }
}

function Sparkline({ data, positive }) {
  if (!data || data.length < 2) return <span style={{ width: 60, display: 'inline-block' }} />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const W = 60, H = 20
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const color = positive ? '#22c55e' : '#ef4444'
  return (
    <svg width={W} height={H} style={{ overflow: 'visible', display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  )
}

function TopMovers({ stocks }) {
  if (!stocks.length) return null
  const sorted  = [...stocks].sort((a, b) => b.changePct - a.changePct)
  const gainers = sorted.slice(0, 4)
  const losers  = sorted.slice(-4).reverse()
  return (
    <div className="fin-panel fin-panel--movers">
      <div className="fin-panel-label"><RiExchangeLine size={11} /> TOP MOVERS — TODAY</div>
      <div className="fin-movers-body">
        <div className="fin-movers-col">
          <div className="fin-movers-col-hdr up">GAINING</div>
          {gainers.map(s => (
            <div key={s.symbol} className="fin-mover-row">
              <div className="fin-mover-left">
                <span className="fin-mover-sym">{s.symbol}</span>
                <span className="fin-mover-name">{s.name}</span>
              </div>
              <div className="fin-mover-right">
                <span className="fin-mover-pct pos">+{s.changePct.toFixed(2)}%</span>
                <Sparkline data={s.history} positive={true} />
              </div>
            </div>
          ))}
        </div>
        <div className="fin-movers-divider" />
        <div className="fin-movers-col">
          <div className="fin-movers-col-hdr neg">DECLINING</div>
          {losers.map(s => (
            <div key={s.symbol} className="fin-mover-row">
              <div className="fin-mover-left">
                <span className="fin-mover-sym">{s.symbol}</span>
                <span className="fin-mover-name">{s.name}</span>
              </div>
              <div className="fin-mover-right">
                <span className="fin-mover-pct neg">{s.changePct.toFixed(2)}%</span>
                <Sparkline data={s.history} positive={false} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChicagoIndex({ stocks }) {
  const valid = stocks.filter(s => s.history && s.history.length >= 2)
  if (!valid.length) return null

  const LEN = 7
  const normalized = valid.map(s => {
    const base = s.history[0] || 1
    return s.history.map(v => (v / base) * 100)
  })
  const avg = Array.from({ length: LEN }, (_, i) =>
    normalized.reduce((sum, h) => sum + (h[i] ?? 100), 0) / normalized.length
  )

  const min = Math.min(...avg)
  const max = Math.max(...avg)
  const range = max - min || 0.01
  const W = 300, H = 80, PX = 6, PY = 4
  const pts = avg.map((v, i) => [
    PX + (i / (LEN - 1)) * (W - PX * 2),
    H - PY - ((v - min) / range) * (H - PY * 2),
  ])
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`
  const overallChg = ((avg[LEN - 1] - avg[0]) / avg[0]) * 100
  const pos = overallChg >= 0
  const color = pos ? '#22c55e' : '#ef4444'
  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'TODAY']

  return (
    <div className="fin-panel fin-panel--index">
      <div className="fin-panel-label"><RiLineChartLine size={11} /> CHICAGO COMPOSITE — 7-DAY</div>
      <div className="fin-index-stat">
        <span className="fin-index-base">BASE 100</span>
        <span className={`fin-index-chg ${pos ? 'pos' : 'neg'}`}>
          {pos ? '+' : ''}{overallChg.toFixed(2)}% 7D
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ width: '100%', height: 88, display: 'block' }}>
        <defs>
          <linearGradient id="idx-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line key={i}
            x1={PX} y1={PY + t * (H - PY * 2)}
            x2={W - PX} y2={PY + t * (H - PY * 2)}
            stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        ))}
        <path d={areaD} fill="url(#idx-grad)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3.5} fill={color} />
      </svg>
      <div className="fin-index-days">
        {DAYS.map((d, i) => (
          <span key={i} className={`fin-index-day${i === LEN - 1 ? ' active' : ''}`}>{d}</span>
        ))}
      </div>
    </div>
  )
}

function RangePositions({ stocks }) {
  const valid = stocks.filter(s => s.week52Low && s.week52High && s.price)
  if (!valid.length) return null
  return (
    <div className="fin-panel fin-panel--range">
      <div className="fin-panel-label"><RiBarChart2Line size={11} /> 52-WEEK RANGE POSITION</div>
      <div className="fin-range-rows">
        {valid.slice(0, 10).map(s => {
          const pct = Math.max(0, Math.min(1,
            (s.price - s.week52Low) / (s.week52High - s.week52Low)
          ))
          const color = pct < 0.3 ? '#ef4444' : pct > 0.7 ? '#22c55e' : '#f59e0b'
          return (
            <div key={s.symbol} className="fin-range-row">
              <span className="fin-range-sym">{s.symbol}</span>
              <div className="fin-range-track">
                <div className="fin-range-fill" style={{ width: `${pct * 100}%`, background: color }} />
                <div className="fin-range-dot" style={{ left: `${pct * 100}%`, background: color }} />
              </div>
              <span className="fin-range-pct" style={{ color }}>{Math.round(pct * 100)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SectorHeatmap({ stocks }) {
  if (!stocks.length) return null
  const map = {}
  stocks.forEach(s => {
    if (!map[s.sector]) map[s.sector] = { sum: 0, count: 0 }
    map[s.sector].sum += (s.changePct || 0)
    map[s.sector].count++
  })
  const sectors = Object.entries(map)
    .map(([name, { sum, count }]) => ({ name, avg: sum / count }))
    .sort((a, b) => b.avg - a.avg)
  const maxAbs = Math.max(...sectors.map(s => Math.abs(s.avg)), 0.01)

  return (
    <div className="fin-panel fin-panel--sectors">
      <div className="fin-panel-label"><RiBarChart2Line size={11} /> SECTOR PERFORMANCE</div>
      <div className="fin-sector-rows">
        {sectors.map(s => {
          const pos = s.avg >= 0
          const barW = Math.round((Math.abs(s.avg) / maxAbs) * 100)
          return (
            <div key={s.name} className="fin-sector-row">
              <span className="fin-sector-name">{s.name}</span>
              <div className="fin-sector-bar-wrap">
                <div className={`fin-sector-bar ${pos ? 'pos' : 'neg'}`} style={{ width: `${barW}%` }} />
              </div>
              <span className={`fin-sector-chg ${pos ? 'pos' : 'neg'}`}>
                {pos ? '+' : ''}{s.avg.toFixed(2)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TrendIcon({ trend, size = 12 }) {
  if (trend === 'up')   return <RiArrowUpLine size={size} style={{ color: '#22c55e' }} />
  if (trend === 'down') return <RiArrowDownLine size={size} style={{ color: '#ef4444' }} />
  return <RiSubtractLine size={size} style={{ color: '#64748b' }} />
}

function TickerStrip({ stocks }) {
  if (!stocks.length) return null
  const items = [...stocks, ...stocks]
  return (
    <div className="fin-ticker-wrap">
      <div className="fin-ticker-inner">
        {items.map((s, i) => (
          <span key={i} className="fin-ticker-item">
            <span className="fin-ticker-sym">{s.symbol}</span>
            <span className="fin-ticker-price">${s.price?.toFixed(2)}</span>
            <span className={`fin-ticker-chg${s.change >= 0 ? ' pos' : ' neg'}`}>
              {s.change >= 0 ? '+' : ''}{s.change?.toFixed(2)} ({s.changePct >= 0 ? '+' : ''}{s.changePct?.toFixed(2)}%)
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function FinancePage() {
  const { stocks, rents, indicators, loading, lastUpdated, refresh } = useFinance()

  const fmtTime = t => t
    ? t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    : '--'

  return (
    <div className="fin-page">
      <div className="fin-header">
        <div className="fin-title-row">
          <span className="fin-title">CHICAGO FINANCE</span>
          <div className="fin-header-right">
            {lastUpdated && <span className="fin-last-updated">UPDATED {fmtTime(lastUpdated)}</span>}
            <button className={`fin-refresh${loading ? ' spinning' : ''}`} onClick={refresh} title="Refresh">
              <RiRefreshLine size={13} />
            </button>
          </div>
        </div>
        <TickerStrip stocks={stocks} />
      </div>

      <div className="fin-grid">
        <div className="fin-panel fin-panel--stocks">
          <div className="fin-panel-label"><RiBarChartLine size={11} /> CHICAGO EQUITIES</div>
          <table className="fin-table">
            <thead>
              <tr>
                <th>SYMBOL</th>
                <th>COMPANY</th>
                <th className="fin-num">PRICE</th>
                <th className="fin-num">CHG</th>
                <th className="fin-num">CHG%</th>
                <th>SECTOR</th>
                <th className="fin-spark-th">7D</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map(s => (
                <tr key={s.symbol} className={s.change >= 0 ? 'pos-row' : 'neg-row'}>
                  <td className="fin-sym">{s.symbol}</td>
                  <td className="fin-name">{s.name}</td>
                  <td className="fin-num fin-price">${s.price?.toFixed(2)}</td>
                  <td className={`fin-num ${s.change >= 0 ? 'pos' : 'neg'}`}>
                    {s.change >= 0 ? '+' : ''}{s.change?.toFixed(2)}
                  </td>
                  <td className={`fin-num ${s.changePct >= 0 ? 'pos' : 'neg'}`}>
                    {s.changePct >= 0 ? '+' : ''}{s.changePct?.toFixed(2)}%
                  </td>
                  <td><span className="fin-sector">{s.sector}</span></td>
                  <td className="fin-spark-td">
                    <Sparkline data={s.history} positive={s.change >= 0} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="fin-right-col">
          <div className="fin-panel fin-panel--rents">
            <div className="fin-panel-label"><RiBuilding2Line size={11} /> CHICAGO RENT BAROMETER</div>
            <div className="fin-rent-grid">
              {rents.map(r => (
                <div key={r.neighborhood} className="fin-rent-row">
                  <span className="fin-rent-hood">{r.neighborhood}</span>
                  <div className="fin-rent-bar-wrap">
                    <div className="fin-rent-bar" style={{ width: `${Math.round((r.avgRent / 3500) * 100)}%` }} />
                  </div>
                  <span className="fin-rent-val">${r.avgRent.toLocaleString()}</span>
                  <span className={`fin-rent-yoy ${r.trend}`}>
                    <TrendIcon trend={r.trend} size={10} />
                    {r.yoy > 0 ? '+' : ''}{r.yoy}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="fin-panel fin-panel--indicators">
            <div className="fin-panel-label"><RiLineChartLine size={11} /> ECONOMIC PULSE</div>
            <div className="fin-indicators">
              {indicators.map((ind, i) => (
                <div key={i} className="fin-ind-row">
                  <div className="fin-ind-left">
                    <span className="fin-ind-label">{ind.label}</span>
                    <span className="fin-ind-note">{ind.note}</span>
                  </div>
                  <div className="fin-ind-right">
                    <span className="fin-ind-value">{ind.value}</span>
                    <span className={`fin-ind-chg ${ind.trend}`}>
                      <TrendIcon trend={ind.trend} size={10} />
                      {ind.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fin-bottom-row">
        <TopMovers stocks={stocks} />
        <ChicagoIndex stocks={stocks} />
        <SectorHeatmap stocks={stocks} />
        <RangePositions stocks={stocks} />
      </div>
    </div>
  )
}
