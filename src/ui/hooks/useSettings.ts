'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Settings {
  defaultAiMode?: string
  hunterApiKey?: string | null
  defaultTemplateId?: string | null
  emailSignature?: string | null
  autoSaveInterval?: number
  notificationsEnabled?: boolean
  availabilityBlock?: string | null
  autoRunEmailFinding?: boolean
  autoRunInserts?: boolean
  autoRunDrafts?: boolean
  didntConnectEnabled?: boolean
  didntConnectDays?: number
  [key: string]: unknown
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings', { method: 'GET' })
        if (!res.ok) {
          setError('Failed to fetch settings')
          return
        }
        const data = await res.json()
        setSettings(data.settings)
      } catch {
        setError('Failed to fetch settings')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    const previousSettings = settingsRef.current
    setSettings((prev) => (prev ? { ...prev, ...updates } : { ...updates }))
    setError(null)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        setSettings(previousSettings)
        setError('Failed to update settings')
        return
      }

      const data = await res.json()
      setSettings(data.settings)
    } catch {
      setSettings(previousSettings)
      setError('Failed to update settings')
    }
  }, [])

  return { settings, isLoading, error, updateSettings }
}
