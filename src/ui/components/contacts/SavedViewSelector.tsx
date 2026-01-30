'use client'

export interface SavedView {
  id: string
  name: string
  filters: Record<string, unknown>
  sort?: Record<string, string>
  columns?: string[]
  isDefault?: boolean
}

interface SavedViewSelectorProps {
  savedViews: SavedView[]
  onSelectView: (view: SavedView) => void
  onSaveView: (data: {
    name: string
    filters: Record<string, unknown>
    sort?: Record<string, string>
    columns?: string[]
  }) => Promise<void>
  onDeleteView: (id: string) => Promise<void>
  isLoading?: boolean
}

export function SavedViewSelector({
  savedViews,
  onSelectView,
  onSaveView,
  onDeleteView,
  isLoading = false,
}: SavedViewSelectorProps) {
  const handleSave = async () => {
    const name = window.prompt('Enter a name for this view:')
    if (!name) return
    await onSaveView({ name, filters: {}, sort: undefined, columns: undefined })
  }

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this saved view?')
    if (!confirmed) return
    await onDeleteView(id)
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading...</div>
  }

  return (
    <div className="flex items-center gap-2">
      {savedViews.length === 0 ? (
        <span className="text-sm text-gray-500">No saved views</span>
      ) : (
        <ul className="flex items-center gap-1">
          {savedViews.map((view) => (
            <li key={view.id} className="flex items-center gap-1">
              <button
                type="button"
                className="rounded px-2 py-1 text-sm hover:bg-gray-100"
                onClick={() => onSelectView(view)}
              >
                {view.name}
              </button>
              <button
                type="button"
                aria-label={`Delete ${view.name}`}
                className="text-gray-400 hover:text-red-500 text-xs"
                onClick={() => handleDelete(view.id)}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
        onClick={handleSave}
      >
        Save Current View
      </button>
    </div>
  )
}
