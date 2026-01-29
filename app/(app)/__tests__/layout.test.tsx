import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from '@/src/ui/layouts/AppShell'

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

// Test the AppShell component directly since the layout is now async
// and requires server-side session which can't be easily tested
describe('AppLayout', () => {
  it('renders children content', () => {
    render(
      <AppShell>
        <div data-testid="child-content">Child Content</div>
      </AppShell>
    )

    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('renders sidebar with navigation', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByRole('complementary')).toBeInTheDocument()
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('has main content area', () => {
    render(
      <AppShell>
        <div>Content</div>
      </AppShell>
    )

    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
