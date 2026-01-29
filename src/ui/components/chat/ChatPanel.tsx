'use client'

import { useChatContext } from './ChatContext'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'

export function ChatPanel() {
  const { messages, isLoading, sendMessage } = useChatContext()

  return (
    <div className="flex h-full flex-col">
      <div role="log" aria-label="Chat messages" className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            <p>Start a conversation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  )
}
