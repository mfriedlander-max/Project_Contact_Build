'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Contact } from '../table-data/schema'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTableRowActions } from './data-table-row-actions'
import moment from 'moment'

// Workflow column identifiers for Student Networking CRM
export const WORKFLOW_COLUMN_IDS = [
  'company',
  'position',
  'email_confidence',
  'personalized_insert',
  'insert_confidence',
  'email_status',
  'connection_level',
  'campaign',
] as const

// Helper function to get column by id
export function getColumnById(id: string): ColumnDef<Contact> | undefined {
  return columns.find(
    (col) => col.id === id || (col as { accessorKey?: string }).accessorKey === id
  )
}

// Badge color mappings
const confidenceBadgeColors: Record<string, string> = {
  HIGH: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-red-100 text-red-800',
}

const emailStatusBadgeColors: Record<string, string> = {
  BLANK: 'bg-gray-100 text-gray-600',
  DRAFTED: 'bg-blue-100 text-blue-800',
  SENT: 'bg-green-100 text-green-800',
}

const connectionLevelBadgeColors: Record<string, string> = {
  NONE: 'bg-gray-100 text-gray-600',
  MESSAGE_SENT: 'bg-blue-100 text-blue-800',
  CONNECTED: 'bg-purple-100 text-purple-800',
  IN_TOUCH: 'bg-indigo-100 text-indigo-800',
  FRIENDS: 'bg-green-100 text-green-800',
}

const connectionLevelLabels: Record<string, string> = {
  NONE: 'None',
  MESSAGE_SENT: 'Message Sent',
  CONNECTED: 'Connected',
  IN_TOUCH: 'In Touch',
  FRIENDS: 'Friends',
}

export const columns: ColumnDef<Contact>[] = [
  {
    accessorKey: 'created_on',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date created" />,
    cell: ({ row }) => (
      <div className="w-[80px]">
        {row.getValue('created_on') ? moment(row.getValue('created_on')).format('YY-MM-DD') : '-'}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'first_name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="First Name" />,
    cell: ({ row }) => <div className="">{row.getValue('first_name') || '-'}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'last_name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last Name" />,
    cell: ({ row }) => <div className="">{row.getValue('last_name')}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <div className="max-w-[200px] truncate">{row.getValue('email') || '-'}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'company',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
    cell: ({ row }) => (
      <div className="max-w-[150px] truncate">{row.getValue('company') || '-'}</div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'position',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Position" />,
    cell: ({ row }) => (
      <div className="max-w-[150px] truncate">{row.getValue('position') || '-'}</div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'email_confidence',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email Confidence" />,
    cell: ({ row }) => {
      const value = row.getValue('email_confidence') as string | null
      if (!value) return <span className="text-gray-400">-</span>
      return <Badge className={confidenceBadgeColors[value] || 'bg-gray-100'}>{value}</Badge>
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'personalized_insert',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Personalized Insert" />,
    cell: ({ row }) => {
      const value = row.getValue('personalized_insert') as string | null
      if (!value) return <span className="text-gray-400">-</span>
      return (
        <div className="max-w-[200px] truncate" title={value}>
          {value}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: true,
  },
  {
    accessorKey: 'insert_confidence',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Insert Confidence" />,
    cell: ({ row }) => {
      const value = row.getValue('insert_confidence') as string | null
      if (!value) return <span className="text-gray-400">-</span>
      return <Badge className={confidenceBadgeColors[value] || 'bg-gray-100'}>{value}</Badge>
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'email_status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email Status" />,
    cell: ({ row }) => {
      const value = row.getValue('email_status') as string | null
      if (!value) return <span className="text-gray-400">-</span>
      return <Badge className={emailStatusBadgeColors[value] || 'bg-gray-100'}>{value}</Badge>
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'connection_level',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Connection Level" />,
    cell: ({ row }) => {
      const value = row.getValue('connection_level') as string | null
      if (!value) return <span className="text-gray-400">None</span>
      return (
        <Badge className={connectionLevelBadgeColors[value] || 'bg-gray-100'}>
          {connectionLevelLabels[value] || value}
        </Badge>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'campaign',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Campaign" />,
    cell: ({ row }) => (
      <div className="max-w-[120px] truncate">{row.getValue('campaign') || '-'}</div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'assigned_to_user',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Assigned to" />,
    cell: ({ row }) => (
      <div className="w-[150px]">{row.original.assigned_to_user?.name ?? 'Unassigned'}</div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <div className="">{row.original.status ? 'Active' : 'Inactive'}</div>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
]
