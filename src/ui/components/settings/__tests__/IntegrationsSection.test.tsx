import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntegrationsSection } from '../IntegrationsSection'

describe('IntegrationsSection', () => {
  it('renders integrations section heading', () => {
    render(<IntegrationsSection />)

    expect(screen.getByRole('heading', { name: /integrations/i })).toBeInTheDocument()
  })

  it('renders Gmail integration card', () => {
    render(<IntegrationsSection />)

    expect(screen.getByRole('heading', { name: /gmail/i })).toBeInTheDocument()
    expect(screen.getByText(/connect your gmail account/i)).toBeInTheDocument()
  })

  it('renders Hunter integration card', () => {
    render(<IntegrationsSection />)

    expect(screen.getByText(/hunter/i)).toBeInTheDocument()
    expect(screen.getByText(/email finding/i)).toBeInTheDocument()
  })

  it('renders Search API integration card', () => {
    render(<IntegrationsSection />)

    expect(screen.getByRole('heading', { name: /search api/i })).toBeInTheDocument()
  })

  it('shows connection status for each integration', () => {
    render(<IntegrationsSection />)

    const connectButtons = screen.getAllByRole('button', { name: /connect|configure/i })
    expect(connectButtons.length).toBeGreaterThanOrEqual(3)
  })

  it('has correct section structure with cards', () => {
    render(<IntegrationsSection />)

    const section = screen.getByRole('region', { name: /integrations/i })
    expect(section).toBeInTheDocument()
  })

  describe('Hunter Test Key button', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('renders Test Key button when Hunter input is shown', async () => {
      const user = userEvent.setup()
      render(<IntegrationsSection onHunterSave={vi.fn()} onTestHunterKey={vi.fn()} />)

      const connectButton = screen.getAllByRole('button', { name: /connect/i })[1]
      await user.click(connectButton)

      expect(screen.getByRole('button', { name: /test key/i })).toBeInTheDocument()
    })

    it('shows Testing status while verifying', async () => {
      const user = userEvent.setup()
      let resolveTest: (val: boolean) => void
      const onTestHunterKey = vi.fn(() => new Promise<boolean>((r) => { resolveTest = r }))

      render(<IntegrationsSection onHunterSave={vi.fn()} onTestHunterKey={onTestHunterKey} />)

      const connectButton = screen.getAllByRole('button', { name: /connect/i })[1]
      await user.click(connectButton)

      const input = screen.getByLabelText(/hunter api key/i)
      await user.type(input, 'test-key-123')
      await user.click(screen.getByRole('button', { name: /test key/i }))

      expect(screen.getByText(/testing/i)).toBeInTheDocument()

      await act(async () => { resolveTest!(true) })
    })

    it('shows Valid status on success and clears after 3 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const onTestHunterKey = vi.fn().mockResolvedValue(true)

      render(<IntegrationsSection onHunterSave={vi.fn()} onTestHunterKey={onTestHunterKey} />)

      const connectButton = screen.getAllByRole('button', { name: /connect/i })[1]
      await user.click(connectButton)

      const input = screen.getByLabelText(/hunter api key/i)
      await user.type(input, 'valid-key')
      await user.click(screen.getByRole('button', { name: /test key/i }))

      expect(screen.getByText(/valid/i)).toBeInTheDocument()

      act(() => { vi.advanceTimersByTime(3000) })
      expect(screen.queryByText(/valid/i)).not.toBeInTheDocument()
    })

    it('shows Invalid status on failure', async () => {
      const user = userEvent.setup()
      const onTestHunterKey = vi.fn().mockResolvedValue(false)

      render(<IntegrationsSection onHunterSave={vi.fn()} onTestHunterKey={onTestHunterKey} />)

      const connectButton = screen.getAllByRole('button', { name: /connect/i })[1]
      await user.click(connectButton)

      const input = screen.getByLabelText(/hunter api key/i)
      await user.type(input, 'bad-key')
      await user.click(screen.getByRole('button', { name: /test key/i }))

      expect(screen.getByText(/invalid/i)).toBeInTheDocument()
    })
  })
})
