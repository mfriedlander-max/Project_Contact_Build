import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnMapper } from '../ColumnMapper'

const headers = ['Name', 'Email Address', 'Company', 'Notes']

const sampleRows = [
  { Name: 'Alice Smith', 'Email Address': 'alice@co.com', Company: 'Acme', Notes: 'Met at conf' },
  { Name: 'Bob Jones', 'Email Address': 'bob@co.com', Company: 'Beta', Notes: 'Referral' },
  { Name: 'Carol Wu', 'Email Address': 'carol@co.com', Company: 'Gamma', Notes: '' },
]

describe('ColumnMapper', () => {
  it('renders all source column headers', () => {
    const onChange = vi.fn()
    render(<ColumnMapper headers={headers} sampleRows={sampleRows} onMappingChange={onChange} />)

    for (const header of headers) {
      expect(screen.getAllByText(header).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('auto-detects common mappings on mount', () => {
    const onChange = vi.fn()
    render(<ColumnMapper headers={headers} sampleRows={sampleRows} onMappingChange={onChange} />)

    // Should have been called with auto-detected mapping
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        Name: 'last_name',
        'Email Address': 'email',
        Company: 'company',
      })
    )
  })

  it('auto-detects first_name and last_name separately', () => {
    const onChange = vi.fn()
    render(
      <ColumnMapper
        headers={['First Name', 'Last Name', 'Email']}
        sampleRows={[{ 'First Name': 'A', 'Last Name': 'B', Email: 'a@b.com' }]}
        onMappingChange={onChange}
      />
    )

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        'First Name': 'first_name',
        'Last Name': 'last_name',
        Email: 'email',
      })
    )
  })

  it('renders a dropdown for each source column', () => {
    const onChange = vi.fn()
    render(<ColumnMapper headers={headers} sampleRows={sampleRows} onMappingChange={onChange} />)

    const selects = screen.getAllByRole('combobox')
    expect(selects).toHaveLength(headers.length)
  })

  it('includes Skip option in dropdowns', () => {
    const onChange = vi.fn()
    render(<ColumnMapper headers={headers} sampleRows={sampleRows} onMappingChange={onChange} />)

    const selects = screen.getAllByRole('combobox')
    // Each select should have a Skip option
    for (const select of selects) {
      const options = Array.from((select as HTMLSelectElement).options)
      expect(options.some((opt) => opt.text === 'Skip')).toBe(true)
    }
  })

  it('calls onMappingChange when dropdown value changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ColumnMapper headers={headers} sampleRows={sampleRows} onMappingChange={onChange} />)

    // Clear initial call tracking
    onChange.mockClear()

    // Find the dropdown for "Notes" column (last one, likely mapped to skip)
    const selects = screen.getAllByRole('combobox')
    const notesSelect = selects[3]

    await user.selectOptions(notesSelect, 'description')

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ Notes: 'description' })
    )
  })

  it('shows preview of sample data for each column', () => {
    const onChange = vi.fn()
    render(<ColumnMapper headers={headers} sampleRows={sampleRows} onMappingChange={onChange} />)

    // Should show first 3 rows of sample data
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
    expect(screen.getByText('Carol Wu')).toBeInTheDocument()
  })
})
