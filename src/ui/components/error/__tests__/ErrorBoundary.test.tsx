import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'
import { ErrorFallback } from '../ErrorFallback'

function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error')
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('catches render error and shows default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText('No error')).not.toBeInTheDocument()
  })

  it('uses custom fallback when provided', () => {
    const CustomFallback = () => <div>Custom fallback</div>
    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('resets error state when Try Again is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // After clicking Try Again, re-render with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(screen.getByText('No error')).toBeInTheDocument()
  })
})

describe('ErrorFallback', () => {
  it('shows "Something went wrong" message', () => {
    render(
      <ErrorFallback
        error={new Error('Test error')}
        resetErrorBoundary={() => {}}
      />
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('has a "Try Again" button that calls resetErrorBoundary', () => {
    const reset = vi.fn()
    render(
      <ErrorFallback error={new Error('Test error')} resetErrorBoundary={reset} />
    )
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(reset).toHaveBeenCalledOnce()
  })

  it('has a "Go Home" link with href="/"', () => {
    render(
      <ErrorFallback
        error={new Error('Test error')}
        resetErrorBoundary={() => {}}
      />
    )
    const link = screen.getByRole('link', { name: /go home/i })
    expect(link).toHaveAttribute('href', '/')
  })

  it('shows error details in development mode', () => {
    vi.stubEnv('NODE_ENV', 'development')

    render(
      <ErrorFallback
        error={new Error('Test error')}
        resetErrorBoundary={() => {}}
      />
    )
    expect(screen.getByText('Show details')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Show details'))
    expect(screen.getByText(/Test error/)).toBeInTheDocument()

    vi.unstubAllEnvs()
  })
})
