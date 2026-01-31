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

async function readSSEStream(body: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!body) return ''

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let accumulated = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue

        const data = line.slice(6)
        if (data === '[DONE]') return accumulated

        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'text') {
            accumulated += parsed.text
          } else if (parsed.type === 'error') {
            throw new Error(parsed.error)
          }
        } catch (err) {
          if (err instanceof Error) throw err
        }
      }
    }

    return accumulated
  } finally {
    reader.releaseLock()
  }
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

      const contentType = res.headers.get('Content-Type')

      if (contentType?.includes('text/event-stream')) {
        try {
          const reply = await readSSEStream(res.body)
          return { reply, actions: [] }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Stream failed'
          setError(errorMsg)
          return { reply: '', actions: [] }
        }
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
