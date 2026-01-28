import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})

describe('HomePage', () => {
  it('renders the ModeSwitch', () => {
    render(<HomePage />)
    expect(screen.getByRole('radiogroup', { name: /ai mode/i })).toBeInTheDocument()
  })

  it('renders the chat panel with input', () => {
    render(<HomePage />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders the chat empty state', () => {
    render(<HomePage />)
    expect(screen.getByText(/start a conversation/i)).toBeInTheDocument()
  })

  it('does not render staging panel when no staged contacts', () => {
    const { container } = render(<HomePage />)
    // StagingPanel returns null when empty, so no approve button
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
  })
})
