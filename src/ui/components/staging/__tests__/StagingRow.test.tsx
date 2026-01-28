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
}

describe('StagingRow', () => {
  it('renders contact name', () => {
    render(<StagingRow contact={contact} onDelete={vi.fn()} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders contact company', () => {
    render(<StagingRow contact={contact} onDelete={vi.fn()} />)
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
  })

  it('renders contact email', () => {
    render(<StagingRow contact={contact} onDelete={vi.fn()} />)
    expect(screen.getByText('jane@acme.com')).toBeInTheDocument()
  })

  it('renders a delete button', () => {
    render(<StagingRow contact={contact} onDelete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('calls onDelete with contact id when delete is clicked', () => {
    const onDelete = vi.fn()
    render(<StagingRow contact={contact} onDelete={onDelete} />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith('c1')
  })
})
