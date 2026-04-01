import { useEffect, useState } from 'react'
import { RiArrowUpLine, RiArrowDownLine, RiSubtractLine, RiRefreshLine, RiBarChartLine, RiBuilding2Line, RiLineChartLine } from 'react-icons/ri'
import './FinancePage.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function useFinance() {
  const [stocks, setStocks] = useState([])
  const [rents, setRents] = useState([])
  const [indicators, setIndicators] = useState([])
  const [loading, setLoading] = useState(true)
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

function TrendIcon({ trend, size = 12 }) {
  if (trend === 'up')   return <RiArrowUpLine size={size} style={{ color: '#22c55e' }} />
  if (trend === 'down') return <RiArrowDownLine size={size} style={{ color: '#ef4444' }} />
  return <RiSubtractLine size={size} style={{ color: '#64748b' }} />
}

function TickerStrip({ stocks }) {
  if (!stocks.length) return null
  const items = [...stocks, ...stocks] // duplicate for seamless loop
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

  const fmtTime = t => t ? t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '--'

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
        {/* Chicago Stocks */}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="fin-right-col">
          {/* Rent Barometer */}
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

          {/* Economic Indicators */}
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
    </div>
  )
}
