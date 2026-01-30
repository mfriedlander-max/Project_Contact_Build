'use client'

import type { ContactCreateInput, ValidationError } from '@/src/server/services/uploadParser'

interface UploadPreviewProps {
  contacts: ContactCreateInput[]
  errors: ValidationError[]
  onImport: () => void
  onBack: () => void
  isImporting?: boolean
}

const PREVIEW_COLUMNS = [
  { key: 'last_name', label: 'Last Name' },
  { key: 'first_name', label: 'First Name' },
  { key: 'email', label: 'Email' },
  { key: 'company', label: 'Company' },
  { key: 'position', label: 'Position' },
] as const

const MAX_PREVIEW_ROWS = 10

function pluralize(count: number, singular: string): string {
  return count === 1 ? `${count} ${singular}` : `${count} ${singular}s`
}

export function UploadPreview({
  contacts,
  errors,
  onImport,
  onBack,
  isImporting = false,
}: UploadPreviewProps) {
  const previewRows = contacts.slice(0, MAX_PREVIEW_ROWS)
  const errorRowSet = new Set(errors.map((e) => e.row))
  const hasValidContacts = contacts.length > 0
  const isDisabled = !hasValidContacts || isImporting

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-700">
          {pluralize(contacts.length, 'contact')} ready to import
          {errors.length > 0 && (
            <span className="ml-1 text-red-600">
              , {pluralize(errors.length, 'error')}
            </span>
          )}
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                #
              </th>
              {PREVIEW_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {previewRows.map((contact, index) => {
              const hasError = errorRowSet.has(index)
              return (
                <tr
                  key={index}
                  className={hasError ? 'bg-red-50' : ''}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-gray-400">
                    {index + 1}
                  </td>
                  {PREVIEW_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`whitespace-nowrap px-3 py-2 ${
                        hasError ? 'text-red-700' : 'text-gray-900'
                      }`}
                    >
                      {String(contact[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {errors.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="mb-2 text-sm font-medium text-red-800">Validation Errors</p>
          <ul className="space-y-1">
            {errors.map((error, i) => (
              <li key={i} className="text-sm text-red-700">
                {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onImport}
          disabled={isDisabled}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isImporting ? 'Importing...' : 'Import'}
        </button>
      </div>
    </div>
  )
}
