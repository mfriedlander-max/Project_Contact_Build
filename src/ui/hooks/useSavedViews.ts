'use client'

import { useState, useEffect } from 'react'

interface SavedView {
  id: string
  name: string
  filters: Record<string, unknown>
  isDefault?: boolean
  [key: string]: unknown
}

export function useSavedViews() {
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSavedViews = async () => {
      try {
        const res = await fetch('/api/saved-views', { method: 'GET' })
        if (!res.ok) {
          setError('Failed to fetch saved views')
          setSavedViews([])
          return
        }
        const data = await res.json()
        setSavedViews(data.savedViews ?? [])
      } catch {
        setError('Failed to fetch saved views')
        setSavedViews([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchSavedViews()
  }, [])

  return { savedViews, isLoading, error }
}
