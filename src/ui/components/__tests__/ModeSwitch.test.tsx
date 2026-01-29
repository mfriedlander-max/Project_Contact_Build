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

  // New tests for Task 11: Color-coded modes
  it('applies blue color styling for Contact Finder when selected', () => {
    render(<ModeSwitch />)

    const radiogroup = screen.getByRole('radiogroup')
    const labels = radiogroup.querySelectorAll('label')
    // Contact Finder is first and selected by default
    expect(labels[0].className).toContain('bg-blue')
  })

  it('applies green color styling for General Manager when selected', () => {
    render(<ModeSwitch value={AiMode.GENERAL_MANAGER} />)

    const radiogroup = screen.getByRole('radiogroup')
    const labels = radiogroup.querySelectorAll('label')
    // General Manager is second
    expect(labels[1].className).toContain('bg-green')
  })

  it('applies orange color styling for Assistant when selected', () => {
    render(<ModeSwitch value={AiMode.ASSISTANT} />)

    const radiogroup = screen.getByRole('radiogroup')
    const labels = radiogroup.querySelectorAll('label')
    // Assistant is third
    expect(labels[2].className).toContain('bg-orange')
  })

  it('does not apply mode color to unselected modes', () => {
    render(<ModeSwitch />)

    const radiogroup = screen.getByRole('radiogroup')
    const labels = radiogroup.querySelectorAll('label')
    // General Manager (index 1) should NOT have green when not selected
    expect(labels[1].className).not.toContain('bg-green')
    // Assistant (index 2) should NOT have orange when not selected
    expect(labels[2].className).not.toContain('bg-orange')
  })
})
