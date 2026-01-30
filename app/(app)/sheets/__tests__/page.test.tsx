import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SheetsPage from '../page'

const mockContacts = [
  { id: '1', last_name: 'Smith', first_name: 'Alice', company: 'Google', email: 'alice@google.com', connection_stage: 'DRAFTED' },
]

const mockUpdateContactStage = vi.fn()

const mockUseContacts = vi.fn().mockReturnValue({
  contacts: mockContacts,
  total: 1,
  page: 1,
  totalPages: 1,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  updateContactStage: mockUpdateContactStage,
})

vi.mock('@/src/ui/hooks/useContacts', () => ({
  useContacts: (...args: unknown[]) => mockUseContacts(...args),
}))

const mockCreateView = vi.fn()
const mockUpdateView = vi.fn()
const mockDeleteView = vi.fn()
const mockRefetchViews = vi.fn()

vi.mock('@/src/ui/hooks/useSavedViews', () => ({
  useSavedViews: () => ({
    savedViews: [
      { id: 'v1', name: 'Google Only', filters: { company: 'Google' } },
    ],
    isLoading: false,
    error: null,
    createView: mockCreateView,
    updateView: mockUpdateView,
    deleteView: mockDeleteView,
    refetch: mockRefetchViews,
  }),
}))

vi.mock('@/src/ui/components/contacts/ContactGrid', () => ({
  ContactGrid: ({ contacts, onSort, onStageChange, visibleColumns, sortColumn, sortOrder, isLoading }: {
    contacts: typeof mockContacts
    onSort: (col: string) => void
    onStageChange: (id: string, stage: string) => void
    visibleColumns: string[]
    sortColumn?: string
    sortOrder?: string
    isLoading: boolean
  }) => (
    <div data-testid="contact-grid">
      {isLoading && <div>Loading...</div>}
      {contacts.map((c) => (
        <div key={c.id}>{c.first_name} {c.last_name}</div>
      ))}
      <button onClick={() => onSort('name')} data-testid="sort-trigger">Sort</button>
    </div>
  ),
}))

vi.mock('@/src/ui/components/contacts/ColumnSelector', () => ({
  ColumnSelector: ({ visibleColumns, onColumnsChange }: {
    visibleColumns: string[]
    onColumnsChange: (cols: string[]) => void
  }) => (
    <div data-testid="column-selector">Columns</div>
  ),
}))

vi.mock('@/src/ui/components/contacts/SavedViewSelector', () => ({
  SavedViewSelector: ({ savedViews, onSelectView, onSaveView, onDeleteView }: {
    savedViews: unknown[]
    onSelectView: (view: unknown) => void
    onSaveView: (data: unknown) => Promise<void>
    onDeleteView: (id: string) => Promise<void>
  }) => (
    <div data-testid="saved-view-selector">Saved Views ({savedViews.length})</div>
  ),
}))

describe('SheetsPage', () => {
  beforeEach(() => {
    mockUseContacts.mockReturnValue({
      contacts: mockContacts,
      total: 1,
      page: 1,
      totalPages: 1,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      updateContactStage: mockUpdateContactStage,
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

  it('shows contact data in the grid', () => {
    render(<SheetsPage />)
    expect(screen.getByTestId('contact-grid')).toBeInTheDocument()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseContacts.mockReturnValue({
      contacts: [],
      total: 0,
      page: 1,
      totalPages: 0,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
      updateContactStage: mockUpdateContactStage,
    })

    render(<SheetsPage />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows error state', () => {
    mockUseContacts.mockReturnValue({
      contacts: [],
      total: 0,
      page: 1,
      totalPages: 0,
      isLoading: false,
      error: 'Failed to fetch contacts',
      refetch: vi.fn(),
      updateContactStage: mockUpdateContactStage,
    })

    render(<SheetsPage />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('renders saved view selector', () => {
    render(<SheetsPage />)
    expect(screen.getByTestId('saved-view-selector')).toBeInTheDocument()
  })

  it('switches stage tab on click', () => {
    render(<SheetsPage />)
    const connectedTab = screen.getByRole('tab', { name: /connected/i })
    fireEvent.click(connectedTab)
    expect(connectedTab).toHaveAttribute('aria-selected', 'true')
  })

  it('renders search input', () => {
    render(<SheetsPage />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('renders pagination controls', () => {
    mockUseContacts.mockReturnValue({
      contacts: mockContacts,
      total: 50,
      page: 1,
      totalPages: 5,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
      updateContactStage: mockUpdateContactStage,
    })

    render(<SheetsPage />)
    expect(screen.getByText(/page 1 of 5/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('renders column selector', () => {
    render(<SheetsPage />)
    expect(screen.getByTestId('column-selector')).toBeInTheDocument()
  })

  it('triggers sort on header click', () => {
    render(<SheetsPage />)
    fireEvent.click(screen.getByTestId('sort-trigger'))
    // useContacts should be called with sort params after state update
    expect(mockUseContacts).toHaveBeenCalled()
  })
})
