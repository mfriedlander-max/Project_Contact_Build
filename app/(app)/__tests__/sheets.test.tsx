import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SheetsPage from '../sheets/page'

describe('SheetsPage', () => {
  it('renders sheets page with heading', () => {
    render(<SheetsPage />)

    expect(screen.getByRole('heading', { name: /sheets/i })).toBeInTheDocument()
  })

  it('renders contact sheets coming soon message', () => {
    render(<SheetsPage />)

    expect(screen.getByText(/contact sheets coming soon/i)).toBeInTheDocument()
  })

  it('centers content', () => {
    render(<SheetsPage />)

    const container = screen.getByRole('heading', { name: /sheets/i }).closest('div')
    expect(container).toHaveClass('text-center')
  })
})
