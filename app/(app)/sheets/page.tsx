'use client'

import { useState, useEffect } from 'react'
import { ContactGrid } from '@/src/ui/components/contacts/ContactGrid'
import { ColumnSelector } from '@/src/ui/components/contacts/ColumnSelector'
import { SavedViewSelector } from '@/src/ui/components/contacts/SavedViewSelector'
import type { SavedView } from '@/src/ui/components/contacts/SavedViewSelector'
import { ConnectionStage, CONNECTION_STAGE_ORDER, type ConnectionStageType } from '@/lib/types/enums'
import { useContacts } from '@/src/ui/hooks/useContacts'
import { useSavedViews } from '@/src/ui/hooks/useSavedViews'

const STAGE_LABELS: Record<ConnectionStageType, string> = {
  [ConnectionStage.DRAFTED]: 'Drafted',
  [ConnectionStage.MESSAGE_SENT]: 'Message Sent',
  [ConnectionStage.DIDNT_CONNECT]: "Didn't Connect",
  [ConnectionStage.CONNECTED]: 'Connected',
  [ConnectionStage.IN_TOUCH]: 'In Touch',
}

const DEFAULT_VISIBLE_COLUMNS = ['company', 'email_status', 'mobile_phone']

export default function SheetsPage() {
  const [activeStage, setActiveStage] = useState<ConnectionStageType>(ConnectionStage.DRAFTED)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS)

  const { savedViews, createView, deleteView, isLoading: viewsLoading } = useSavedViews()

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { contacts, total, totalPages, isLoading, error, updateContactStage } = useContacts({
    stage: activeStage,
    search: search || undefined,
    sort: sortColumn,
    order: sortColumn ? sortOrder : undefined,
    page,
  })

  function handleSort(column: string) {
    if (sortColumn === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortOrder('asc')
    }
    setPage(1)
  }

  function handleSelectView(view: SavedView) {
    if (view.columns) {
      setVisibleColumns(view.columns)
    }
    if (view.sort) {
      const sortKey = Object.keys(view.sort)[0]
      if (sortKey) {
        setSortColumn(sortKey)
        setSortOrder((view.sort[sortKey] as 'asc' | 'desc') ?? 'asc')
      }
    }
    setPage(1)
  }

  async function handleSaveView(data: {
    name: string
    filters: Record<string, unknown>
    sort?: Record<string, string>
    columns?: string[]
  }) {
    await createView({
      name: data.name,
      filters: data.filters,
      sort: sortColumn ? { [sortColumn]: sortOrder } : undefined,
      columns: visibleColumns,
    })
  }

  async function handleDeleteView(id: string) {
    await deleteView(id)
  }

  function handleStageChange(contactId: string, newStage: ConnectionStageType) {
    updateContactStage(contactId, newStage)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sheets</h1>
        <div className="flex items-center gap-3">
          <ColumnSelector
            visibleColumns={visibleColumns}
            onColumnsChange={setVisibleColumns}
          />
          <SavedViewSelector
            savedViews={savedViews}
            onSelectView={handleSelectView}
            onSaveView={handleSaveView}
            onDeleteView={handleDeleteView}
            isLoading={viewsLoading}
          />
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search contacts..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="mb-4 flex gap-1 border-b border-gray-200" role="tablist" aria-label="Connection stages">
        {CONNECTION_STAGE_ORDER.map((stage) => (
          <button
            key={stage}
            role="tab"
            aria-selected={activeStage === stage}
            onClick={() => {
              setActiveStage(stage)
              setPage(1)
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeStage === stage
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {STAGE_LABELS[stage]}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <ContactGrid
        contacts={contacts}
        visibleColumns={visibleColumns}
        sortColumn={sortColumn}
        sortOrder={sortOrder}
        onSort={handleSort}
        onStageChange={handleStageChange}
        isLoading={isLoading}
      />

      {totalPages > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
