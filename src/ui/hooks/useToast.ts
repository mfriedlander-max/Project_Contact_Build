'use client'

import { createContext, useContext, useCallback, useRef, useState, useEffect, useMemo } from 'react'
import React from 'react'

const DEFAULT_DURATION = 5000
const MAX_TOASTS = 5

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info' | 'undo'
  message: string
  duration?: number
  action?: { label: string; onClick: () => void }
}

export interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  success: (message: string) => void
  error: (message: string, retry?: () => void) => void
  undo: (message: string, onUndo: () => void, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const nextIdRef = useRef(0)

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>): string => {
      nextIdRef.current += 1
      const id = `toast-${nextIdRef.current}`
      const duration = toast.duration ?? DEFAULT_DURATION
      const newToast: Toast = { ...toast, id, duration }

      setToasts((prev) => {
        const updated = [...prev, newToast]
        if (updated.length > MAX_TOASTS) {
          const removed = updated.slice(0, updated.length - MAX_TOASTS)
          removed.forEach((r) => {
            const timer = timersRef.current.get(r.id)
            if (timer) {
              clearTimeout(timer)
              timersRef.current.delete(r.id)
            }
          })
          return updated.slice(updated.length - MAX_TOASTS)
        }
        return updated
      })

      const timer = setTimeout(() => {
        timersRef.current.delete(id)
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, duration)
      timersRef.current.set(id, timer)

      return id
    },
    []
  )

  const success = useCallback(
    (message: string) => {
      addToast({ type: 'success', message })
    },
    [addToast]
  )

  const error = useCallback(
    (message: string, retry?: () => void) => {
      addToast({
        type: 'error',
        message,
        action: retry ? { label: 'Retry', onClick: retry } : undefined,
      })
    },
    [addToast]
  )

  const undo = useCallback(
    (message: string, onUndo: () => void, duration?: number) => {
      addToast({
        type: 'undo',
        message,
        duration: duration ?? DEFAULT_DURATION,
        action: { label: 'Undo', onClick: onUndo },
      })
    },
    [addToast]
  )

  const value = useMemo<ToastContextValue>(() => ({
    toasts,
    addToast,
    removeToast,
    success,
    error,
    undo,
  }), [toasts, addToast, removeToast, success, error, undo])

  return React.createElement(ToastContext.Provider, { value }, children)
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

export { ToastContext }
