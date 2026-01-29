import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopBar } from '../TopBar'
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

describe('TopBar', () => {
  it('renders topbar as header element', () => {
    render(<TopBar currentMode={AiMode.CONTACT_FINDER} onModeChange={vi.fn()} />)

    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('renders ModeSwitch component', () => {
    render(<TopBar currentMode={AiMode.CONTACT_FINDER} onModeChange={vi.fn()} />)

    // ModeSwitch renders a radiogroup
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('renders user avatar', () => {
    render(<TopBar currentMode={AiMode.CONTACT_FINDER} onModeChange={vi.fn()} />)

    expect(screen.getByRole('img', { name: /avatar|user/i })).toBeInTheDocument()
  })

  it('passes mode change handler to ModeSwitch', () => {
    const onModeChange = vi.fn()
    render(<TopBar currentMode={AiMode.CONTACT_FINDER} onModeChange={onModeChange} />)

    // Click on a different mode
    const assistantOption = screen.getByRole('radio', { name: /assistant/i })
    fireEvent.click(assistantOption)

    expect(onModeChange).toHaveBeenCalledWith(AiMode.ASSISTANT)
  })

  it('has proper styling for fixed header', () => {
    render(<TopBar currentMode={AiMode.CONTACT_FINDER} onModeChange={vi.fn()} />)

    const header = screen.getByRole('banner')
    expect(header).toHaveClass('border-b')
  })
})
