'use client'

import { useState } from 'react'
import { ModeSwitch } from '@/src/ui/components/ModeSwitch'
import { ChatPanel } from '@/src/ui/components/chat/ChatPanel'
import { ChatProvider } from '@/src/ui/components/chat/ChatContext'
import { StagingPanel } from '@/src/ui/components/staging/StagingPanel'
import type { StagedContact } from '@/src/ui/components/staging/types'
import type { AiModeType } from '@/lib/types/enums'

export default function HomePage() {
  const [mode, setMode] = useState<AiModeType | undefined>(undefined)
  const [stagedContacts, setStagedContacts] = useState<StagedContact[]>([])
  const [stagingQuery, setStagingQuery] = useState('')

  const handleModeChange = (newMode: AiModeType) => {
    setMode(newMode)
  }

  const handleApprove = (_contactIds: string[]) => {
    setStagedContacts([])
    setStagingQuery('')
  }

  const handleClearStaging = () => {
    setStagedContacts([])
    setStagingQuery('')
  }

  const handleDeleteStagedRow = (id: string) => {
    setStagedContacts((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-4 py-3">
        <ModeSwitch onChange={handleModeChange} />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <ChatProvider>
            <ChatPanel />
          </ChatProvider>
        </div>
        {stagedContacts.length > 0 && (
          <div className="w-96 border-l border-gray-200 p-4">
            <StagingPanel
              contacts={stagedContacts}
              query={stagingQuery}
              onApprove={handleApprove}
              onClear={handleClearStaging}
              onDeleteRow={handleDeleteStagedRow}
            />
          </div>
        )}
      </div>
    </div>
  )
}
