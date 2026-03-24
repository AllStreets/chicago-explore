import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
describe('ExplorePage', () => {
  it('renders', async () => {
    const { default: P } = await import('../ExplorePage')
    render(<P />)
    expect(screen.getByText('Explore Chicago')).toBeInTheDocument()
  })
})
