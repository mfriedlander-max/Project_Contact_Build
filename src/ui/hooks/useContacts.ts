'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Contact } from '@/lib/types/contact'

interface UseContactsOptions {
  stage?: string
  campaignId?: string
  search?: string
  sort?: string
  order?: string
  page?: number
  limit?: number
  filters?: Record<string, string>
}

export function useContacts({
  stage,
  campaignId,
  search,
  sort,
  order,
  page,
  limit,
  filters,
}: UseContactsOptions) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (stage) params.set('stage', stage)
      if (campaignId) params.set('campaignId', campaignId)
      if (search) params.set('search', search)
      if (sort) params.set('sort', sort)
      if (order) params.set('order', order)
      if (page !== undefined) params.set('page', String(page))
      if (limit !== undefined) params.set('limit', String(limit))
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
      setTotal(data.total ?? 0)
      setCurrentPage(data.page ?? 1)
      setTotalPages(data.totalPages ?? 0)
    } catch {
      setError('Failed to fetch contacts')
      setContacts([])
    } finally {
      setIsLoading(false)
    }
  }, [stage, campaignId, search, sort, order, page, limit, filters])

  const updateContactStage = useCallback(async (id: string, newStage: string) => {
    const previousContacts = contacts

    setContacts(
      contacts.map((c) =>
        c.id === id ? { ...c, connection_stage: newStage } : c
      )
    )

    try {
      const res = await fetch(`/api/crm/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_stage: newStage }),
      })

      if (!res.ok) {
        setContacts(previousContacts)
        setError('Failed to update contact stage')
      }
    } catch {
      setContacts(previousContacts)
      setError('Failed to update contact stage')
    }
  }, [contacts])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  return {
    contacts,
    total,
    page: currentPage,
    totalPages,
    isLoading,
    error,
    refetch: fetchContacts,
    updateContactStage,
  }
}
