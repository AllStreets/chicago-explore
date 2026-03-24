import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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
    this.getCanvas = vi.fn(() => ({ style: {} }))
  }
  return {
    default: {
      Map: MockMap,
      NavigationControl: vi.fn(),
      accessToken: '',
    }
  }
})

vi.mock('../../hooks/useCTA', () => ({
  default: () => ({
    trains: [{ rn: '1', line: 'Red', lat: 41.88, lon: -87.63, nextStation: 'Grand', arrTime: null }],
    loading: false,
    error: null
  })
}))

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ stations: [] })
})

import TransitPage from '../TransitPage'

describe('TransitPage', () => {
  it('renders the CTA header', () => {
    render(<MemoryRouter><TransitPage /></MemoryRouter>)
    expect(screen.getByText(/CTA/i)).toBeInTheDocument()
  })

  it('renders line status cards', () => {
    render(<MemoryRouter><TransitPage /></MemoryRouter>)
    expect(screen.getByText(/Red Line/i)).toBeInTheDocument()
  })
})
