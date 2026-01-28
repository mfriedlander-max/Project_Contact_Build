'use client'

import { useState, useEffect, useCallback } from 'react'

interface Integration {
  provider: string
  isActive: boolean
  [key: string]: unknown
}

interface SaveIntegrationPayload {
  provider: string
  accessToken?: string
  isActive?: boolean
  [key: string]: unknown
}

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const res = await fetch('/api/integrations', { method: 'GET' })
        if (!res.ok) {
          setError('Failed to fetch integrations')
          return
        }
        const data = await res.json()
        setIntegrations(data.integrations ?? [])
      } catch {
        setError('Failed to fetch integrations')
      } finally {
        setIsLoading(false)
      }
    }

    fetchIntegrations()
  }, [])

  const saveIntegration = useCallback(async (payload: SaveIntegrationPayload) => {
    try {
      const res = await fetch('/api/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        setError('Failed to save integration')
        return
      }

      const data = await res.json()
      setIntegrations((prev) => {
        const filtered = prev.filter((i) => i.provider !== payload.provider)
        return [...filtered, data.integration]
      })
    } catch {
      setError('Failed to save integration')
    }
  }, [])

  const isConnected = useCallback((provider: string): boolean => {
    return integrations.some((i) => i.provider === provider && i.isActive)
  }, [integrations])

  return { integrations, isLoading, error, saveIntegration, isConnected }
}
