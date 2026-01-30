'use client'

import { useEffect } from 'react'
import { useToast } from '@/src/ui/hooks/useToast'

const DISMISS_DELAY_MS = 5000

interface UndoToastProps {
  message: string
  onUndo: () => void
  onDismiss: () => void
}

export function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  const { undo } = useToast()

  useEffect(() => {
    undo(message, onUndo, DISMISS_DELAY_MS)
  }, [message, onUndo, undo])

  useEffect(() => {
    const timer = setTimeout(onDismiss, DISMISS_DELAY_MS)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return null
}
