import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePage from '../home/page'

describe('HomePage', () => {
  it('renders home page with heading', () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { name: /home/i })).toBeInTheDocument()
  })

  it('renders dashboard coming soon message', () => {
    render(<HomePage />)

    expect(screen.getByText(/dashboard coming soon/i)).toBeInTheDocument()
  })

  it('centers content', () => {
    render(<HomePage />)

    const container = screen.getByRole('heading', { name: /home/i }).closest('div')
    expect(container).toHaveClass('text-center')
  })
})
