'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ToastProvider as ToastContextProvider, useToast } from '@/src/ui/hooks/useToast'
import { Toast } from '@/src/ui/components/toast/Toast'

function ToastPortal() {
  const { toasts, removeToast } = useToast()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return createPortal(
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-auto"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>,
    document.body
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastContextProvider>
      {children}
      <ToastPortal />
    </ToastContextProvider>
  )
}
