'use client'

import type { Contact } from '@/lib/types/contact'
import type { ConnectionStageType } from '@/lib/types/enums'
import { StageBadge } from './StageBadge'
import { COLUMNS } from './columns'

interface ContactGridProps {
  contacts: Contact[]
  visibleColumns: string[]
  sortColumn?: string
  sortOrder?: 'asc' | 'desc'
  onSort: (column: string) => void
  onStageChange: (contactId: string, newStage: ConnectionStageType) => void
  isLoading: boolean
}

function getVisibleColumns(visibleColumns: string[]) {
  return COLUMNS.filter(
    (col) => col.fixed || visibleColumns.includes(col.key)
  )
}

function getSortIndicator(
  columnKey: string,
  sortColumn?: string,
  sortOrder?: 'asc' | 'desc'
): string {
  if (columnKey !== sortColumn) return ''
  return sortOrder === 'asc' ? ' ▲' : ' ▼'
}

const CONTACT_FIELD_MAP: Record<string, (c: Contact) => string> = {
  name: (c) => {
    const first = c.first_name ?? ''
    const last = c.last_name ?? ''
    return first ? `${first} ${last}` : last
  },
  company: (c) => c.company ?? '',
  email: (c) => c.email ?? '',
  connection_stage: (c) => c.connection_stage ?? '',
  email_status: (c) => c.email_status ?? '',
  mobile_phone: (c) => c.mobile_phone ?? '',
  social_linkedin: (c) => c.social_linkedin ?? '',
  campaign: (c) => c.campaign ?? '',
  email_confidence: (c) => c.email_confidence ?? '',
  personalized_insert: (c) => c.personalized_insert ?? '',
}

function getCellValue(contact: Contact, columnKey: string): string {
  const accessor = CONTACT_FIELD_MAP[columnKey]
  if (!accessor) return ''
  return accessor(contact)
}

export function ContactGrid({
  contacts,
  visibleColumns,
  sortColumn,
  sortOrder,
  onSort,
  onStageChange,
  isLoading,
}: ContactGridProps) {
  const columns = getVisibleColumns(visibleColumns)

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (contacts.length === 0) {
    return <div>No contacts found</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                onClick={() => onSort(col.key)}
              >
                <span>{col.label}{getSortIndicator(col.key, sortColumn, sortOrder)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {contacts.map((contact) => (
            <tr key={contact.id} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="whitespace-nowrap px-4 py-3 text-sm text-gray-900"
                >
                  {col.key === 'connection_stage' && contact.connection_stage ? (
                    <StageBadge
                      stage={contact.connection_stage}
                      editable={true}
                      onStageChange={(newStage) => onStageChange(contact.id, newStage)}
                    />
                  ) : (
                    getCellValue(contact, col.key)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
