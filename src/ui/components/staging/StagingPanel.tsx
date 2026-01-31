'use client'

import { useState } from 'react'
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  if (contacts.length === 0) {
    return null
  }

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)))
    }
  }

  const handleApprove = () => {
    const selectedArray = Array.from(selectedIds)
    if (selectedArray.length > 0) {
      onApprove(selectedArray)
      setSelectedIds(new Set())
    }
  }

  const allSelected = contacts.length > 0 && selectedIds.size === contacts.length

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white">
      <StagingHeader
        query={query}
        count={contacts.length}
        selectedCount={selectedIds.size}
        onApprove={handleApprove}
        onClear={onClear}
        onSelectAll={handleSelectAll}
        allSelected={allSelected}
      />
      <div className="max-h-80 overflow-y-auto">
        {contacts.map((contact) => (
          <StagingRow
            key={contact.id}
            contact={contact}
            onDelete={onDeleteRow}
            selected={selectedIds.has(contact.id)}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  )
}
