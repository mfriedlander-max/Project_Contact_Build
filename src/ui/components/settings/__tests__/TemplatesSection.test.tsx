import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TemplatesSection } from '../TemplatesSection'

describe('TemplatesSection', () => {
  it('renders templates section heading', () => {
    render(<TemplatesSection />)

    expect(screen.getByRole('heading', { name: /templates/i })).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<TemplatesSection />)

    expect(screen.getByText(/email templates/i)).toBeInTheDocument()
  })

  it('renders create template button', () => {
    render(<TemplatesSection />)

    expect(screen.getByRole('button', { name: /create template|new template/i })).toBeInTheDocument()
  })

  it('renders empty state when no templates', () => {
    render(<TemplatesSection />)

    expect(screen.getByText(/no templates yet/i)).toBeInTheDocument()
  })

  it('has correct section structure', () => {
    render(<TemplatesSection />)

    const section = screen.getByRole('region', { name: /templates/i })
    expect(section).toBeInTheDocument()
  })
})
