import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '../login/page'

describe('LoginPage', () => {
  it('renders login page with heading', () => {
    render(<LoginPage />)

    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument()
  })

  it('renders authentication coming soon message', () => {
    render(<LoginPage />)

    expect(screen.getByText(/authentication coming soon/i)).toBeInTheDocument()
  })

  it('centers content on screen', () => {
    render(<LoginPage />)

    const container = screen.getByRole('heading', { name: /login/i }).closest('div')
    expect(container).toHaveClass('text-center')
  })
})
