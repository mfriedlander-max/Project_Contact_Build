'use client'

import { useState, useCallback } from 'react'
import type { AiModeType } from '@/lib/types/enums'
import type { StagedContact } from '@/src/ui/components/staging/types'
import type { ChatAction } from '@/src/ui/components/chat/ChatContext'

interface ChatResponse {
  reply: string
  actions?: ChatAction[]
  stagedContacts?: StagedContact[]
}

export function useChatApi() {
  const [stagedContacts, setStagedContacts] = useState<StagedContact[]>([])
  const [stagingQuery, setStagingQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (message: string, mode: AiModeType): Promise<ChatResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, mode }),
      })

      if (!res.ok) {
        const errorMsg = 'Chat request failed'
        setError(errorMsg)
        return { reply: 'AI endpoint not yet connected', actions: [] }
      }

      const data: ChatResponse = await res.json()

      if (data.stagedContacts && data.stagedContacts.length > 0) {
        setStagedContacts(data.stagedContacts)
        setStagingQuery(message)
      }

      return data
    } catch {
      const errorMsg = 'AI endpoint not yet connected'
      setError(errorMsg)
      return { reply: errorMsg, actions: [] }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const approveStaged = useCallback(async (campaignName: string, keptContactIds: string[]) => {
    try {
      await fetch('/api/staging/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignName, keptContactIds }),
      })
      setStagedContacts([])
      setStagingQuery('')
    } catch {
      setError('Failed to approve staged contacts')
    }
  }, [])

  const deleteStagedRow = useCallback(async (id: string) => {
    try {
      await fetch(`/api/staging/${id}`, { method: 'DELETE' })
      setStagedContacts((prev) => prev.filter((c) => c.id !== id))
    } catch {
      setError('Failed to delete staged contact')
    }
  }, [])

  const clearStaging = useCallback(() => {
    setStagedContacts([])
    setStagingQuery('')
  }, [])

  return {
    stagedContacts,
    stagingQuery,
    isLoading,
    error,
    sendMessage,
    approveStaged,
    deleteStagedRow,
    clearStaging,
  }
}
