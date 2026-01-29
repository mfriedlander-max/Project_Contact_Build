import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SettingsPage from '../settings/page'

describe('SettingsPage', () => {
  it('renders settings page with heading', () => {
    render(<SettingsPage />)

    expect(screen.getByRole('heading', { name: /^settings$/i })).toBeInTheDocument()
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
})
