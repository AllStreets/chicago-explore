// frontend/src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import {
  RiMapPin2Line, RiBuilding2Line, RiTrainLine, RiRestaurantLine,
  RiMoonLine, RiTrophyLine, RiCalendarEventLine, RiCompassLine,
  RiWindyLine, RiUserHeartLine
} from 'react-icons/ri'
import './Sidebar.css'

const NAV = [
  { to: '/',              icon: RiMapPin2Line,       label: 'Home' },
  { to: '/neighborhoods', icon: RiBuilding2Line,     label: 'Neighborhoods' },
  { to: '/transit',       icon: RiTrainLine,         label: 'Transit' },
  { to: '/food',          icon: RiRestaurantLine,    label: 'Food & Drink' },
  { to: '/nightlife',     icon: RiMoonLine,          label: 'Nightlife' },
  { to: '/sports',        icon: RiTrophyLine,        label: 'Sports' },
  { to: '/events',        icon: RiCalendarEventLine, label: 'Events' },
  { to: '/explore',       icon: RiCompassLine,       label: 'Explore' },
  { to: '/weather',       icon: RiWindyLine,         label: 'Weather & Lake' },
  { to: '/me',            icon: RiUserHeartLine,     label: 'My Chicago' },
]

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-text">CHI</span>
      </div>
      <ul className="sidebar-nav">
        {NAV.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              aria-label={label}
            >
              <Icon className="sidebar-icon" />
              <span className="sidebar-label">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
