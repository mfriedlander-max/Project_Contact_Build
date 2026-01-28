'use client'

import { ConnectionStage, type ConnectionStageType } from '@/lib/types/enums'

const STAGE_CONFIG: Record<ConnectionStageType, { label: string; className: string }> = {
  [ConnectionStage.DRAFTED]: { label: 'Drafted', className: 'bg-gray-100 text-gray-700' },
  [ConnectionStage.MESSAGE_SENT]: { label: 'Message Sent', className: 'bg-blue-100 text-blue-700' },
  [ConnectionStage.DIDNT_CONNECT]: { label: "Didn't Connect", className: 'bg-yellow-100 text-yellow-700' },
  [ConnectionStage.CONNECTED]: { label: 'Connected', className: 'bg-green-100 text-green-700' },
  [ConnectionStage.IN_TOUCH]: { label: 'In Touch', className: 'bg-purple-100 text-purple-700' },
} as const

interface StageBadgeProps {
  stage: ConnectionStageType
}

export function StageBadge({ stage }: StageBadgeProps) {
  const config = STAGE_CONFIG[stage]
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
