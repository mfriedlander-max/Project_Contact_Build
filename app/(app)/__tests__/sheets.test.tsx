import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/src/ui/hooks/useContacts', () => ({
  useContacts: vi.fn(() => ({
    contacts: [],
    total: 0,
    page: 1,
    totalPages: 0,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    updateContactStage: vi.fn(),
  })),
}))

vi.mock('@/src/ui/hooks/useSavedViews', () => ({
  useSavedViews: vi.fn(() => ({
    savedViews: [],
    isLoading: false,
    error: null,
    createView: vi.fn(),
    updateView: vi.fn(),
    deleteView: vi.fn(),
    refetch: vi.fn(),
  })),
}))

vi.mock('@/src/ui/components/contacts/ContactGrid', () => ({
  ContactGrid: ({ isLoading }: { isLoading: boolean }) =>
    isLoading ? <div>Loading contacts...</div> : <div data-testid="contact-grid">Grid</div>,
}))

vi.mock('@/src/ui/components/contacts/ColumnSelector', () => ({
  ColumnSelector: () => <div data-testid="column-selector">Columns</div>,
}))

vi.mock('@/src/ui/components/contacts/SavedViewSelector', () => ({
  SavedViewSelector: () => <div data-testid="saved-view-selector">Views</div>,
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
      total: 0,
      page: 1,
      totalPages: 0,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      updateContactStage: vi.fn(),
    } as ReturnType<typeof useContacts>)

    render(<SheetsPage />)
    expect(screen.getByText(/loading contacts/i)).toBeInTheDocument()
  })
})
