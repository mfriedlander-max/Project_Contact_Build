import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePage from '../page'

const mockStagedContacts = [
  { id: '1', name: 'Alice Smith', company: 'Google', email: 'alice@google.com' },
  { id: '2', name: 'Bob Jones', company: 'Meta', email: 'bob@meta.com' },
]

vi.mock('@/src/ui/hooks/useChatApi', () => ({
  useChatApi: () => ({
    stagedContacts: mockStagedContacts,
    stagingQuery: 'Find contacts at tech companies',
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
    approveStaged: vi.fn(),
    deleteStagedRow: vi.fn(),
    clearStaging: vi.fn(),
  }),
}))

const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('HomePage with staged contacts', () => {
  it('renders staging panel when contacts exist', () => {
    render(<HomePage />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
  })

  it('shows staging query', () => {
    render(<HomePage />)
    expect(screen.getByText(/find contacts at tech companies/i)).toBeInTheDocument()
  })

  it('renders approve and clear buttons', () => {
    render(<HomePage />)
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })
})
