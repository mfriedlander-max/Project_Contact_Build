'use client'

import { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from 'react'

export interface ChatAction {
  label: string
  actionId: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  actions?: ChatAction[]
}

interface ChatContextValue {
  messages: readonly ChatMessage[]
  isLoading: boolean
  sendMessage: (content: string) => void
  clearMessages: () => void
  addAssistantMessage: (content: string, actions?: ChatAction[]) => void
  setLoading: (loading: boolean) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

interface ChatProviderProps {
  children: ReactNode
  onSendMessage?: (content: string) => void
}

export function ChatProvider({ children, onSendMessage }: ChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const counterRef = useRef(0)

  const generateId = useCallback((): string => {
    counterRef.current += 1
    return `msg-${Date.now()}-${counterRef.current}`
  }, [])

  const sendMessage = useCallback(
    (content: string) => {
      const newMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, newMessage])
      onSendMessage?.(content)
    },
    [onSendMessage, generateId]
  )

  const addAssistantMessage = useCallback((content: string, actions?: ChatAction[]) => {
    const newMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      actions,
    }
    setMessages((prev) => [...prev, newMessage])
  }, [generateId])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
  }, [])

  const value = useMemo<ChatContextValue>(() => ({
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    addAssistantMessage,
    setLoading,
  }), [messages, isLoading, sendMessage, clearMessages, addAssistantMessage, setLoading])

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
