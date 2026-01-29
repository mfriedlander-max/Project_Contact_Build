'use client'

import type { Contact } from '@/lib/types/contact'
import type { ConnectionStageType } from '@/lib/types/enums'
import { StageBadge } from './StageBadge'

interface ContactCardProps {
  contact: Contact
  stage: ConnectionStageType
}

function formatName(contact: Contact): string {
  const parts = [contact.first_name, contact.last_name].filter(Boolean)
  return parts.join(' ')
}

export function ContactCard({ contact, stage }: ContactCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-gray-900">{formatName(contact)}</span>
            <StageBadge stage={stage} />
          </div>
          {contact.company && (
            <p className="mt-0.5 text-xs text-gray-600">{contact.company}</p>
          )}
          {contact.email && (
            <p className="mt-0.5 text-xs text-gray-500">{contact.email}</p>
          )}
        </div>
        {contact.email_confidence && (
          <span className="text-xs text-gray-400">
            {contact.email_confidence.charAt(0) + contact.email_confidence.slice(1).toLowerCase()}
          </span>
        )}
      </div>
    </div>
  )
}
