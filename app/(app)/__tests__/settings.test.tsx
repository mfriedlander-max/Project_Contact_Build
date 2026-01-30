import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from '../settings/page'

describe('SettingsPage', () => {
  it('renders settings page with heading', () => {
    render(<SettingsPage />)

    expect(screen.getByRole('heading', { name: /^settings$/i })).toBeInTheDocument()
  })

  it('renders integrations section by default', () => {
    render(<SettingsPage />)

    expect(screen.getByRole('region', { name: /integrations/i })).toBeInTheDocument()
  })

  it('renders templates section when tab is clicked', async () => {
    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('tab', { name: /templates/i }))

    expect(screen.getByRole('region', { name: /templates/i })).toBeInTheDocument()
  })

  it('renders automation section when tab is clicked', async () => {
    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('tab', { name: /automation/i }))

    expect(screen.getByRole('region', { name: /automation/i })).toBeInTheDocument()
  })
})
