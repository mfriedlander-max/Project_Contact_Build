'use client'

import { useState, useEffect, useCallback } from 'react'

interface SavedView {
  id: string
  name: string
  filters: Record<string, unknown>
  sort?: Record<string, string>
  columns?: string[]
  isDefault?: boolean
  [key: string]: unknown
}

interface CreateViewData {
  name: string
  filters?: Record<string, unknown>
  sort?: Record<string, string>
  columns?: string[]
}

export function useSavedViews() {
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSavedViews = useCallback(async () => {
    setIsLoading(true)
    setError(null)
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
  }, [])

  useEffect(() => {
    fetchSavedViews()
  }, [fetchSavedViews])

  const createView = useCallback(async (data: CreateViewData) => {
    setError(null)
    try {
      const res = await fetch('/api/saved-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        setError('Failed to create saved view')
        return
      }
      const result = await res.json()
      setSavedViews((prev) => [...prev, result.savedView])
    } catch {
      setError('Failed to create saved view')
    }
  }, [])

  const updateView = useCallback(async (id: string, data: Partial<SavedView>) => {
    setError(null)
    try {
      const res = await fetch('/api/saved-views', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      })
      if (!res.ok) {
        setError('Failed to update saved view')
        return
      }
      const result = await res.json()
      setSavedViews((prev) =>
        prev.map((view) => (view.id === id ? result.savedView : view))
      )
    } catch {
      setError('Failed to update saved view')
    }
  }, [])

  const deleteView = useCallback(async (id: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/saved-views?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        setError('Failed to delete saved view')
        return
      }
      setSavedViews((prev) => prev.filter((view) => view.id !== id))
    } catch {
      setError('Failed to delete saved view')
    }
  }, [])

  return {
    savedViews,
    isLoading,
    error,
    createView,
    updateView,
    deleteView,
    refetch: fetchSavedViews,
  }
}
