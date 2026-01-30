import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadDialog } from '../UploadDialog'

// Mock siblings
vi.mock('../ColumnMapper', () => ({
  ColumnMapper: ({ headers, onMappingChange }: { headers: string[]; onMappingChange: (m: Record<string, string>) => void }) => {
    return (
      <div data-testid="column-mapper">
        <span>Headers: {headers.join(', ')}</span>
        <button
          onClick={() =>
            onMappingChange({ Name: 'last_name', Email: 'email' })
          }
        >
          Apply Mapping
        </button>
      </div>
    )
  },
}))

vi.mock('../UploadPreview', () => ({
  UploadPreview: ({
    contacts,
    errors,
    onImport,
    onBack,
    isImporting,
  }: {
    contacts: unknown[]
    errors: unknown[]
    onImport: () => void
    onBack: () => void
    isImporting: boolean
  }) => (
    <div data-testid="upload-preview">
      <span>{contacts.length} contacts</span>
      <span>{errors.length} errors</span>
      <button onClick={onImport} disabled={isImporting}>
        {isImporting ? 'Importing...' : 'Import'}
      </button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}))

// Mock upload parser
vi.mock('@/src/server/services/uploadParser', () => ({
  parseCSV: vi.fn().mockReturnValue({
    headers: ['Name', 'Email'],
    rows: [
      { Name: 'Alice', Email: 'alice@test.com' },
      { Name: 'Bob', Email: 'bob@test.com' },
    ],
    rowCount: 2,
    errors: [],
  }),
  parseXLSX: vi.fn().mockReturnValue({
    headers: ['Name', 'Email'],
    rows: [{ Name: 'Carol', Email: 'carol@test.com' }],
    rowCount: 1,
    errors: [],
  }),
  applyMapping: vi.fn().mockReturnValue([
    { last_name: 'Alice', email: 'alice@test.com', connection_stage: 'DRAFTED', v: 0 },
    { last_name: 'Bob', email: 'bob@test.com', connection_stage: 'DRAFTED', v: 0 },
  ]),
  validateContacts: vi.fn().mockReturnValue({
    valid: [
      { last_name: 'Alice', email: 'alice@test.com', connection_stage: 'DRAFTED', v: 0 },
      { last_name: 'Bob', email: 'bob@test.com', connection_stage: 'DRAFTED', v: 0 },
    ],
    errors: [],
  }),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

function createCSVFile(content = 'Name,Email\nAlice,alice@test.com\nBob,bob@test.com') {
  return new File([content], 'contacts.csv', { type: 'text/csv' })
}

describe('UploadDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onImportComplete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { importedCount: 2 } }),
    })
  })

  it('does not render when open is false', () => {
    render(<UploadDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('Import Contacts')).not.toBeInTheDocument()
  })

  it('renders step 1 (file selection) when open', () => {
    render(<UploadDialog {...defaultProps} />)
    expect(screen.getByText('Import Contacts')).toBeInTheDocument()
    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
  })

  it('shows close button that calls onClose', async () => {
    const user = userEvent.setup()
    render(<UploadDialog {...defaultProps} />)
    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('advances to step 2 after selecting a CSV file', async () => {
    const user = userEvent.setup()
    render(<UploadDialog {...defaultProps} />)

    const fileInput = screen.getByTestId('file-input')
    const file = createCSVFile()
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByTestId('column-mapper')).toBeInTheDocument()
    })
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
  })

  it('advances to step 3 after mapping columns and clicking Next', async () => {
    const user = userEvent.setup()
    render(<UploadDialog {...defaultProps} />)

    // Step 1: select file
    const fileInput = screen.getByTestId('file-input')
    await user.upload(fileInput, createCSVFile())

    await waitFor(() => {
      expect(screen.getByTestId('column-mapper')).toBeInTheDocument()
    })

    // Step 2: apply mapping and click Next
    await user.click(screen.getByText('Apply Mapping'))
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByTestId('upload-preview')).toBeInTheDocument()
    })
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument()
  })

  it('completes full import flow', async () => {
    const user = userEvent.setup()
    render(<UploadDialog {...defaultProps} campaignId="camp-123" />)

    // Step 1
    await user.upload(screen.getByTestId('file-input'), createCSVFile())
    await waitFor(() => {
      expect(screen.getByTestId('column-mapper')).toBeInTheDocument()
    })

    // Step 2
    await user.click(screen.getByText('Apply Mapping'))
    await user.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByTestId('upload-preview')).toBeInTheDocument()
    })

    // Step 3: import
    await user.click(screen.getByText('Import'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/contacts/upload',
        expect.objectContaining({ method: 'POST' })
      )
    })

    await waitFor(() => {
      expect(defaultProps.onImportComplete).toHaveBeenCalledWith(2)
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  it('shows confirm when closing with a file selected', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<UploadDialog {...defaultProps} />)

    // Select file first
    await user.upload(screen.getByTestId('file-input'), createCSVFile())
    await waitFor(() => {
      expect(screen.getByTestId('column-mapper')).toBeInTheDocument()
    })

    const closeButton = screen.getByRole('button', { name: /close/i })
    await user.click(closeButton)

    expect(confirmSpy).toHaveBeenCalled()
    expect(defaultProps.onClose).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })

  it('accepts file via drag and drop', async () => {
    render(<UploadDialog {...defaultProps} />)
    const dropZone = screen.getByTestId('drop-zone')
    const file = createCSVFile()

    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', type: 'text/csv', getAsFile: () => file }],
      types: ['Files'],
    }

    Object.defineProperty(dropZone, 'files', { value: [file] })

    const dropEvent = new Event('drop', { bubbles: true })
    Object.defineProperty(dropEvent, 'dataTransfer', { value: dataTransfer })
    dropZone.dispatchEvent(dropEvent)

    await waitFor(() => {
      expect(screen.getByTestId('column-mapper')).toBeInTheDocument()
    })
  })
})
