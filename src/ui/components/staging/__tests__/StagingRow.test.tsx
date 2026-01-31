import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StagingRow } from '../StagingRow'
import type { StagedContact } from '../types'

const contact: StagedContact = {
  id: 'c1',
  name: 'Jane Doe',
  company: 'Acme Corp',
  email: 'jane@acme.com',
  position: 'Engineer',
  summary: 'Builds scalable systems',
}

describe('StagingRow', () => {
  it('renders contact name', () => {
    render(<StagingRow contact={contact} onDelete={vi.fn()} selected={false} onToggle={vi.fn()} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders contact company', () => {
    render(<StagingRow contact={contact} onDelete={vi.fn()} selected={false} onToggle={vi.fn()} />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('renders contact position', () => {
    render(<StagingRow contact={contact} onDelete={vi.fn()} selected={false} onToggle={vi.fn()} />)
    expect(screen.getByText('Engineer')).toBeInTheDocument()
  })

  it('renders contact summary', () => {
    render(<StagingRow contact={contact} onDelete={vi.fn()} selected={false} onToggle={vi.fn()} />)
    expect(screen.getByText('Builds scalable systems')).toBeInTheDocument()
  })

  it('does not show email (minimal fields only)', () => {
    render(<StagingRow contact={contact} onDelete={vi.fn()} selected={false} onToggle={vi.fn()} />)
    expect(screen.queryByText('jane@acme.com')).not.toBeInTheDocument()
  })

  it('renders a checkbox for selection', () => {
    render(<StagingRow contact={contact} onDelete={vi.fn()} selected={false} onToggle={vi.fn()} />)
    const checkbox = screen.getByRole('checkbox', { name: /select jane doe/i })
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it('shows checkbox as checked when selected', () => {
    render(<StagingRow contact={contact} onDelete={vi.fn()} selected={true} onToggle={vi.fn()} />)
    const checkbox = screen.getByRole('checkbox', { name: /select jane doe/i })
    expect(checkbox).toBeChecked()
  })

  it('calls onToggle with contact id when checkbox is clicked', () => {
    const onToggle = vi.fn()
    render(<StagingRow contact={contact} onDelete={vi.fn()} selected={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /select jane doe/i }))
    expect(onToggle).toHaveBeenCalledWith('c1')
  })

  it('renders a delete button', () => {
    render(<StagingRow contact={contact} onDelete={vi.fn()} selected={false} onToggle={vi.fn()} />)
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('calls onDelete with contact id when delete is clicked', () => {
    const onDelete = vi.fn()
    render(<StagingRow contact={contact} onDelete={onDelete} selected={false} onToggle={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith('c1')
  })
})
