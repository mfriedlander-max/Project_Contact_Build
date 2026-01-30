import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { useToast, ToastProvider } from '../useToast'

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(ToastProvider, null, children)
  }
}

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('throws when used outside ToastProvider', () => {
    expect(() => {
      renderHook(() => useToast())
    }).toThrow('useToast must be used within a ToastProvider')
  })

  it('starts with empty toasts array', () => {
    const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })
    expect(result.current.toasts).toEqual([])
  })

  describe('addToast', () => {
    it('adds a toast and returns its id', () => {
      const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })

      let id: string
      act(() => {
        id = result.current.addToast({ type: 'info', message: 'Hello' })
      })

      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0]).toEqual(
        expect.objectContaining({ id: id!, type: 'info', message: 'Hello' })
      )
    })

    it('enforces max 5 toasts by removing oldest first', () => {
      const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })

      act(() => {
        for (let i = 0; i < 6; i++) {
          result.current.addToast({ type: 'info', message: `Toast ${i}` })
        }
      })

      expect(result.current.toasts).toHaveLength(5)
      expect(result.current.toasts[0].message).toBe('Toast 1')
      expect(result.current.toasts[4].message).toBe('Toast 5')
    })
  })

  describe('removeToast', () => {
    it('removes a toast by id', () => {
      const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })

      let id: string
      act(() => {
        id = result.current.addToast({ type: 'info', message: 'Remove me' })
      })

      act(() => {
        result.current.removeToast(id!)
      })

      expect(result.current.toasts).toHaveLength(0)
    })
  })

  describe('auto-dismiss', () => {
    it('removes toast after default 5000ms', () => {
      const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })

      act(() => {
        result.current.addToast({ type: 'info', message: 'Auto dismiss' })
      })

      expect(result.current.toasts).toHaveLength(1)

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.toasts).toHaveLength(0)
    })

    it('uses custom duration when provided', () => {
      const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })

      act(() => {
        result.current.addToast({ type: 'info', message: 'Custom', duration: 2000 })
      })

      act(() => {
        vi.advanceTimersByTime(1999)
      })
      expect(result.current.toasts).toHaveLength(1)

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(result.current.toasts).toHaveLength(0)
    })
  })

  describe('timer cleanup on manual removal', () => {
    it('clears the auto-dismiss timer when toast is manually removed', () => {
      const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })

      let id: string
      act(() => {
        id = result.current.addToast({ type: 'info', message: 'Manual remove', duration: 3000 })
      })

      expect(result.current.toasts).toHaveLength(1)

      act(() => {
        result.current.removeToast(id!)
      })

      expect(result.current.toasts).toHaveLength(0)

      // Fast-forward past the original duration — should stay at 0
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.toasts).toHaveLength(0)
    })
  })

  describe('convenience methods', () => {
    it('success() adds a success toast', () => {
      const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })

      act(() => {
        result.current.success('It worked')
      })

      expect(result.current.toasts[0]).toEqual(
        expect.objectContaining({ type: 'success', message: 'It worked' })
      )
    })

    it('error() adds an error toast with optional retry action', () => {
      const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })
      const retry = vi.fn()

      act(() => {
        result.current.error('Failed', retry)
      })

      const toast = result.current.toasts[0]
      expect(toast.type).toBe('error')
      expect(toast.message).toBe('Failed')
      expect(toast.action).toEqual({ label: 'Retry', onClick: retry })
    })

    it('error() action onClick invokes the retry callback', () => {
      const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })
      const retryFn = vi.fn()

      act(() => {
        result.current.error('Failed', retryFn)
      })

      const toast = result.current.toasts[0]
      expect(toast.action).toBeDefined()

      toast.action!.onClick()

      expect(retryFn).toHaveBeenCalledOnce()
    })

    it('error() works without retry', () => {
      const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })

      act(() => {
        result.current.error('Failed')
      })

      expect(result.current.toasts[0].action).toBeUndefined()
    })

    it('undo() adds an undo toast with action and default 5s duration', () => {
      const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })
      const onUndo = vi.fn()

      act(() => {
        result.current.undo('Deleted item', onUndo)
      })

      const toast = result.current.toasts[0]
      expect(toast.type).toBe('undo')
      expect(toast.message).toBe('Deleted item')
      expect(toast.action).toEqual({ label: 'Undo', onClick: onUndo })

      // Should auto-dismiss after 5s
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(result.current.toasts).toHaveLength(0)
    })

    it('undo() accepts custom duration', () => {
      const { result } = renderHook(() => useToast(), { wrapper: createWrapper() })
      const onUndo = vi.fn()

      act(() => {
        result.current.undo('Deleted', onUndo, 10000)
      })

      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(result.current.toasts).toHaveLength(1)

      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(result.current.toasts).toHaveLength(0)
    })
  })
})
