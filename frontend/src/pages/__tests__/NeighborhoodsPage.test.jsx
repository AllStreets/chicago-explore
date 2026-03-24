import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
describe('NeighborhoodsPage', () => {
  it('renders', async () => {
    const { default: P } = await import('../NeighborhoodsPage')
    render(<P />)
    expect(screen.getByText('Neighborhoods')).toBeInTheDocument()
  })
})
