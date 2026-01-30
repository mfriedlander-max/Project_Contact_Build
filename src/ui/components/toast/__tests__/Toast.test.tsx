import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Toast } from '../Toast'
import type { Toast as ToastType } from '@/src/ui/hooks/useToast'

const makeToast = (overrides: Partial<ToastType> = {}): ToastType => ({
  id: 'toast-1',
  type: 'success',
  message: 'Operation completed',
  duration: 5000,
  ...overrides,
})

describe('Toast', () => {
  it('renders the message text', () => {
    render(<Toast toast={makeToast({ message: 'Saved successfully' })} onClose={vi.fn()} />)
    expect(screen.getByText('Saved successfully')).toBeInTheDocument()
  })

  it('calls onClose with toast id when close button is clicked', () => {
    const onClose = vi.fn()
    render(<Toast toast={makeToast({ id: 'toast-42' })} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledWith('toast-42')
  })

  it('applies success variant styles', () => {
    const { container } = render(
      <Toast toast={makeToast({ type: 'success' })} onClose={vi.fn()} />
    )
    expect(container.firstChild).toHaveAttribute('data-variant', 'success')
  })

  it('applies error variant styles', () => {
    const { container } = render(
      <Toast toast={makeToast({ type: 'error' })} onClose={vi.fn()} />
    )
    expect(container.firstChild).toHaveAttribute('data-variant', 'error')
  })

  it('applies warning variant styles', () => {
    const { container } = render(
      <Toast toast={makeToast({ type: 'warning' })} onClose={vi.fn()} />
    )
    expect(container.firstChild).toHaveAttribute('data-variant', 'warning')
  })

  it('applies info variant styles', () => {
    const { container } = render(
      <Toast toast={makeToast({ type: 'info' })} onClose={vi.fn()} />
    )
    expect(container.firstChild).toHaveAttribute('data-variant', 'info')
  })

  it('applies undo variant styles', () => {
    const { container } = render(
      <Toast toast={makeToast({ type: 'undo' })} onClose={vi.fn()} />
    )
    expect(container.firstChild).toHaveAttribute('data-variant', 'undo')
  })

  it('renders an action button when action is provided', () => {
    const onClick = vi.fn()
    render(
      <Toast
        toast={makeToast({ action: { label: 'Retry', onClick } })}
        onClose={vi.fn()}
      />
    )
    const button = screen.getByRole('button', { name: 'Retry' })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not render an action button when no action is provided', () => {
    render(<Toast toast={makeToast()} onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('renders a progress bar', () => {
    render(<Toast toast={makeToast()} onClose={vi.fn()} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
