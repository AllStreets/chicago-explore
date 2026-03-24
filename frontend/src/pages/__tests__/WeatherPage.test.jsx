import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../hooks/useYelp', () => ({ default: () => ({ places: [], loading: false }) }))

describe('WeatherPage', () => {
  it('renders without crashing', async () => {
    const { default: WeatherPage } = await import('../WeatherPage')
    render(<WeatherPage />)
    expect(screen.getByText('Weather & Lake')).toBeInTheDocument()
  })
})
