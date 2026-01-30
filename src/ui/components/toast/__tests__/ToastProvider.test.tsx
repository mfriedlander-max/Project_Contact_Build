import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { ToastProvider } from '../ToastProvider'
import { useToast } from '@/src/ui/hooks/useToast'

function AddToastButton({ message, type }: { message: string; type?: 'success' | 'error' | 'info' }) {
  const { addToast } = useToast()
  return (
    <button onClick={() => addToast({ type: type ?? 'success', message })}>
      Add Toast
    </button>
  )
}

describe('ToastProvider', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <p>Child content</p>
      </ToastProvider>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('renders toast when added via hook', () => {
    render(
      <ToastProvider>
        <AddToastButton message="Hello toast" />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText('Add Toast'))
    expect(screen.getByText('Hello toast')).toBeInTheDocument()
  })

  it('stacks multiple toasts vertically', () => {
    render(
      <ToastProvider>
        <AddToastButton message="First toast" />
      </ToastProvider>
    )
    const button = screen.getByText('Add Toast')
    fireEvent.click(button)
    fireEvent.click(button)

    const alerts = screen.getAllByRole('alert')
    expect(alerts.length).toBeGreaterThanOrEqual(2)
  })

  it('renders toasts in a portal outside the children wrapper', () => {
    const { container } = render(
      <ToastProvider>
        <div data-testid="children-wrapper">
          <AddToastButton message="Portal toast" />
        </div>
      </ToastProvider>
    )
    fireEvent.click(screen.getByText('Add Toast'))

    // Toast should exist in the document
    expect(screen.getByText('Portal toast')).toBeInTheDocument()

    // But NOT inside the children wrapper rendered by the provider into the container
    const childrenWrapper = screen.getByTestId('children-wrapper')
    expect(within(childrenWrapper).queryByText('Portal toast')).not.toBeInTheDocument()
  })

  it('removes toast when close button is clicked', () => {
    render(
      <ToastProvider>
        <AddToastButton message="Dismissable toast" />
      </ToastProvider>
    )
    fireEvent.click(screen.getByText('Add Toast'))
    expect(screen.getByText('Dismissable toast')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByText('Dismissable toast')).not.toBeInTheDocument()
  })
})
