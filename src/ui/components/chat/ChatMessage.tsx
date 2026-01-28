'use client'

import type { ChatMessage as ChatMessageType } from './ChatContext'

interface ChatMessageProps {
  message: ChatMessageType
  onAction?: (actionId: string) => void
}

function renderMarkdown(text: string): JSX.Element {
  // Simple bold markdown: **text** -> <strong>text</strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export function ChatMessage({ message, onAction }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="text-sm">
          {isUser ? message.content : renderMarkdown(message.content)}
        </div>
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 flex gap-2">
            {message.actions.map((action) => (
              <button
                key={action.actionId}
                onClick={() => onAction?.(action.actionId)}
                className="rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
