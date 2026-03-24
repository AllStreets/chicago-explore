import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))

describe('EventsPage', () => {
  it('renders without crashing', async () => {
    const { default: EventsPage } = await import('../EventsPage')
    render(<EventsPage />)
    expect(screen.getByText('Events')).toBeInTheDocument()
  })
})
