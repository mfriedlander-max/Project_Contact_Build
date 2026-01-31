'use client'

import type { StagedContact } from './types'

interface StagingRowProps {
  contact: StagedContact
  onDelete: (id: string) => void
  selected: boolean
  onToggle: (id: string) => void
}

export function StagingRow({ contact, onDelete, selected, onToggle }: StagingRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2 text-sm">
      <div className="flex flex-1 items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(contact.id)}
          aria-label={`Select ${contact.name}`}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
        />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-900">{contact.name}</span>
            <span className="text-gray-600">{contact.company}</span>
            {contact.position && <span className="text-gray-500 text-xs">{contact.position}</span>}
          </div>
          {contact.summary && <p className="text-xs text-gray-500">{contact.summary}</p>}
        </div>
      </div>
      <button
        onClick={() => onDelete(contact.id)}
        aria-label={`Delete ${contact.name}`}
        className="ml-2 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
      >
        Delete
      </button>
    </div>
  )
}
