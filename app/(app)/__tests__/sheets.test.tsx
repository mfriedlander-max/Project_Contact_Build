import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/src/ui/hooks/useContacts', () => ({
  useContacts: vi.fn(() => ({ contacts: [], isLoading: false, error: null }))
}))

vi.mock('@/src/ui/hooks/useSavedViews', () => ({
  useSavedViews: vi.fn(() => ({ savedViews: [] }))
}))

vi.mock('@/src/ui/components/contacts/ContactList', () => ({
  default: ({ items }: { items: unknown[] }) => (
    <div data-testid="contact-list">{items.length} contacts</div>
  ),
  ContactList: ({ items }: { items: unknown[] }) => (
    <div data-testid="contact-list">{items.length} contacts</div>
  )
}))

import SheetsPage from '../sheets/page'
import { useContacts } from '@/src/ui/hooks/useContacts'

describe('SheetsPage', () => {
  it('renders sheets page with heading', () => {
    render(<SheetsPage />)

    expect(screen.getByRole('heading', { name: /sheets/i })).toBeInTheDocument()
  })

  it('renders stage tabs', () => {
    render(<SheetsPage />)

    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /drafted/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /message sent/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /didn't connect/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /connected/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /in touch/i })).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useContacts).mockReturnValue({
      contacts: [],
      isLoading: true,
      error: null
    } as ReturnType<typeof useContacts>)

    render(<SheetsPage />)

    expect(screen.getByText(/loading contacts/i)).toBeInTheDocument()
  })
})
