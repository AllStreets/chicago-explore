// frontend/src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom'
import {
  RiHome4Line, RiSubwayLine, RiRestaurantLine, RiCommunityLine,
  RiMoonLine, RiFootballLine, RiCalendarEventLine, RiCompassDiscoverLine,
  RiCloudLine, RiUser3Line
} from 'react-icons/ri'
import './Sidebar.css'

const NAV = [
  { to: '/',              icon: RiHome4Line,           label: 'Home' },
  { to: '/transit',       icon: RiSubwayLine,          label: 'Transit' },
  { to: '/food',          icon: RiRestaurantLine,      label: 'Food & Drink' },
  { to: '/neighborhoods', icon: RiCommunityLine,       label: 'Neighborhoods' },
  { to: '/nightlife',     icon: RiMoonLine,            label: 'Nightlife' },
  { to: '/sports',        icon: RiFootballLine,        label: 'Sports' },
  { to: '/events',        icon: RiCalendarEventLine,   label: 'Events' },
  { to: '/explore',       icon: RiCompassDiscoverLine, label: 'Explore' },
  { to: '/weather',       icon: RiCloudLine,           label: 'Weather & Lake' },
  { to: '/me',            icon: RiUser3Line,           label: 'My Chicago' },
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
