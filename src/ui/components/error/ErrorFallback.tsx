'use client'

import { useState } from 'react'

interface ErrorFallbackProps {
  readonly error: Error
  readonly resetErrorBoundary: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false)
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
      <p className="text-sm text-gray-500">
        An unexpected error occurred. Please try again or return home.
      </p>

      {isDev && (
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="text-xs text-gray-400 underline"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
          {showDetails && (
            <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-left text-xs text-red-600">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={resetErrorBoundary}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Try Again
        </button>
        <a
          href="/"
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Go Home
        </a>
      </div>
    </div>
  )
}
