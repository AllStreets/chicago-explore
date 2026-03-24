// frontend/src/components/__tests__/Sidebar.test.jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect } from 'vitest'
import Sidebar from '../Sidebar'

describe('Sidebar', () => {
  const renderSidebar = () =>
    render(<MemoryRouter><Sidebar /></MemoryRouter>)

  it('renders all 10 nav items', () => {
    renderSidebar()
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(10)
  })

  it('links to the correct routes', () => {
    renderSidebar()
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /transit/i })).toHaveAttribute('href', '/transit')
    expect(screen.getByRole('link', { name: /food/i })).toHaveAttribute('href', '/food')
  })
})
