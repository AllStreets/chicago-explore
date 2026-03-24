import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ favorites: [], visited: [], bucket: [] }) }))
const localStorageMock = { getItem: vi.fn(() => 'test_user_123'), setItem: vi.fn() }
Object.defineProperty(window, 'localStorage', { value: localStorageMock })
describe('MyChicagoPage', () => {
  it('renders', async () => {
    const { default: P } = await import('../MyChicagoPage')
    render(<P />)
    expect(screen.getByText('My Chicago')).toBeInTheDocument()
  })
})
