'use client'

import type { Contact } from '@/lib/types/contact'
import type { ConnectionStageType } from '@/lib/types/enums'
import { ContactCard } from './ContactCard'

interface ContactListItem {
  contact: Contact
  stage: ConnectionStageType
}

interface ContactListProps {
  items: readonly ContactListItem[]
}

export function ContactList({ items }: ContactListProps) {
  if (items.length === 0) {
    return (
      <div className="overflow-y-auto p-4 text-center text-sm text-gray-400">
        No contacts found
      </div>
    )
  }

  return (
    <div className="overflow-y-auto space-y-2 p-2">
      {items.map((item) => (
        <ContactCard
          key={item.contact.id}
          contact={item.contact}
          stage={item.stage}
        />
      ))}
    </div>
  )
}
