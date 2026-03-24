// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import TransitPage from './pages/TransitPage'
import FoodPage from './pages/FoodPage'
import './App.css'

function ComingSoon({ name }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
      {name} — coming in Phase 2
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"              element={<HomePage />} />
          <Route path="/transit"       element={<TransitPage />} />
          <Route path="/food"          element={<FoodPage />} />
          <Route path="/neighborhoods" element={<ComingSoon name="Neighborhoods" />} />
          <Route path="/nightlife"     element={<ComingSoon name="Nightlife" />} />
          <Route path="/sports"        element={<ComingSoon name="Sports" />} />
          <Route path="/events"        element={<ComingSoon name="Events" />} />
          <Route path="/explore"       element={<ComingSoon name="Explore" />} />
          <Route path="/weather"       element={<ComingSoon name="Weather & Lake" />} />
          <Route path="/me"            element={<ComingSoon name="My Chicago" />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
