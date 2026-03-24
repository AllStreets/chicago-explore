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
  function MockPopup() {
    this.setLngLat = vi.fn(() => this)
    this.setHTML = vi.fn(() => this)
    this.addTo = vi.fn(() => this)
  }
  return {
    default: {
      Map: MockMap,
      NavigationControl: vi.fn(),
      Popup: MockPopup,
      accessToken: '',
    }
  }
})

vi.mock('../../hooks/useYelp', () => ({
  default: () => ({
    places: [
      {
        id: '1',
        name: 'The Gage',
        rating: 4.2,
        price: '$$',
        categories: ['American'],
        lat: 41.88,
        lon: -87.62,
        neighborhood: 'Loop'
      }
    ],
    loading: false
  })
}))

import FoodPage from '../FoodPage'

describe('FoodPage', () => {
  it('renders the Food & Drink header', () => {
    render(<MemoryRouter><FoodPage /></MemoryRouter>)
    expect(screen.getByText(/Food & Drink/i)).toBeInTheDocument()
  })

  it('renders place cards from hook', () => {
    render(<MemoryRouter><FoodPage /></MemoryRouter>)
    expect(screen.getByText('The Gage')).toBeInTheDocument()
  })

  it('shows cuisine filter buttons', () => {
    render(<MemoryRouter><FoodPage /></MemoryRouter>)
    expect(screen.getByText(/Restaurants/i)).toBeInTheDocument()
  })
})
