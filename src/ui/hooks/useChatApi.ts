'use client'

import { useState, useCallback } from 'react'
import { AiMode } from '@/lib/types/enums'
import type { AiModeType } from '@/lib/types/enums'
import type { StagedContact } from '@/src/ui/components/staging/types'
import type { ChatAction } from '@/src/ui/components/chat/ChatContext'

interface ChatResponse {
  reply: string
  actions?: ChatAction[]
  stagedContacts?: StagedContact[]
}

interface PendingConfirmation {
  actionType: string
  payload: unknown
  message: string
  lastMessage: string
}

interface SSEEvent {
  type: 'text' | 'tool_result' | 'confirmation_required' | 'tool_error' | 'error'
  text?: string
  tool?: string
  result?: unknown
  message?: string
  actionType?: string
  payload?: unknown
  error?: string
}

interface StreamCallbacks {
  onText: (text: string) => void
  onToolResult: (tool: string, result: unknown) => void
  onConfirmationRequired: (message: string, actionType: string, payload: unknown) => void
  onToolError: (tool: string, error: string) => void
  onError: (error: string) => void
}

async function readSSEStream(
  body: ReadableStream<Uint8Array> | null,
  callbacks: StreamCallbacks
): Promise<string> {
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
          const parsed: SSEEvent = JSON.parse(data)

          switch (parsed.type) {
            case 'text':
              if (parsed.text) {
                accumulated += parsed.text
                callbacks.onText(parsed.text)
              }
              break
            case 'tool_result':
              if (parsed.tool && parsed.result !== undefined) {
                callbacks.onToolResult(parsed.tool, parsed.result)
              }
              break
            case 'confirmation_required':
              if (parsed.message && parsed.actionType && parsed.payload !== undefined) {
                callbacks.onConfirmationRequired(parsed.message, parsed.actionType, parsed.payload)
              }
              break
            case 'tool_error':
              if (parsed.tool && parsed.error) {
                callbacks.onToolError(parsed.tool, parsed.error)
              }
              break
            case 'error':
              if (parsed.error) {
                callbacks.onError(parsed.error)
              }
              break
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
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const sendMessage = useCallback(
    async (
      message: string,
      mode: AiModeType,
      confirmationData?: {
        userConfirmed: boolean
        actionType: string
        payload: unknown
      }
    ): Promise<ChatResponse> => {
      setIsLoading(true)
      setError(null)

      try {
        const body = {
          message,
          mode,
          ...confirmationData,
        }

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const errorMsg = 'Chat request failed'
          setError(errorMsg)
          return { reply: 'AI endpoint not yet connected', actions: [] }
        }

        const contentType = res.headers.get('Content-Type')

        if (contentType?.includes('text/event-stream')) {
          try {
            const reply = await readSSEStream(res.body, {
              onText: () => {
                // Text is accumulated in the stream
              },
              onToolResult: (tool, result) => {
                // Update staged contacts from tool result
                if (tool === 'find_contacts' && Array.isArray(result)) {
                  setStagedContacts(result as StagedContact[])
                  setStagingQuery(message)
                }
              },
              onConfirmationRequired: (confirmMessage, actionType, payload) => {
                setPendingConfirmation({
                  message: confirmMessage,
                  actionType,
                  payload,
                  lastMessage: message,
                })
                setShowConfirmDialog(true)
              },
              onToolError: (tool, errorMsg) => {
                setError(`${tool}: ${errorMsg}`)
              },
              onError: (errorMsg) => {
                setError(errorMsg)
              },
            })
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
    },
    []
  )

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

  const handleConfirm = useCallback(async () => {
    if (!pendingConfirmation) return

    setShowConfirmDialog(false)

    // Re-send with confirmation
    const mode = AiMode.GENERAL_MANAGER // Default mode for confirmations
    await sendMessage(pendingConfirmation.lastMessage, mode, {
      userConfirmed: true,
      actionType: pendingConfirmation.actionType,
      payload: pendingConfirmation.payload,
    })

    setPendingConfirmation(null)
  }, [pendingConfirmation, sendMessage])

  const handleCancel = useCallback(() => {
    setShowConfirmDialog(false)
    setPendingConfirmation(null)
  }, [])

  return {
    stagedContacts,
    stagingQuery,
    isLoading,
    error,
    pendingConfirmation,
    showConfirmDialog,
    sendMessage,
    approveStaged,
    deleteStagedRow,
    clearStaging,
    handleConfirm,
    handleCancel,
  }
}
