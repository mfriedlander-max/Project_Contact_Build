'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Contact } from '@/lib/types/contact'

interface UseContactsOptions {
  stage?: string
  filters?: Record<string, string>
}

export function useContacts({ stage, filters }: UseContactsOptions) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (stage) params.set('stage', stage)
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          params.set(key, value)
        })
      }

      const res = await fetch(`/api/crm/contacts?${params.toString()}`, { method: 'GET' })

      if (!res.ok) {
        setError('Failed to fetch contacts')
        setContacts([])
        return
      }

      const data = await res.json()
      setContacts(data.contacts ?? [])
    } catch {
      setError('Failed to fetch contacts')
      setContacts([])
    } finally {
      setIsLoading(false)
    }
  }, [stage, filters])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return { contacts, isLoading, error, refetch: fetchContacts }
}
