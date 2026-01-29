import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SettingsPage from '../page'

vi.mock('@/src/ui/hooks/useIntegrations', () => ({
  useIntegrations: () => ({
    integrations: [],
    isLoading: false,
    error: null,
    saveIntegration: vi.fn(),
    isConnected: vi.fn().mockReturnValue(false),
  }),
}))

vi.mock('@/src/ui/hooks/useTemplates', () => ({
  useTemplates: () => ({
    templates: [],
    isLoading: false,
    error: null,
    createTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  }),
}))

vi.mock('@/src/ui/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: { autoSendDrafts: false, followUpReminders: true },
    isLoading: false,
    error: null,
    updateSettings: vi.fn(),
  }),
}))

describe('SettingsPage', () => {
  it('renders the page title', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('renders integrations section', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('region', { name: /integrations/i })).toBeInTheDocument()
  })

  it('renders templates section', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('region', { name: /templates/i })).toBeInTheDocument()
  })

  it('renders automation section', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('region', { name: /automation/i })).toBeInTheDocument()
  })

  it('shows Gmail integration', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Gmail')).toBeInTheDocument()
  })

  it('shows Hunter integration', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Hunter')).toBeInTheDocument()
  })

  it('shows automation toggles', () => {
    render(<SettingsPage />)
    expect(screen.getByText('Auto-send drafts')).toBeInTheDocument()
    expect(screen.getByText('Follow-up reminders')).toBeInTheDocument()
  })

  it('shows empty templates state', () => {
    render(<SettingsPage />)
    expect(screen.getByText(/no templates yet/i)).toBeInTheDocument()
  })
})
