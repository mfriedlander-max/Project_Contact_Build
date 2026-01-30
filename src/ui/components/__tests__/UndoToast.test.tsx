import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { UndoToast } from '../UndoToast'
import { useToast } from '@/src/ui/hooks/useToast'

vi.mock('@/src/ui/hooks/useToast', () => ({
  useToast: vi.fn(),
}))

const mockUndo = vi.fn()
const mockUseToast = useToast as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers()
  mockUndo.mockReset()
  mockUseToast.mockReturnValue({
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    undo: mockUndo,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('UndoToast', () => {
  it('calls useToast().undo on mount with message and onUndo', () => {
    const onUndo = vi.fn()
    render(<UndoToast message="Contact deleted" onUndo={onUndo} onDismiss={vi.fn()} />)
    expect(mockUndo).toHaveBeenCalledOnce()
    expect(mockUndo).toHaveBeenCalledWith('Contact deleted', onUndo, 5000)
  })

  it('renders null (no visible DOM output)', () => {
    const { container } = render(
      <UndoToast message="Deleted" onUndo={vi.fn()} onDismiss={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('calls onDismiss after 5 seconds', () => {
    const onDismiss = vi.fn()
    render(<UndoToast message="Deleted" onUndo={vi.fn()} onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('does not call onDismiss before 5 seconds', () => {
    const onDismiss = vi.fn()
    render(<UndoToast message="Deleted" onUndo={vi.fn()} onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(4999)
    })

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('does not call onUndo on auto-dismiss', () => {
    const onUndo = vi.fn()
    const onDismiss = vi.fn()
    render(<UndoToast message="Deleted" onUndo={onUndo} onDismiss={onDismiss} />)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onDismiss).toHaveBeenCalledOnce()
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('cleans up dismiss timer on unmount', () => {
    const onDismiss = vi.fn()
    const { unmount } = render(
      <UndoToast message="Deleted" onUndo={vi.fn()} onDismiss={onDismiss} />
    )

    unmount()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onDismiss).not.toHaveBeenCalled()
  })
})
