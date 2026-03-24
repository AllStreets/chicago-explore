import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import IntelFeed from '../IntelFeed'

const mockWeather = { temp: 18, description: 'partly cloudy', wind: { speed: 4.2 } }
const mockLake = { niceLabel: 'Great day', niceScore: 78, tempC: 16 }
const mockTrains = [
  { rn: '101', line: 'Red', nextStation: 'Grand', arrTime: '20260323 14:02:00' }
]

describe('IntelFeed', () => {
  it('renders weather temp', () => {
    render(<IntelFeed weather={mockWeather} lake={mockLake} trains={mockTrains} />)
    expect(screen.getByText(/18/)).toBeInTheDocument()
  })

  it('renders lake niceness label', () => {
    render(<IntelFeed weather={mockWeather} lake={mockLake} trains={mockTrains} />)
    expect(screen.getByText(/Great day/i)).toBeInTheDocument()
  })

  it('renders train arrivals', () => {
    render(<IntelFeed weather={mockWeather} lake={mockLake} trains={mockTrains} />)
    expect(screen.getByText(/Red/i)).toBeInTheDocument()
    expect(screen.getByText(/Grand/i)).toBeInTheDocument()
  })
})
