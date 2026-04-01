// frontend/src/App.jsx
import { Component, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import TransitPage from './pages/TransitPage'
import FoodPage from './pages/FoodPage'
import NeighborhoodsPage from './pages/NeighborhoodsPage'
import NightlifePage from './pages/NightlifePage'
import SportsPage from './pages/SportsPage'
import EventsPage from './pages/EventsPage'
import ExplorePage from './pages/ExplorePage'
import WeatherPage from './pages/WeatherPage'
import MyChicagoPage from './pages/MyChicagoPage'
import TonightPage from './pages/TonightPage'
import BeachPage from './pages/BeachPage'
import ReportsPage from './pages/ReportsPage'
import FinancePage from './pages/FinancePage'
import PoliticsPage from './pages/PoliticsPage'
import HealthPage from './pages/HealthPage'
import './App.css'

class PageBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 32, color: '#64748b', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
        Page error: {this.state.err.message}
      </div>
    )
    return this.props.children
  }
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function App() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    navigator.serviceWorker.register('/sw.js').then(async reg => {
      const r = await fetch(`${API}/api/push/vapid-key`)
      const { key } = await r.json()
      if (!key) return
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      })
      await fetch(`${API}/api/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
            auth:   btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')))),
          },
        }),
      })
    }).catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <Sidebar />
      <main className="main-content">
        <PageBoundary>
          <Routes>
            <Route path="/"              element={<HomePage />} />
            <Route path="/transit"       element={<TransitPage />} />
            <Route path="/food"          element={<FoodPage />} />
            <Route path="/neighborhoods" element={<NeighborhoodsPage />} />
            <Route path="/nightlife"     element={<NightlifePage />} />
            <Route path="/sports"        element={<SportsPage />} />
            <Route path="/events"        element={<EventsPage />} />
            <Route path="/explore"       element={<ExplorePage />} />
            <Route path="/weather"       element={<WeatherPage />} />
            <Route path="/me"            element={<MyChicagoPage />} />
            <Route path="/tonight"       element={<TonightPage />} />
            <Route path="/beach"         element={<BeachPage />} />
            <Route path="/311"           element={<ReportsPage />} />
            <Route path="/finance"       element={<FinancePage />} />
            <Route path="/news"           element={<PoliticsPage />} />
            <Route path="/health"        element={<HealthPage />} />
          </Routes>
        </PageBoundary>
      </main>
    </BrowserRouter>
  )
}
