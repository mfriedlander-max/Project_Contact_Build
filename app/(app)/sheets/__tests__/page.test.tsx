import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SheetsPage from '../page'

const mockContacts = [
  { id: '1', last_name: 'Smith', first_name: 'Alice', company: 'Google' },
]

const mockUseContacts = vi.fn().mockReturnValue({
  contacts: mockContacts,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
})

vi.mock('@/src/ui/hooks/useContacts', () => ({
  useContacts: (...args: unknown[]) => mockUseContacts(...args),
}))

vi.mock('@/src/ui/hooks/useSavedViews', () => ({
  useSavedViews: () => ({
    savedViews: [
      { id: 'v1', name: 'Google Only', filters: { company: 'Google' } },
    ],
    isLoading: false,
    error: null,
  }),
}))

describe('SheetsPage', () => {
  beforeEach(() => {
    mockUseContacts.mockReturnValue({
      contacts: mockContacts,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page title', () => {
    render(<SheetsPage />)
    expect(screen.getByText('Sheets')).toBeInTheDocument()
  })

  it('renders all stage tabs', () => {
    render(<SheetsPage />)
    expect(screen.getByRole('tab', { name: /drafted/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /message sent/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /didn't connect/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /connected/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /in touch/i })).toBeInTheDocument()
  })

  it('defaults to Drafted tab being selected', () => {
    render(<SheetsPage />)
    const draftedTab = screen.getByRole('tab', { name: /drafted/i })
    expect(draftedTab).toHaveAttribute('aria-selected', 'true')
  })

  it('shows contact data', () => {
    render(<SheetsPage />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseContacts.mockReturnValue({
      contacts: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    })

    render(<SheetsPage />)
    expect(screen.getByText(/loading contacts/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockUseContacts.mockReturnValue({
      contacts: [],
      isLoading: false,
      error: 'Failed to fetch contacts',
      refetch: vi.fn(),
    })

    render(<SheetsPage />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders saved views dropdown', () => {
    render(<SheetsPage />)
    expect(screen.getByRole('combobox', { name: /saved views/i })).toBeInTheDocument()
  })

  it('switches stage tab on click', () => {
    render(<SheetsPage />)
    const connectedTab = screen.getByRole('tab', { name: /connected/i })
    fireEvent.click(connectedTab)
    expect(connectedTab).toHaveAttribute('aria-selected', 'true')
  })
})
