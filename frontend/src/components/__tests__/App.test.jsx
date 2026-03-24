import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('mapbox-gl', () => {
  function MockMap() {
    this.on = vi.fn()
    this.addControl = vi.fn()
    this.remove = vi.fn()
    this.addSource = vi.fn()
    this.addLayer = vi.fn()
    this.getSource = vi.fn(() => ({ setData: vi.fn() }))
    this.isStyleLoaded = vi.fn(() => true)
    this.getStyle = vi.fn(() => ({ layers: [] }))
    this.getCanvas = vi.fn(() => ({ style: {} }))
  }
  return { default: { Map: MockMap, NavigationControl: vi.fn(), accessToken: '' } }
})

vi.mock('../../hooks/useCTA', () => ({ default: () => ({ trains: [], loading: false, error: null }) }))
vi.mock('../../hooks/useWeather', () => ({ default: () => ({ weather: null, lake: null, loading: false }) }))
vi.mock('../../hooks/useYelp', () => ({ default: () => ({ places: [], loading: false }) }))
vi.mock('../../hooks/useHomeFeed', () => ({ default: () => ({ feed: { trainCount: null, weather: null, nextEvent: null }, loading: false }) }))

import App from '../../App'

describe('App routing', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
