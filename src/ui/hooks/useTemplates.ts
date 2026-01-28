'use client'

import { useState, useEffect, useCallback } from 'react'

interface Template {
  id: string
  name: string
  subject?: string
  body?: string
  isDefault?: boolean
  [key: string]: unknown
}

interface CreateTemplatePayload {
  name: string
  subject: string
  body: string
  isDefault?: boolean
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/templates', { method: 'GET' })
        if (!res.ok) {
          setError('Failed to fetch templates')
          return
        }
        const data = await res.json()
        setTemplates(data.templates ?? [])
      } catch {
        setError('Failed to fetch templates')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplates()
  }, [])

  const createTemplate = useCallback(async (payload: CreateTemplatePayload) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        setError('Failed to create template')
        return
      }

      const data = await res.json()
      setTemplates((prev) => [...prev, data.template])
    } catch {
      setError('Failed to create template')
    }
  }, [])

  const deleteTemplate = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/templates?id=${id}`, { method: 'DELETE' })

      if (!res.ok) {
        setError('Failed to delete template')
        return
      }

      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch {
      setError('Failed to delete template')
    }
  }, [])

  return { templates, isLoading, error, createTemplate, deleteTemplate }
}
