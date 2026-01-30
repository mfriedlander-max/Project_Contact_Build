import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AutomationSection } from '../AutomationSection'

describe('AutomationSection', () => {
  it('renders automation section heading', () => {
    render(<AutomationSection />)
    expect(screen.getByRole('heading', { name: /automation/i })).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<AutomationSection />)
    expect(screen.getByText(/automate your workflows/i)).toBeInTheDocument()
  })

  it('has correct section structure', () => {
    render(<AutomationSection />)
    const section = screen.getByRole('region', { name: /automation/i })
    expect(section).toBeInTheDocument()
  })

  it('renders availability textarea', () => {
    render(<AutomationSection />)
    expect(screen.getByLabelText(/availability/i)).toBeInTheDocument()
    expect(
      screen.getByText(/your availability text will be inserted into email templates/i)
    ).toBeInTheDocument()
  })

  it('availability textarea shows value from settings', () => {
    render(
      <AutomationSection
        settings={{ availabilityBlock: 'Free Tuesday and Thursday afternoons' }}
      />
    )
    const textarea = screen.getByLabelText(/availability/i)
    expect(textarea).toHaveValue('Free Tuesday and Thursday afternoons')
  })

  it('renders auto-run toggles', () => {
    render(<AutomationSection />)
    expect(screen.getByText(/auto-run email finding/i)).toBeInTheDocument()
    expect(screen.getByText(/auto-run personalized inserts/i)).toBeInTheDocument()
    expect(screen.getByText(/auto-run draft creation/i)).toBeInTheDocument()
  })

  it('renders didn\'t connect toggle', () => {
    render(<AutomationSection />)
    expect(screen.getByText("Didn't connect follow-up")).toBeInTheDocument()
  })

  it('shows days input when didntConnectEnabled is true', () => {
    render(<AutomationSection settings={{ didntConnectEnabled: true }} />)
    expect(screen.getByLabelText(/days before flagging/i)).toBeInTheDocument()
  })

  it('hides days input when didntConnectEnabled is false', () => {
    render(<AutomationSection settings={{ didntConnectEnabled: false }} />)
    expect(screen.queryByLabelText(/days before flagging/i)).not.toBeInTheDocument()
  })

  it('calls onSettingChange when availability changes', async () => {
    const user = userEvent.setup()
    const onSettingChange = vi.fn()
    render(<AutomationSection onSettingChange={onSettingChange} />)

    const textarea = screen.getByLabelText(/availability/i)
    await user.type(textarea, 'Mon-Fri')

    expect(onSettingChange).toHaveBeenCalledWith('availabilityBlock', 'Mon-Fri')
  })

  it('calls onSettingChange when days input changes', async () => {
    const user = userEvent.setup()
    const onSettingChange = vi.fn()
    render(
      <AutomationSection
        settings={{ didntConnectEnabled: true }}
        onSettingChange={onSettingChange}
      />
    )

    const input = screen.getByLabelText(/days before flagging/i)
    await user.clear(input)
    await user.type(input, '7')

    expect(onSettingChange).toHaveBeenCalledWith('didntConnectDays', 7)
  })

  it('renders toggle switches for all automations', () => {
    render(<AutomationSection />)
    const switches = screen.getAllByRole('switch')
    // 3 auto-run + 1 didn't connect = 4
    expect(switches).toHaveLength(4)
  })
})
