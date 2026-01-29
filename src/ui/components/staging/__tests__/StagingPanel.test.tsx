import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StagingPanel } from '../StagingPanel'
import type { StagedContact } from '../types'

const contacts: StagedContact[] = [
  { id: 'c1', name: 'Jane Doe', company: 'Acme', email: 'jane@acme.com', position: 'Eng' },
  { id: 'c2', name: 'John Smith', company: 'Beta', email: 'john@beta.com', position: 'PM' },
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
  })

  it('shows header with query and count', () => {
    render(
      <StagingPanel contacts={contacts} query="engineers" onApprove={vi.fn()} onClear={vi.fn()} onDeleteRow={vi.fn()} />
    )
    expect(screen.getByText(/engineers/i)).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('calls onApprove with remaining contact IDs', () => {
    const onApprove = vi.fn()
    render(
      <StagingPanel contacts={contacts} query="test" onApprove={onApprove} onClear={vi.fn()} onDeleteRow={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: /approve/i }))
    expect(onApprove).toHaveBeenCalledWith(['c1', 'c2'])
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
