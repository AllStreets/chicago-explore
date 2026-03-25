// frontend/src/components/Sidebar.jsx
import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  RiHome4Line, RiCompassDiscoverLine, RiSubwayLine, RiRestaurantLine,
  RiMoonLine, RiFootballLine, RiCalendarEventLine, RiCloudLine,
  RiCommunityLine, RiUser3Line, RiMenuLine,
} from 'react-icons/ri'
import './Sidebar.css'

const NAV = [
  { to: '/',              icon: RiHome4Line,           label: 'Home' },
  { to: '/explore',       icon: RiCompassDiscoverLine, label: 'Explore' },
  { to: '/transit',       icon: RiSubwayLine,          label: 'Transit' },
  { to: '/nightlife',     icon: RiMoonLine,            label: 'Nightlife' },
  { to: '/food',          icon: RiRestaurantLine,      label: 'Food & Drink' },
  { to: '/sports',        icon: RiFootballLine,        label: 'Sports' },
  { to: '/events',        icon: RiCalendarEventLine,   label: 'Events' },
  { to: '/weather',       icon: RiCloudLine,           label: 'Weather & Lake' },
  { to: '/neighborhoods', icon: RiCommunityLine,       label: 'Neighborhoods' },
  { to: '/me',            icon: RiUser3Line,           label: 'My Chicago' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-w', collapsed ? '48px' : '200px'
    )
  }, [collapsed])

  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && <span className="sidebar-logo-text">CHICAGO</span>}
        <button
          className="sidebar-hamburger"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
        >
          <RiMenuLine />
        </button>
      </div>
      <ul className="sidebar-nav">
        {NAV.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              title={collapsed ? label : ''}
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
