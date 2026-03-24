import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))

describe('SportsPage', () => {
  it('renders without crashing', async () => {
    const { default: SportsPage } = await import('../SportsPage')
    render(<SportsPage />)
    expect(screen.getByText('Sports')).toBeInTheDocument()
  })
})
