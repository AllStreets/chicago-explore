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
vi.mock('../../hooks/useYelp', () => ({ default: () => ({ places: [], loading: false }) }))

describe('NightlifePage', () => {
  it('renders without crashing', async () => {
    const { default: NightlifePage } = await import('../NightlifePage')
    render(<NightlifePage />)
    expect(screen.getByText('Nightlife')).toBeInTheDocument()
  })
})
