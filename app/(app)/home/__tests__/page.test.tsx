import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePage from '../page'

// Mock the hooks
vi.mock('@/src/ui/hooks/useChatApi', () => ({
  useChatApi: () => ({
    stagedContacts: [],
    stagingQuery: '',
    isLoading: false,
    error: null,
    sendMessage: vi.fn(),
    approveStaged: vi.fn(),
    deleteStagedRow: vi.fn(),
    clearStaging: vi.fn(),
  }),
}))

// Mock localStorage
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

describe('HomePage', () => {
  it('renders the chat panel', () => {
    render(<HomePage />)
    expect(screen.getByText('Start a conversation')).toBeInTheDocument()
  })

  it('renders chat log area', () => {
    render(<HomePage />)
    expect(screen.getByRole('log', { name: /chat messages/i })).toBeInTheDocument()
  })

  it('does not render staging panel when no staged contacts', () => {
    render(<HomePage />)
    expect(screen.queryByText('Approve')).not.toBeInTheDocument()
  })
})
