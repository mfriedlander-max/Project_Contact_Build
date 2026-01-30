import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadPreview } from '../UploadPreview'
import type { ContactCreateInput, ValidationError } from '@/src/server/services/uploadParser'

function makeContact(overrides: Partial<ContactCreateInput> = {}): ContactCreateInput {
  return {
    last_name: 'Smith',
    first_name: 'Alice',
    email: 'alice@example.com',
    company: 'Acme',
    position: 'Engineer',
    connection_stage: 'DRAFTED',
    v: 0,
    ...overrides,
  }
}

const defaultProps = {
  contacts: [
    makeContact(),
    makeContact({ last_name: 'Jones', first_name: 'Bob', email: 'bob@co.com' }),
    makeContact({ last_name: 'Wu', first_name: 'Carol', email: 'carol@co.com' }),
  ],
  errors: [] as ValidationError[],
  onImport: vi.fn(),
  onBack: vi.fn(),
}

describe('UploadPreview', () => {
  it('renders a preview table with contact rows', () => {
    render(<UploadPreview {...defaultProps} />)

    expect(screen.getByText('Smith')).toBeInTheDocument()
    expect(screen.getByText('Jones')).toBeInTheDocument()
    expect(screen.getByText('Wu')).toBeInTheDocument()
  })

  it('shows column headers for contact fields', () => {
    render(<UploadPreview {...defaultProps} />)

    expect(screen.getByText('Last Name')).toBeInTheDocument()
    expect(screen.getByText('First Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('limits preview to first 10 rows', () => {
    const contacts = Array.from({ length: 15 }, (_, i) =>
      makeContact({ last_name: `Contact${i}` })
    )
    render(<UploadPreview {...defaultProps} contacts={contacts} />)

    expect(screen.getByText('Contact0')).toBeInTheDocument()
    expect(screen.getByText('Contact9')).toBeInTheDocument()
    expect(screen.queryByText('Contact10')).not.toBeInTheDocument()
  })

  it('shows summary with contact and error counts', () => {
    const errors: ValidationError[] = [
      { row: 1, message: 'Row 1: last_name is required' },
    ]
    render(<UploadPreview {...defaultProps} errors={errors} />)

    expect(screen.getByText(/3 contacts ready to import/)).toBeInTheDocument()
    expect(screen.getByText(/1 error/)).toBeInTheDocument()
  })

  it('shows plural errors in summary', () => {
    const errors: ValidationError[] = [
      { row: 1, message: 'Row 1: last_name is required' },
      { row: 2, message: 'Row 2: invalid email format' },
    ]
    render(<UploadPreview {...defaultProps} errors={errors} />)

    expect(screen.getByText(/2 errors/)).toBeInTheDocument()
  })

  it('displays validation error messages', () => {
    const errors: ValidationError[] = [
      { row: 1, message: 'Row 1: last_name is required' },
      { row: 2, message: 'Row 2: invalid email format' },
    ]
    render(<UploadPreview {...defaultProps} errors={errors} />)

    expect(screen.getByText('Row 1: last_name is required')).toBeInTheDocument()
    expect(screen.getByText('Row 2: invalid email format')).toBeInTheDocument()
  })

  it('enables Import button when there are valid contacts', () => {
    render(<UploadPreview {...defaultProps} />)

    const importBtn = screen.getByRole('button', { name: /import/i })
    expect(importBtn).toBeEnabled()
  })

  it('disables Import button when there are zero contacts', () => {
    render(<UploadPreview {...defaultProps} contacts={[]} />)

    const importBtn = screen.getByRole('button', { name: /import/i })
    expect(importBtn).toBeDisabled()
  })

  it('disables Import button and shows spinner when isImporting is true', () => {
    render(<UploadPreview {...defaultProps} isImporting />)

    const importBtn = screen.getByRole('button', { name: /importing/i })
    expect(importBtn).toBeDisabled()
  })

  it('calls onImport when Import button is clicked', async () => {
    const user = userEvent.setup()
    const onImport = vi.fn()
    render(<UploadPreview {...defaultProps} onImport={onImport} />)

    await user.click(screen.getByRole('button', { name: /import/i }))
    expect(onImport).toHaveBeenCalledOnce()
  })

  it('calls onBack when Back button is clicked', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    render(<UploadPreview {...defaultProps} onBack={onBack} />)

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('renders Back button', () => {
    render(<UploadPreview {...defaultProps} />)

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })
})
