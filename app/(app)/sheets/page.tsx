'use client'

import { useState, useMemo } from 'react'
import { ContactList } from '@/src/ui/components/contacts/ContactList'
import { ConnectionStage, CONNECTION_STAGE_ORDER, type ConnectionStageType } from '@/lib/types/enums'
import { useContacts } from '@/src/ui/hooks/useContacts'
import { useSavedViews } from '@/src/ui/hooks/useSavedViews'

const STAGE_LABELS: Record<ConnectionStageType, string> = {
  [ConnectionStage.DRAFTED]: 'Drafted',
  [ConnectionStage.MESSAGE_SENT]: 'Message Sent',
  [ConnectionStage.DIDNT_CONNECT]: "Didn't Connect",
  [ConnectionStage.CONNECTED]: 'Connected',
  [ConnectionStage.IN_TOUCH]: 'In Touch',
}

export default function SheetsPage() {
  const [activeStage, setActiveStage] = useState<ConnectionStageType>(ConnectionStage.DRAFTED)
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)

  const { savedViews } = useSavedViews()
  const selectedView = savedViews.find((v) => v.id === selectedViewId)
  const filters = selectedView?.filters as Record<string, string> | undefined

  const { contacts, isLoading, error } = useContacts({
    stage: activeStage,
    filters,
  })

  const contactItems = useMemo(() =>
    contacts.map((contact) => ({
      contact,
      stage: activeStage,
    })),
    [contacts, activeStage]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sheets</h1>

        {savedViews.length > 0 && (
          <select
            aria-label="Saved views"
            value={selectedViewId ?? ''}
            onChange={(e) => setSelectedViewId(e.target.value || null)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Contacts</option>
            {savedViews.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mb-4 flex gap-1 border-b border-gray-200" role="tablist" aria-label="Connection stages">
        {CONNECTION_STAGE_ORDER.map((stage) => (
          <button
            key={stage}
            role="tab"
            aria-selected={activeStage === stage}
            onClick={() => setActiveStage(stage)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeStage === stage
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {STAGE_LABELS[stage]}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          Loading contacts...
        </div>
      ) : (
        <ContactList items={contactItems} />
      )}
    </div>
  )
}
