'use client'

import { StagingHeader } from './StagingHeader'
import { StagingRow } from './StagingRow'
import type { StagedContact } from './types'

interface StagingPanelProps {
  contacts: readonly StagedContact[]
  query: string
  onApprove: (contactIds: string[]) => void
  onClear: () => void
  onDeleteRow: (id: string) => void
}

export function StagingPanel({ contacts, query, onApprove, onClear, onDeleteRow }: StagingPanelProps) {
  if (contacts.length === 0) {
    return null
  }

  const handleApprove = () => {
    onApprove(contacts.map((c) => c.id))
  }

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white">
      <StagingHeader query={query} count={contacts.length} onApprove={handleApprove} onClear={onClear} />
      <div className="max-h-80 overflow-y-auto">
        {contacts.map((contact) => (
          <StagingRow key={contact.id} contact={contact} onDelete={onDeleteRow} />
        ))}
      </div>
    </div>
  )
}
