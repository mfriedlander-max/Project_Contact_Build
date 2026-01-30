'use client'

import type { Toast as ToastType } from '@/src/ui/hooks/useToast'

const VARIANT_CONFIG = {
  success: {
    container: 'border-green-500 bg-green-50 text-green-900',
    progressBar: 'bg-green-500',
  },
  error: {
    container: 'border-red-500 bg-red-50 text-red-900',
    progressBar: 'bg-red-500',
  },
  warning: {
    container: 'border-yellow-500 bg-yellow-50 text-yellow-900',
    progressBar: 'bg-yellow-500',
  },
  info: {
    container: 'border-blue-500 bg-blue-50 text-blue-900',
    progressBar: 'bg-blue-500',
  },
  undo: {
    container: 'border-gray-500 bg-gray-50 text-gray-900',
    progressBar: 'bg-gray-500',
  },
} as const

export interface ToastProps {
  toast: ToastType
  onClose: (id: string) => void
}

export function Toast({ toast, onClose }: ToastProps) {
  const variant = VARIANT_CONFIG[toast.type]
  const duration = toast.duration ?? 5000

  return (
    <div
      data-variant={toast.type}
      className={`relative overflow-hidden rounded-lg border shadow-lg ${variant.container} animate-slide-in-right min-w-[320px] max-w-[420px]`}
      role="alert"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm font-medium">{toast.message}</p>
        <div className="flex items-center gap-2 shrink-0">
          {toast.action && (
            <button
              type="button"
              onClick={toast.action.onClick}
              className="text-sm font-semibold underline hover:no-underline"
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => onClose(toast.id)}
            aria-label="Close"
            className="rounded p-0.5 hover:bg-black/10 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div
        role="progressbar"
        className={`absolute bottom-0 left-0 h-1 ${variant.progressBar}`}
        style={{
          animation: `shrink-width ${duration}ms linear forwards`,
          width: '100%',
        }}
      />
    </div>
  )
}
