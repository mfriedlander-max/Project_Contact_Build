'use client'

import type { StagedContact } from './types'

interface StagingRowProps {
  contact: StagedContact
  onDelete: (id: string) => void
}

export function StagingRow({ contact, onDelete }: StagingRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 text-sm">
      <div className="flex flex-1 gap-4">
        <span className="font-medium text-gray-900">{contact.name}</span>
        <span className="text-gray-600">{contact.company}</span>
        <span className="text-gray-500">{contact.email}</span>
      </div>
      <button
        onClick={() => onDelete(contact.id)}
        aria-label={`Delete ${contact.name}`}
        className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  )
}
