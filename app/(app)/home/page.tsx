'use client'

import { useCallback } from 'react'
import { ChatPanel } from '@/src/ui/components/chat/ChatPanel'
import { ChatProvider, useChatContext } from '@/src/ui/components/chat/ChatContext'
import { StagingPanel } from '@/src/ui/components/staging/StagingPanel'
import { useChatApi } from '@/src/ui/hooks/useChatApi'
import { AiMode, type AiModeType } from '@/lib/types/enums'

function HomeContent() {
  const { addAssistantMessage, setLoading } = useChatContext()
  const {
    stagedContacts,
    stagingQuery,
    sendMessage,
    approveStaged,
    deleteStagedRow,
    clearStaging,
  } = useChatApi()

  const handleSendMessage = useCallback(async (content: string) => {
    setLoading(true)
    try {
      const storedMode = localStorage.getItem('aiMode')
      const mode: AiModeType = (storedMode && Object.values(AiMode).includes(storedMode as AiModeType))
        ? (storedMode as AiModeType)
        : AiMode.CONTACT_FINDER

      const response = await sendMessage(content, mode)
      addAssistantMessage(response.reply, response.actions)
    } finally {
      setLoading(false)
    }
  }, [sendMessage, addAssistantMessage, setLoading])

  const handleApprove = useCallback(async (contactIds: string[]) => {
    await approveStaged('New Campaign', contactIds)
  }, [approveStaged])

  return (
    <ChatProvider onSendMessage={handleSendMessage}>
      <div className="flex h-full flex-col">
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1">
            <ChatPanel />
          </div>
          {stagedContacts.length > 0 && (
            <div className="w-96 border-l border-gray-200 p-4">
              <StagingPanel
                contacts={stagedContacts}
                query={stagingQuery}
                onApprove={handleApprove}
                onClear={clearStaging}
                onDeleteRow={deleteStagedRow}
              />
            </div>
          )}
        </div>
      </div>
    </ChatProvider>
  )
}

export default function HomePage() {
  return <HomeContent />
}
