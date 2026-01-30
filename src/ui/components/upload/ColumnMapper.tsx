'use client'

import { useState, useEffect } from 'react'
import type { ColumnMapping } from '@/src/server/services/uploadParser'

interface ColumnMapperProps {
  headers: string[]
  sampleRows: Record<string, string>[]
  onMappingChange: (mapping: ColumnMapping) => void
}

const TARGET_FIELDS = [
  { value: '', label: 'Skip' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'personal_email', label: 'Personal Email' },
  { value: 'company', label: 'Company' },
  { value: 'position', label: 'Position' },
  { value: 'office_phone', label: 'Office Phone' },
  { value: 'mobile_phone', label: 'Mobile Phone' },
  { value: 'website', label: 'Website' },
  { value: 'description', label: 'Description' },
  { value: 'social_linkedin', label: 'LinkedIn' },
  { value: 'social_twitter', label: 'Twitter' },
] as const

const AUTO_DETECT_MAP: Record<string, string> = {
  'first name': 'first_name',
  'first_name': 'first_name',
  'firstname': 'first_name',
  'last name': 'last_name',
  'last_name': 'last_name',
  'lastname': 'last_name',
  'name': 'last_name',
  'email': 'email',
  'email address': 'email',
  'e-mail': 'email',
  'personal email': 'personal_email',
  'company': 'company',
  'organization': 'company',
  'org': 'company',
  'position': 'position',
  'title': 'position',
  'job title': 'position',
  'office phone': 'office_phone',
  'phone': 'office_phone',
  'mobile': 'mobile_phone',
  'mobile phone': 'mobile_phone',
  'cell': 'mobile_phone',
  'website': 'website',
  'url': 'website',
  'description': 'description',
  'notes': '',
  'linkedin': 'social_linkedin',
  'twitter': 'social_twitter',
}

function detectMapping(headers: string[]): ColumnMapping {
  return headers.reduce<ColumnMapping>((mapping, header) => {
    const normalized = header.toLowerCase().trim()
    const detected = AUTO_DETECT_MAP[normalized]
    return {
      ...mapping,
      [header]: detected !== undefined ? detected : '',
    }
  }, {})
}

export function ColumnMapper({ headers, sampleRows, onMappingChange }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => detectMapping(headers))

  useEffect(() => {
    onMappingChange(mapping)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFieldChange(header: string, value: string) {
    const updated = { ...mapping, [header]: value }
    setMapping(updated)
    onMappingChange(updated)
  }

  const previewRows = sampleRows.slice(0, 3)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Source Column
        </div>
        <div />
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Map To
        </div>

        {headers.map((header) => (
          <div key={header} className="contents">
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-sm font-medium text-gray-900">{header}</p>
              <div className="mt-1 space-y-0.5">
                {previewRows.map((row, i) => (
                  <p key={i} className="truncate text-xs text-gray-500">
                    {row[header] || '\u2014'}
                  </p>
                ))}
              </div>
            </div>

            <span className="text-gray-400">&rarr;</span>

            <select
              value={mapping[header] ?? ''}
              onChange={(e) => handleFieldChange(header, e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TARGET_FIELDS.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
