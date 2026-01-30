import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  }),
}))

vi.mock('@/src/ui/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      autoRunEmailFinding: false,
      autoRunInserts: false,
      autoRunDrafts: false,
      availabilityBlock: true,
      didntConnectEnabled: false,
      didntConnectDays: 7,
    },
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

  it('renders tab bar with 3 tabs', () => {
    render(<SettingsPage />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[0]).toHaveTextContent('Integrations')
    expect(tabs[1]).toHaveTextContent('Templates')
    expect(tabs[2]).toHaveTextContent('Automation')
  })

  it('shows integrations tab by default', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('region', { name: /integrations/i })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /templates/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /automation/i })).not.toBeInTheDocument()
  })

  it('switches to templates tab', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await user.click(screen.getByRole('tab', { name: 'Templates' }))

    expect(screen.getByRole('region', { name: /templates/i })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /integrations/i })).not.toBeInTheDocument()
  })

  it('switches to automation tab', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await user.click(screen.getByRole('tab', { name: 'Automation' }))

    expect(screen.getByRole('region', { name: /automation/i })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /integrations/i })).not.toBeInTheDocument()
  })

  it('hides other sections when tab is selected', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await user.click(screen.getByRole('tab', { name: 'Automation' }))

    expect(screen.queryByRole('region', { name: /integrations/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /templates/i })).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: /automation/i })).toBeInTheDocument()
  })

  it('marks active tab as selected', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    const integrationsTab = screen.getByRole('tab', { name: 'Integrations' })
    expect(integrationsTab).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: 'Templates' }))

    expect(integrationsTab).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Templates' })).toHaveAttribute('aria-selected', 'true')
  })
})
