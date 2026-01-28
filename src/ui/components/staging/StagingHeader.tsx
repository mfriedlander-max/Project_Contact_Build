'use client'

interface StagingHeaderProps {
  query: string
  count: number
  onApprove: () => void
  onClear: () => void
}

export function StagingHeader({ query, count, onApprove, onClear }: StagingHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Query:</span>
        <span className="font-medium text-gray-900">{query}</span>
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
          {count}
        </span>
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
          className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
        >
          Approve
        </button>
      </div>
    </div>
  )
}
