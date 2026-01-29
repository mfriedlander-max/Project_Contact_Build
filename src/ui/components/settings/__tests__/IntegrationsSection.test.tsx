import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IntegrationsSection } from '../IntegrationsSection'

describe('IntegrationsSection', () => {
  it('renders integrations section heading', () => {
    render(<IntegrationsSection />)

    expect(screen.getByRole('heading', { name: /integrations/i })).toBeInTheDocument()
  })

  it('renders Gmail integration card', () => {
    render(<IntegrationsSection />)

    expect(screen.getByRole('heading', { name: /gmail/i })).toBeInTheDocument()
    expect(screen.getByText(/connect your gmail account/i)).toBeInTheDocument()
  })

  it('renders Hunter integration card', () => {
    render(<IntegrationsSection />)

    expect(screen.getByText(/hunter/i)).toBeInTheDocument()
    expect(screen.getByText(/email finding/i)).toBeInTheDocument()
  })

  it('renders Search API integration card', () => {
    render(<IntegrationsSection />)

    expect(screen.getByRole('heading', { name: /search api/i })).toBeInTheDocument()
  })

  it('shows connection status for each integration', () => {
    render(<IntegrationsSection />)

    const connectButtons = screen.getAllByRole('button', { name: /connect|configure/i })
    expect(connectButtons.length).toBeGreaterThanOrEqual(3)
  })

  it('has correct section structure with cards', () => {
    render(<IntegrationsSection />)

    const section = screen.getByRole('region', { name: /integrations/i })
    expect(section).toBeInTheDocument()
  })
})
