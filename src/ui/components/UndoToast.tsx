'use client'

import { useEffect, useState } from 'react'

const DISMISS_DELAY_MS = 5000
const PROGRESS_INTERVAL_MS = 50

interface UndoToastProps {
  message: string
  onUndo: () => void
  onDismiss: () => void
}

export function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const timer = setTimeout(onDismiss, DISMISS_DELAY_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev - (PROGRESS_INTERVAL_MS / DISMISS_DELAY_MS) * 100
        return next > 0 ? next : 0
      })
    }, PROGRESS_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative flex items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-white shadow-lg">
      <span className="text-sm">{message}</span>
      <button
        onClick={onUndo}
        className="rounded px-2 py-1 text-sm font-medium text-blue-300 hover:text-blue-200"
      >
        Undo
      </button>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="absolute bottom-0 left-0 h-1 w-full overflow-hidden rounded-b-lg"
      >
        <div
          className="h-full bg-blue-400 transition-[width] duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
