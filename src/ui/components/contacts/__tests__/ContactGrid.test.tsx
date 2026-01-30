import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactGrid } from '../ContactGrid'
import type { Contact } from '@/lib/types/contact'

const contacts: Contact[] = [
  {
    id: 'c1',
    first_name: 'Jane',
    last_name: 'Doe',
    company: 'Acme Corp',
    email: 'jane@acme.com',
    email_status: 'SENT',
    mobile_phone: '555-1234',
    social_linkedin: 'https://linkedin.com/in/janedoe',
    email_confidence: 'HIGH',
    personalized_insert: 'Met at conference',
    campaign: 'Q1 Outreach',
  },
  {
    id: 'c2',
    last_name: 'Smith',
    company: 'Globex',
    email: 'smith@globex.com',
    email_status: 'DRAFTED',
  },
]

const defaultProps = {
  contacts,
  visibleColumns: ['name', 'company', 'email', 'connection_stage', 'email_status'],
  onSort: vi.fn(),
  onStageChange: vi.fn(),
  isLoading: false,
}

describe('ContactGrid', () => {
  it('renders table headers for visible columns', () => {
    render(<ContactGrid {...defaultProps} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Stage')).toBeInTheDocument()
    expect(screen.getByText('Email Status')).toBeInTheDocument()
  })

  it('renders contact rows with correct data', () => {
    render(<ContactGrid {...defaultProps} />)
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('jane@acme.com')).toBeInTheDocument()
    expect(screen.getByText('Smith')).toBeInTheDocument()
    expect(screen.getByText('Globex')).toBeInTheDocument()
  })

  it('calls onSort when column header is clicked', async () => {
    const onSort = vi.fn()
    render(<ContactGrid {...defaultProps} onSort={onSort} />)
    await userEvent.click(screen.getByText('Name'))
    expect(onSort).toHaveBeenCalledWith('name')
  })

  it('shows sort indicator on sorted column (asc)', () => {
    render(<ContactGrid {...defaultProps} sortColumn="name" sortOrder="asc" />)
    const header = screen.getByText('Name').closest('th')
    expect(header?.textContent).toContain('▲')
  })

  it('shows sort indicator on sorted column (desc)', () => {
    render(<ContactGrid {...defaultProps} sortColumn="name" sortOrder="desc" />)
    const header = screen.getByText('Name').closest('th')
    expect(header?.textContent).toContain('▼')
  })

  it('shows loading state when isLoading is true', () => {
    render(<ContactGrid {...defaultProps} isLoading={true} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows empty state when contacts is empty', () => {
    render(<ContactGrid {...defaultProps} contacts={[]} />)
    expect(screen.getByText('No contacts found')).toBeInTheDocument()
  })

  it('only shows visible columns and hides non-visible optional ones', () => {
    render(<ContactGrid {...defaultProps} visibleColumns={['name', 'email']} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    // fixed columns always show: Stage is fixed
    expect(screen.getByText('Stage')).toBeInTheDocument()
    // non-fixed, non-visible should be hidden
    expect(screen.queryByText('Company')).not.toBeInTheDocument()
    expect(screen.queryByText('Phone')).not.toBeInTheDocument()
  })
})
