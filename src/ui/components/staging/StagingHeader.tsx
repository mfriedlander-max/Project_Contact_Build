'use client'

interface StagingHeaderProps {
  query: string
  count: number
  selectedCount: number
  onApprove: () => void
  onClear: () => void
  onSelectAll: () => void
  allSelected: boolean
}

export function StagingHeader({
  query,
  count,
  selectedCount,
  onApprove,
  onClear,
  onSelectAll,
  allSelected
}: StagingHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onSelectAll}
          aria-label="Select all contacts"
          className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
        />
        <span className="text-gray-500">Query:</span>
        <span className="font-medium text-gray-900">{query}</span>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
          {count}
        </span>
        {selectedCount > 0 && (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            {selectedCount} selected
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onClear}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Clear
        </button>
        <button
          onClick={onApprove}
          disabled={selectedCount === 0}
          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Create Campaign
        </button>
      </div>
    </div>
  )
}
