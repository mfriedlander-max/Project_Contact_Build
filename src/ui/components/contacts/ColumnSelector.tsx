'use client'

import { useState, useRef, useEffect } from 'react'

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

const STORAGE_KEY = 'sheets-visible-columns'

interface ColumnSelectorProps {
  visibleColumns: string[]
  onColumnsChange: (columns: string[]) => void
}

export function ColumnSelector({ visibleColumns, onColumnsChange }: ColumnSelectorProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          onColumnsChange(parsed as string[])
        }
      } catch {
        // ignore invalid JSON
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleToggle(columnKey: string, checked: boolean) {
    const next = checked
      ? [...visibleColumns, columnKey]
      : visibleColumns.filter((k) => k !== columnKey)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    onColumnsChange(next)
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Columns
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white py-2 shadow-lg">
          {COLUMNS.map((col) => {
            const isChecked = visibleColumns.includes(col.key)
            return (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={col.fixed ? true : isChecked}
                  disabled={col.fixed}
                  onChange={(e) => handleToggle(col.key, e.target.checked)}
                  className="rounded border-gray-300"
                />
                {col.label}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
