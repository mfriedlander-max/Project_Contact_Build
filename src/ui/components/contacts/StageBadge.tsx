'use client'

import {
  ConnectionStage,
  CONNECTION_STAGE_ORDER,
  type ConnectionStageType,
} from '@/lib/types/enums'

const STAGE_CONFIG: Record<ConnectionStageType, { label: string; className: string }> = {
  [ConnectionStage.DRAFTED]: { label: 'Drafted', className: 'bg-gray-100 text-gray-700' },
  [ConnectionStage.MESSAGE_SENT]: { label: 'Message Sent', className: 'bg-blue-100 text-blue-700' },
  [ConnectionStage.DIDNT_CONNECT]: { label: "Didn't Connect", className: 'bg-yellow-100 text-yellow-700' },
  [ConnectionStage.CONNECTED]: { label: 'Connected', className: 'bg-green-100 text-green-700' },
  [ConnectionStage.IN_TOUCH]: { label: 'In Touch', className: 'bg-purple-100 text-purple-700' },
} as const

interface StageBadgeProps {
  stage: ConnectionStageType
  editable?: boolean
  onStageChange?: (newStage: ConnectionStageType) => void
}

function isBackwardMove(
  currentStage: ConnectionStageType,
  newStage: ConnectionStageType
): boolean {
  const currentIndex = CONNECTION_STAGE_ORDER.indexOf(currentStage)
  const newIndex = CONNECTION_STAGE_ORDER.indexOf(newStage)
  return newIndex < currentIndex
}

export function StageBadge({ stage, editable = false, onStageChange }: StageBadgeProps) {
  const config = STAGE_CONFIG[stage]

  if (editable && onStageChange) {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newStage = e.target.value as ConnectionStageType
      if (newStage === stage) return

      if (isBackwardMove(stage, newStage)) {
        const confirmed = window.confirm(
          `Move stage backward from "${STAGE_CONFIG[stage].label}" to "${STAGE_CONFIG[newStage].label}"?`
        )
        if (!confirmed) {
          e.target.value = stage
          return
        }
      }

      onStageChange(newStage)
    }

    return (
      <select
        value={stage}
        onChange={handleChange}
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
      >
        {CONNECTION_STAGE_ORDER.map((s) => (
          <option key={s} value={s}>
            {STAGE_CONFIG[s].label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
