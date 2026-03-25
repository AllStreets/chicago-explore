// frontend/src/App.jsx
import { Component } from 'react'
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

export default function App() {
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
          </Routes>
        </PageBoundary>
      </main>
    </BrowserRouter>
  )
}
