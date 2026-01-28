import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AutomationSection } from '../AutomationSection'

describe('AutomationSection', () => {
  it('renders automation section heading', () => {
    render(<AutomationSection />)

    expect(screen.getByRole('heading', { name: /automation/i })).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<AutomationSection />)

    expect(screen.getByText(/automate your workflows/i)).toBeInTheDocument()
  })

  it('renders automation toggle options', () => {
    render(<AutomationSection />)

    expect(screen.getByText(/auto-send drafts/i)).toBeInTheDocument()
    expect(screen.getByText(/follow-up reminders/i)).toBeInTheDocument()
  })

  it('renders toggle switches', () => {
    render(<AutomationSection />)

    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThanOrEqual(2)
  })

  it('has correct section structure', () => {
    render(<AutomationSection />)

    const section = screen.getByRole('region', { name: /automation/i })
    expect(section).toBeInTheDocument()
  })
})
