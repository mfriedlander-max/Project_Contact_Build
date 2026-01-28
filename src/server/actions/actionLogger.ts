/**
 * Action Logger
 * In-memory action logging (replaced with DB in Phase 3)
 */

import type { AiActionTypeValue } from '@/lib/types/enums'

export interface ActionLogEntry {
  actionType: AiActionTypeValue
  userId: string
  timestamp: Date
  success: boolean
  error?: string
}

interface LogInput {
  actionType: AiActionTypeValue
  userId: string
  success: boolean
  error?: string
}

export interface ActionStats {
  totalActions: number
  successRate: number
  byType: Partial<Record<AiActionTypeValue, number>>
}

export function createActionLogger() {
  const entries: ActionLogEntry[] = []

  return {
    logAction(input: LogInput): void {
      const entry: ActionLogEntry = {
        ...input,
        timestamp: new Date(),
      }
      entries.push(entry)
    },

    getRecentActions(userId: string, limit: number): ReadonlyArray<ActionLogEntry> {
      return entries
        .filter((e) => e.userId === userId)
        .reverse()
        .slice(0, limit)
    },

    getActionStats(userId: string): ActionStats {
      const userEntries = entries.filter((e) => e.userId === userId)

      if (userEntries.length === 0) {
        return { totalActions: 0, successRate: 0, byType: {} }
      }

      const successCount = userEntries.filter((e) => e.success).length
      const byType: Partial<Record<AiActionTypeValue, number>> = {}

      for (const entry of userEntries) {
        byType[entry.actionType] = (byType[entry.actionType] ?? 0) + 1
      }

      return {
        totalActions: userEntries.length,
        successRate: successCount / userEntries.length,
        byType,
      }
    },
  }
}
