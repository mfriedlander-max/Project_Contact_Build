import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnSelector } from '../ColumnSelector'

const mockStorage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key] }),
})

const ALL_COLUMN_KEYS = [
  'name', 'company', 'email', 'connection_stage', 'email_status',
  'mobile_phone', 'social_linkedin', 'campaign', 'email_confidence',
  'personalized_insert',
]

const defaultProps = {
  visibleColumns: ALL_COLUMN_KEYS,
  onColumnsChange: vi.fn(),
}

describe('ColumnSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStorage).forEach((key) => { delete mockStorage[key] })
  })

  it('renders a "Columns" button', () => {
    render(<ColumnSelector {...defaultProps} />)
    expect(screen.getByRole('button', { name: /columns/i })).toBeInTheDocument()
  })

  it('clicking button shows dropdown with all column options', async () => {
    const user = userEvent.setup()
    render(<ColumnSelector {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /columns/i }))

    const labels = [
      'Name', 'Company', 'Email', 'Stage', 'Email Status',
      'Phone', 'LinkedIn', 'Campaign', 'Confidence', 'Insert Preview',
    ]
    for (const label of labels) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })

  it('fixed columns are checked and disabled', async () => {
    const user = userEvent.setup()
    render(<ColumnSelector {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /columns/i }))

    const fixedLabels = ['Name', 'Email', 'Stage']
    for (const label of fixedLabels) {
      const checkbox = screen.getByLabelText(label) as HTMLInputElement
      expect(checkbox.checked).toBe(true)
      expect(checkbox.disabled).toBe(true)
    }
  })

  it('toggling optional column calls onColumnsChange with updated list', async () => {
    const user = userEvent.setup()
    const visibleColumns = ['name', 'email', 'connection_stage']
    const onColumnsChange = vi.fn()

    render(<ColumnSelector visibleColumns={visibleColumns} onColumnsChange={onColumnsChange} />)

    await user.click(screen.getByRole('button', { name: /columns/i }))
    await user.click(screen.getByLabelText('Company'))

    expect(onColumnsChange).toHaveBeenCalledWith([...visibleColumns, 'company'])
  })

  it('unchecking optional column removes it from the list', async () => {
    const user = userEvent.setup()
    const visibleColumns = ['name', 'company', 'email', 'connection_stage']
    const onColumnsChange = vi.fn()

    render(<ColumnSelector visibleColumns={visibleColumns} onColumnsChange={onColumnsChange} />)

    await user.click(screen.getByRole('button', { name: /columns/i }))
    await user.click(screen.getByLabelText('Company'))

    expect(onColumnsChange).toHaveBeenCalledWith(['name', 'email', 'connection_stage'])
  })

  it('clicking outside closes dropdown', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <span data-testid="outside">outside</span>
        <ColumnSelector {...defaultProps} />
      </div>
    )

    await user.click(screen.getByRole('button', { name: /columns/i }))
    expect(screen.getByLabelText('Name')).toBeInTheDocument()

    await user.click(screen.getByTestId('outside'))
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })

  it('persists selection to localStorage on change', async () => {
    const user = userEvent.setup()
    const visibleColumns = ['name', 'email', 'connection_stage']
    const onColumnsChange = vi.fn()

    render(<ColumnSelector visibleColumns={visibleColumns} onColumnsChange={onColumnsChange} />)

    await user.click(screen.getByRole('button', { name: /columns/i }))
    await user.click(screen.getByLabelText('Company'))

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'sheets-visible-columns',
      JSON.stringify([...visibleColumns, 'company'])
    )
  })
})
