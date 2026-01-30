'use client'

import type { Contact } from '@/lib/types/contact'
import type { ConnectionStageType } from '@/lib/types/enums'

const COLUMNS = [
  { key: 'name', label: 'Name', fixed: true },
  { key: 'company', label: 'Company', fixed: false },
  { key: 'email', label: 'Email', fixed: true },
  { key: 'connection_stage', label: 'Stage', fixed: true },
  { key: 'email_status', label: 'Email Status', fixed: false },
  { key: 'mobile_phone', label: 'Phone', fixed: false },
  { key: 'social_linkedin', label: 'LinkedIn', fixed: false },
  { key: 'campaign', label: 'Campaign', fixed: false },
  { key: 'email_confidence', label: 'Confidence', fixed: false },
  { key: 'personalized_insert', label: 'Insert Preview', fixed: false },
] as const

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

function getCellValue(contact: Contact, columnKey: string): string {
  if (columnKey === 'name') {
    const first = contact.first_name ?? ''
    const last = contact.last_name ?? ''
    return first ? `${first} ${last}` : last
  }

  const value = (contact as Record<string, unknown>)[columnKey]
  if (value == null) return ''
  return String(value)
}

export function ContactGrid({
  contacts,
  visibleColumns,
  sortColumn,
  sortOrder,
  onSort,
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
                <span>{col.label}</span>
                {getSortIndicator(col.key, sortColumn, sortOrder) && (
                  <span>{getSortIndicator(col.key, sortColumn, sortOrder)}</span>
                )}
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
                  {getCellValue(contact, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
