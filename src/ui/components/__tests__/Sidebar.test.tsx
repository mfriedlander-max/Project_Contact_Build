import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '../Sidebar'
import { AiMode } from '@/lib/types/enums'

describe('Sidebar', () => {
  it('renders sidebar with correct width (240px)', () => {
    render(<Sidebar currentMode={AiMode.CONTACT_FINDER} />)

    const sidebar = screen.getByRole('complementary')
    expect(sidebar).toHaveClass('w-60') // Tailwind w-60 = 240px
  })

  it('renders navigation links', () => {
    render(<Sidebar currentMode={AiMode.CONTACT_FINDER} />)

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sheets/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
  })

  it('displays current mode indicator', () => {
    render(<Sidebar currentMode={AiMode.CONTACT_FINDER} />)

    expect(screen.getByText(/contact finder/i)).toBeInTheDocument()
  })

  it('updates mode indicator when mode changes', () => {
    const { rerender } = render(<Sidebar currentMode={AiMode.CONTACT_FINDER} />)

    expect(screen.getByText(/contact finder/i)).toBeInTheDocument()

    rerender(<Sidebar currentMode={AiMode.ASSISTANT} />)

    expect(screen.getByText(/assistant/i)).toBeInTheDocument()
  })

  it('has navigation element with accessible name', () => {
    render(<Sidebar currentMode={AiMode.CONTACT_FINDER} />)

    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('renders app logo or title', () => {
    render(<Sidebar currentMode={AiMode.CONTACT_FINDER} />)

    // Check for the main heading specifically
    expect(screen.getByRole('heading', { name: /contact crm/i })).toBeInTheDocument()
  })
})
