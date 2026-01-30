import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/src/ui/components/chat/ChatContext', () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useChatContext: () => ({ addAssistantMessage: vi.fn(), setLoading: vi.fn() }),
}))

vi.mock('@/src/ui/components/chat/ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel">Chat Panel</div>,
}))

const mockUseChatApi = vi.fn(() => ({
  stagedContacts: [],
  stagingQuery: '',
  sendMessage: vi.fn(),
  approveStaged: vi.fn(),
  deleteStagedRow: vi.fn(),
  clearStaging: vi.fn(),
}))

vi.mock('@/src/ui/hooks/useChatApi', () => ({
  useChatApi: (...args: unknown[]) => mockUseChatApi(...args),
}))

vi.mock('@/src/ui/components/staging/StagingPanel', () => ({
  StagingPanel: () => <div data-testid="staging-panel">Staging</div>,
}))

import React from 'react'
import HomePage from '../home/page'

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage)
  mockLocalStorage.getItem.mockReturnValue(null)
  mockUseChatApi.mockReturnValue({
    stagedContacts: [],
    stagingQuery: '',
    sendMessage: vi.fn(),
    approveStaged: vi.fn(),
    deleteStagedRow: vi.fn(),
    clearStaging: vi.fn(),
  })
})

describe('HomePage', () => {
  it('renders the chat panel', () => {
    render(<HomePage />)
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument()
  })

  it('does not render staging panel when no staged contacts', () => {
    render(<HomePage />)
    expect(screen.queryByTestId('staging-panel')).not.toBeInTheDocument()
  })

  it('renders staging panel when contacts are staged', () => {
    mockUseChatApi.mockReturnValue({
      stagedContacts: [{ id: '1', name: 'Test' }],
      stagingQuery: '',
      sendMessage: vi.fn(),
      approveStaged: vi.fn(),
      deleteStagedRow: vi.fn(),
      clearStaging: vi.fn(),
    })
    render(<HomePage />)
    expect(screen.getByTestId('staging-panel')).toBeInTheDocument()
  })
})
