import { render, screen, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const MOCK_HOODS = [
  { id: 'wicker-park', name: 'Wicker Park', tagline: 'Indie soul', vibe: ['artsy'] },
  { id: 'lincoln-park', name: 'Lincoln Park', tagline: 'Green space', vibe: ['family'] },
]

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(MOCK_HOODS) })
  )
  delete window.location
  window.location = { ...window.location, hash: '' }
})

describe('NeighborhoodsPage', () => {
  it('renders', async () => {
    const { default: P } = await import('../NeighborhoodsPage')
    await act(async () => { render(<P />) })
    expect(screen.getByText('Neighborhoods')).toBeInTheDocument()
  })

  it('renders neighborhood cards after load', async () => {
    const { default: P } = await import('../NeighborhoodsPage')
    await act(async () => { render(<P />) })
    await waitFor(() => expect(screen.getByText('Wicker Park')).toBeInTheDocument())
    expect(document.getElementById('wicker-park')).toBeTruthy()
  })

  it('cards have id attributes matching neighborhood ids', async () => {
    const { default: P } = await import('../NeighborhoodsPage')
    await act(async () => { render(<P />) })
    await waitFor(() => expect(screen.getByText('Lincoln Park')).toBeInTheDocument())
    expect(document.getElementById('lincoln-park')).toBeTruthy()
  })
})
