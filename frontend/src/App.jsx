// frontend/src/App.jsx
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

export default function App() {
  return (
    <BrowserRouter>
      <Sidebar />
      <main className="main-content">
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
      </main>
    </BrowserRouter>
  )
}
