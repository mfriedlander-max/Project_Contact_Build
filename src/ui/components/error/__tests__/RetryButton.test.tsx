import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { RetryButton } from '../RetryButton'

describe('RetryButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders in idle state with "Try Again" text', () => {
    render(<RetryButton onRetry={vi.fn()} />)
    const button = screen.getByRole('button', { name: /try again/i })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })

  it('shows loading state with "Retrying..." on click', async () => {
    const onRetry = vi.fn(() => new Promise<void>(() => {}))

    render(<RetryButton onRetry={onRetry} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    })

    expect(screen.getByRole('button', { name: /retrying/i })).toBeInTheDocument()
  })

  it('disables button during loading state', async () => {
    const onRetry = vi.fn(() => new Promise<void>(() => {}))

    render(<RetryButton onRetry={onRetry} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    })

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows success state after successful retry', async () => {
    const onRetry = vi.fn(() => Promise.resolve())

    render(<RetryButton onRetry={onRetry} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    })

    expect(screen.getByRole('button', { name: /success/i })).toBeInTheDocument()
  })

  it('resets to idle after 1s success display', async () => {
    const onRetry = vi.fn(() => Promise.resolve())

    render(<RetryButton onRetry={onRetry} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    })

    expect(screen.getByRole('button', { name: /success/i })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('retries with exponential backoff on failure', async () => {
    const onRetry = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined)

    render(<RetryButton onRetry={onRetry} maxRetries={3} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    })

    // First attempt failed
    expect(onRetry).toHaveBeenCalledTimes(1)

    // Advance past 1s backoff
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(onRetry).toHaveBeenCalledTimes(2)

    // Advance past 2s backoff
    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(onRetry).toHaveBeenCalledTimes(3)

    // Third attempt succeeds
    expect(screen.getByRole('button', { name: /success/i })).toBeInTheDocument()
  })

  it('shows error state after max retries exhausted', async () => {
    const onRetry = vi.fn().mockRejectedValue(new Error('fail'))

    render(<RetryButton onRetry={onRetry} maxRetries={2} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    })

    expect(onRetry).toHaveBeenCalledTimes(1)

    // Advance past 1s backoff
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(onRetry).toHaveBeenCalledTimes(2)

    expect(screen.getByText(/failed after 2 attempts/i)).toBeInTheDocument()
  })

  it('respects custom maxRetries prop', async () => {
    const onRetry = vi.fn().mockRejectedValue(new Error('fail'))

    render(<RetryButton onRetry={onRetry} maxRetries={1} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    })

    expect(onRetry).toHaveBeenCalledTimes(1)

    expect(screen.getByText(/failed after 1 attempt(?!s)/i)).toBeInTheDocument()
  })
})
