import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'

// Mock mapbox-gl — no WebGL in jsdom
vi.mock('mapbox-gl', () => {
  function MockMap() {
    this.on = vi.fn()
    this.addControl = vi.fn()
    this.remove = vi.fn()
    this.addSource = vi.fn()
    this.addLayer = vi.fn()
    this.getSource = vi.fn(() => ({ setData: vi.fn() }))
    this.getLayer = vi.fn(() => null)
    this.isStyleLoaded = vi.fn(() => true)
    this.getStyle = vi.fn(() => ({ layers: [] }))
    this.getCanvas = vi.fn(() => ({ style: {} }))
  }
  function MockNavigationControl() {}
  function MockMarker() {
    this.setLngLat = vi.fn(() => this)
    this.addTo = vi.fn(() => this)
    this.remove = vi.fn()
  }
  function MockPopup() {
    this.setLngLat = vi.fn(() => this)
    this.setHTML = vi.fn(() => this)
    this.addTo = vi.fn(() => this)
  }
  return {
    default: {
      Map: MockMap,
      NavigationControl: MockNavigationControl,
      Marker: MockMarker,
      Popup: MockPopup,
      accessToken: '',
    }
  }
})

vi.mock('../../hooks/useCTA', () => ({
  default: () => ({ trains: [], loading: false, error: null })
}))
vi.mock('../../hooks/useWeather', () => ({
  default: () => ({
    weather: { temp: 18, description: 'clear', wind: { speed: 3 } },
    lake: { niceLabel: 'Great day', niceScore: 80, tempC: 16 },
    loading: false
  })
}))
vi.mock('../../hooks/useYelp', () => ({ default: () => ({ places: [], loading: false }) }))
vi.mock('../../hooks/useHomeFeed', () => ({ default: () => ({ feed: { trainCount: null, weather: null, nextEvent: null }, loading: false }) }))

import HomePage from '../HomePage'

describe('HomePage', () => {
  it('renders without crashing', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(document.querySelector('.home-page')).toBeTruthy()
  })

  it('renders the intel feed overlay', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByText(/LIVE INTEL/i)).toBeInTheDocument()
  })

  it('fetches neighborhood boundaries on mount', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ type: 'FeatureCollection', features: [] }) })
    )
    global.fetch = fetchMock
    const { unmount } = render(<MemoryRouter><HomePage /></MemoryRouter>)
    await new Promise(r => setTimeout(r, 50))
    const calls = fetchMock.mock.calls.map(c => c[0])
    expect(calls.some(url => url.includes('/api/neighborhoods/boundaries'))).toBe(true)
    unmount()
  })
})
