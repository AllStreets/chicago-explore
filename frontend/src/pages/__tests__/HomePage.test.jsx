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
    this.isStyleLoaded = vi.fn(() => true)
    this.getStyle = vi.fn(() => ({ layers: [] }))
  }
  function MockNavigationControl() {}
  return {
    default: {
      Map: MockMap,
      NavigationControl: MockNavigationControl,
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
})
