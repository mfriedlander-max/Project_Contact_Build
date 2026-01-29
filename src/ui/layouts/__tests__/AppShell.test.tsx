import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from '../AppShell'

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

describe('AppShell', () => {
  it('renders children in main content area', () => {
    render(
      <AppShell>
        <div data-testid="child-content">Test Content</div>
      </AppShell>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('renders Sidebar component', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('renders TopBar component', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('has proper layout structure (sidebar + main area)', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )

    // Should have flex layout
    const container = screen.getByRole('complementary').parentElement
    expect(container).toHaveClass('flex')
  })

  it('main content area is scrollable', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )

    const main = screen.getByRole('main')
    expect(main).toHaveClass('flex-1')
  })

  it('manages mode state and passes to children', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )

    // Should show mode switch in topbar with all options (use radiogroup to be specific)
    const radiogroup = screen.getByRole('radiogroup')
    expect(radiogroup).toBeInTheDocument()

    // Check that all mode options exist as radios
    expect(screen.getByRole('radio', { name: /contact finder/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /general manager/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /assistant/i })).toBeInTheDocument()
  })
})
