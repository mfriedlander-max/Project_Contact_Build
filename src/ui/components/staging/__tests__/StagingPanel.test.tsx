import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StagingPanel } from '../StagingPanel'
import type { StagedContact } from '../types'

const contacts: StagedContact[] = [
  { id: 'c1', name: 'Jane Doe', company: 'Acme', email: 'jane@acme.com', position: 'Eng', summary: 'Backend expert' },
  { id: 'c2', name: 'John Smith', company: 'Beta', email: 'john@beta.com', position: 'PM', summary: 'Product leader' },
  { id: 'c3', name: 'Alice Chen', company: 'Gamma', email: 'alice@gamma.com', position: 'Designer', summary: 'UX specialist' },
]

describe('StagingPanel', () => {
  it('renders nothing when contacts array is empty', () => {
    const { container } = render(
      <StagingPanel contacts={[]} query="" onApprove={vi.fn()} onClear={vi.fn()} onDeleteRow={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders when there are staged contacts', () => {
    render(
      <StagingPanel contacts={contacts} query="engineers" onApprove={vi.fn()} onClear={vi.fn()} onDeleteRow={vi.fn()} />
    )
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Alice Chen')).toBeInTheDocument()
  })

  it('shows header with query and count', () => {
    render(
      <StagingPanel contacts={contacts} query="engineers" onApprove={vi.fn()} onClear={vi.fn()} onDeleteRow={vi.fn()} />
    )
    expect(screen.getByText(/engineers/i)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('has "Create Campaign" button disabled when nothing is selected', () => {
    render(
      <StagingPanel contacts={contacts} query="test" onApprove={vi.fn()} onClear={vi.fn()} onDeleteRow={vi.fn()} />
    )
    const button = screen.getByRole('button', { name: /create campaign/i })
    expect(button).toBeDisabled()
  })

  it('enables "Create Campaign" button when at least one contact is selected', () => {
    render(
      <StagingPanel contacts={contacts} query="test" onApprove={vi.fn()} onClear={vi.fn()} onDeleteRow={vi.fn()} />
    )
    const checkboxes = screen.getAllByRole('checkbox')
    // First checkbox is "Select All", second is first contact
    fireEvent.click(checkboxes[1])

    const button = screen.getByRole('button', { name: /create campaign/i })
    expect(button).not.toBeDisabled()
  })

  it('calls onApprove with only selected contact IDs', () => {
    const onApprove = vi.fn()
    render(
      <StagingPanel contacts={contacts} query="test" onApprove={onApprove} onClear={vi.fn()} onDeleteRow={vi.fn()} />
    )

    // Select first and third contacts
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1]) // Jane
    fireEvent.click(checkboxes[3]) // Alice

    fireEvent.click(screen.getByRole('button', { name: /create campaign/i }))
    expect(onApprove).toHaveBeenCalledWith(['c1', 'c3'])
  })

  it('selects all contacts when "Select All" is clicked', () => {
    render(
      <StagingPanel contacts={contacts} query="test" onApprove={vi.fn()} onClear={vi.fn()} onDeleteRow={vi.fn()} />
    )

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i })
    fireEvent.click(selectAllCheckbox)

    // All individual checkboxes should be checked
    const checkboxes = screen.getAllByRole('checkbox')
    checkboxes.slice(1).forEach(checkbox => {
      expect(checkbox).toBeChecked()
    })

    // Selected count should show 3
    expect(screen.getByText('3 selected')).toBeInTheDocument()
  })

  it('deselects all contacts when "Select All" is clicked again', () => {
    render(
      <StagingPanel contacts={contacts} query="test" onApprove={vi.fn()} onClear={vi.fn()} onDeleteRow={vi.fn()} />
    )

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i })

    // Select all
    fireEvent.click(selectAllCheckbox)
    expect(screen.getByText('3 selected')).toBeInTheDocument()

    // Deselect all
    fireEvent.click(selectAllCheckbox)
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument()
  })

  it('individual checkbox toggles selection correctly', () => {
    render(
      <StagingPanel contacts={contacts} query="test" onApprove={vi.fn()} onClear={vi.fn()} onDeleteRow={vi.fn()} />
    )

    const janeCheckbox = screen.getByRole('checkbox', { name: /select jane doe/i })

    expect(janeCheckbox).not.toBeChecked()
    fireEvent.click(janeCheckbox)
    expect(janeCheckbox).toBeChecked()
    fireEvent.click(janeCheckbox)
    expect(janeCheckbox).not.toBeChecked()
  })

  it('clears selection after approval', () => {
    const onApprove = vi.fn()
    render(
      <StagingPanel contacts={contacts} query="test" onApprove={onApprove} onClear={vi.fn()} onDeleteRow={vi.fn()} />
    )

    // Select first contact
    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])
    expect(screen.getByText('1 selected')).toBeInTheDocument()

    // Approve
    fireEvent.click(screen.getByRole('button', { name: /create campaign/i }))

    // Selection should be cleared
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument()
  })

  it('calls onDeleteRow when a row delete button is clicked', () => {
    const onDeleteRow = vi.fn()
    render(
      <StagingPanel contacts={contacts} query="test" onApprove={vi.fn()} onClear={vi.fn()} onDeleteRow={onDeleteRow} />
    )
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])
    expect(onDeleteRow).toHaveBeenCalledWith('c1')
  })
})
