'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

type RetryState = 'idle' | 'loading' | 'success' | 'error'

interface RetryButtonProps {
  readonly onRetry: () => Promise<void>
  readonly maxRetries?: number
}

const DEFAULT_MAX_RETRIES = 3
const BASE_BACKOFF_MS = 1000
const SUCCESS_DISPLAY_MS = 1000

function getBackoffDelay(attempt: number): number {
  return BASE_BACKOFF_MS * Math.pow(2, attempt)
}

export function RetryButton({ onRetry, maxRetries = DEFAULT_MAX_RETRIES }: RetryButtonProps) {
  const [state, setState] = useState<RetryState>('idle')
  const [attemptCount, setAttemptCount] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const executeRetry = useCallback(
    async (attempt: number) => {
      if (!mountedRef.current) return

      setState('loading')

      try {
        await onRetry()
        if (!mountedRef.current) return
        setState('success')
        setAttemptCount(0)
        setTimeout(() => {
          if (mountedRef.current) {
            setState('idle')
          }
        }, SUCCESS_DISPLAY_MS)
      } catch {
        if (!mountedRef.current) return
        const nextAttempt = attempt + 1

        if (nextAttempt >= maxRetries) {
          setState('error')
          setAttemptCount(nextAttempt)
          return
        }

        const delay = getBackoffDelay(attempt)
        setTimeout(() => {
          if (mountedRef.current) {
            executeRetry(nextAttempt)
          }
        }, delay)
      }
    },
    [onRetry, maxRetries]
  )

  const handleClick = useCallback(() => {
    if (state === 'loading') return
    setAttemptCount(0)
    executeRetry(0)
  }, [state, executeRetry])

  const isDisabled = state === 'loading'

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-colors ${getButtonStyles(state)}`}
      aria-label={getAriaLabel(state, attemptCount)}
    >
      {state === 'loading' && <SpinnerIcon />}
      {state === 'success' && <CheckIcon />}
      {getButtonText(state, attemptCount)}
    </button>
  )
}

function getButtonStyles(state: RetryState): string {
  switch (state) {
    case 'idle':
      return 'bg-blue-600 text-white hover:bg-blue-700'
    case 'loading':
      return 'bg-blue-400 text-white cursor-not-allowed'
    case 'success':
      return 'bg-green-600 text-white'
    case 'error':
      return 'bg-red-600 text-white animate-shake'
  }
}

function getButtonText(state: RetryState, attemptCount: number): string {
  switch (state) {
    case 'idle':
      return 'Try Again'
    case 'loading':
      return 'Retrying...'
    case 'success':
      return 'Success!'
    case 'error':
      return `Failed after ${attemptCount} attempt${attemptCount === 1 ? '' : 's'}`
  }
}

function getAriaLabel(state: RetryState, attemptCount: number): string {
  return getButtonText(state, attemptCount)
}

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}
