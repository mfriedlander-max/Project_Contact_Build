import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModeSwitch } from '../ModeSwitch'
import { AiMode } from '@/lib/types/enums'

// Mock localStorage
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

describe('ModeSwitch', () => {
  it('renders all three mode options', () => {
    render(<ModeSwitch />)

    expect(screen.getByText(/contact finder/i)).toBeInTheDocument()
    expect(screen.getByText(/general manager/i)).toBeInTheDocument()
    expect(screen.getByText(/assistant/i)).toBeInTheDocument()
  })

  it('defaults to CONTACT_FINDER mode', () => {
    render(<ModeSwitch />)

    const contactFinderOption = screen.getByRole('radio', { name: /contact finder/i })
    expect(contactFinderOption).toBeChecked()
  })

  it('allows switching modes', () => {
    render(<ModeSwitch />)

    const assistantOption = screen.getByRole('radio', { name: /assistant/i })
    fireEvent.click(assistantOption)

    expect(assistantOption).toBeChecked()
  })

  it('persists mode to localStorage on change', () => {
    render(<ModeSwitch />)

    const assistantOption = screen.getByRole('radio', { name: /assistant/i })
    fireEvent.click(assistantOption)

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aiMode', AiMode.ASSISTANT)
  })

  it('loads mode from localStorage on mount', () => {
    mockLocalStorage.getItem.mockReturnValue(AiMode.GENERAL_MANAGER)

    render(<ModeSwitch />)

    const generalManagerOption = screen.getByRole('radio', { name: /general manager/i })
    expect(generalManagerOption).toBeChecked()
  })

  it('calls onChange callback when mode changes', () => {
    const onChange = vi.fn()
    render(<ModeSwitch onChange={onChange} />)

    const assistantOption = screen.getByRole('radio', { name: /assistant/i })
    fireEvent.click(assistantOption)

    expect(onChange).toHaveBeenCalledWith(AiMode.ASSISTANT)
  })

  it('has accessible radiogroup role', () => {
    render(<ModeSwitch />)

    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })
})
