import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SavedViewSelector } from '../SavedViewSelector'
import type { SavedView } from '../SavedViewSelector'

const mockViews: SavedView[] = [
  { id: '1', name: 'Hot Leads', filters: { stage: 'lead' }, isDefault: true },
  { id: '2', name: 'All Contacts', filters: {}, columns: ['name', 'email'] },
]

const defaultProps = {
  savedViews: mockViews,
  onSelectView: vi.fn(),
  onSaveView: vi.fn().mockResolvedValue(undefined),
  onDeleteView: vi.fn().mockResolvedValue(undefined),
}

describe('SavedViewSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('renders saved views in dropdown', () => {
    render(<SavedViewSelector {...defaultProps} />)
    expect(screen.getByText('Hot Leads')).toBeInTheDocument()
    expect(screen.getByText('All Contacts')).toBeInTheDocument()
  })

  it('selecting a view calls onSelectView', async () => {
    const user = userEvent.setup()
    render(<SavedViewSelector {...defaultProps} />)

    await user.click(screen.getByText('Hot Leads'))
    expect(defaultProps.onSelectView).toHaveBeenCalledWith(mockViews[0])
  })

  it('"Save Current View" button triggers prompt and calls onSaveView', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'prompt').mockReturnValue('My View')
    render(<SavedViewSelector {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /save current view/i }))
    expect(window.prompt).toHaveBeenCalled()
    expect(defaultProps.onSaveView).toHaveBeenCalledWith({
      name: 'My View',
      filters: {},
      sort: undefined,
      columns: undefined,
    })
  })

  it('cancelled prompt does NOT call onSaveView', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'prompt').mockReturnValue(null)
    render(<SavedViewSelector {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /save current view/i }))
    expect(defaultProps.onSaveView).not.toHaveBeenCalled()
  })

  it('delete button shows confirm and calls onDeleteView', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SavedViewSelector {...defaultProps} />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])
    expect(window.confirm).toHaveBeenCalled()
    expect(defaultProps.onDeleteView).toHaveBeenCalledWith('1')
  })

  it('cancelled delete does NOT call onDeleteView', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<SavedViewSelector {...defaultProps} />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])
    expect(defaultProps.onDeleteView).not.toHaveBeenCalled()
  })

  it('shows "No saved views" when empty', () => {
    render(<SavedViewSelector {...defaultProps} savedViews={[]} />)
    expect(screen.getByText(/no saved views/i)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<SavedViewSelector {...defaultProps} isLoading />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
