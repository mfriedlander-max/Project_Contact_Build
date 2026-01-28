import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { UndoToast } from '../UndoToast'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('UndoToast', () => {
  it('renders the message text', () => {
    render(<UndoToast message="Contact deleted" onUndo={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText('Contact deleted')).toBeInTheDocument()
  })

  it('renders an undo button', () => {
    render(<UndoToast message="Deleted" onUndo={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument()
  })

  it('calls onUndo when undo button is clicked', () => {
    const onUndo = vi.fn()
    render(<UndoToast message="Deleted" onUndo={onUndo} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /undo/i }))
    expect(onUndo).toHaveBeenCalledOnce()
  })

  it('auto-dismisses after 5 seconds', () => {
    const onDismiss = vi.fn()
    render(<UndoToast message="Deleted" onUndo={vi.fn()} onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('does not auto-dismiss before 5 seconds', () => {
    const onDismiss = vi.fn()
    render(<UndoToast message="Deleted" onUndo={vi.fn()} onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(4999)
    })

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('renders a progress bar element', () => {
    render(<UndoToast message="Deleted" onUndo={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('calls onDismiss (not onUndo) when auto-dismissed', () => {
    const onUndo = vi.fn()
    const onDismiss = vi.fn()
    render(<UndoToast message="Deleted" onUndo={onUndo} onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onDismiss).toHaveBeenCalledOnce()
    expect(onUndo).not.toHaveBeenCalled()
  })
})
