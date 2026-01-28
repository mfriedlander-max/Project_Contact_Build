import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ContactCard } from '../ContactCard'
import { ConnectionStage } from '@/lib/types/enums'
import type { Contact } from '@/lib/types/contact'

const contact: Contact = {
  id: 'c1',
  first_name: 'Jane',
  last_name: 'Doe',
  company: 'Acme Corp',
  email: 'jane@acme.com',
  email_confidence: 'HIGH',
}

describe('ContactCard', () => {
  it('renders full name', () => {
    render(<ContactCard contact={contact} stage={ConnectionStage.DRAFTED} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders company', () => {
    render(<ContactCard contact={contact} stage={ConnectionStage.DRAFTED} />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('renders email', () => {
    render(<ContactCard contact={contact} stage={ConnectionStage.DRAFTED} />)
    expect(screen.getByText('jane@acme.com')).toBeInTheDocument()
  })

  it('renders stage badge', () => {
    render(<ContactCard contact={contact} stage={ConnectionStage.CONNECTED} />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('renders email confidence indicator', () => {
    render(<ContactCard contact={contact} stage={ConnectionStage.DRAFTED} />)
    expect(screen.getByText(/high/i)).toBeInTheDocument()
  })

  it('handles missing first_name gracefully', () => {
    const noFirst: Contact = { ...contact, first_name: undefined }
    render(<ContactCard contact={noFirst} stage={ConnectionStage.DRAFTED} />)
    expect(screen.getByText('Doe')).toBeInTheDocument()
  })
})
