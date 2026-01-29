/**
 * Prisma-backed CampaignRunStore
 * Implements CampaignRunStore interface for persistent campaign run tracking
 */

import type { PrismaClient } from '@prisma/client'
import {
  CampaignRunState,
  type CampaignRunStateType,
} from '@/lib/types/enums'
import type { CampaignRunStore, CampaignRunProgress } from '@/src/server/actions/campaignRunner'

const TERMINAL_STATES: ReadonlyArray<CampaignRunStateType> = [
  CampaignRunState.COMPLETE,
  CampaignRunState.FAILED,
  CampaignRunState.IDLE,
]

/**
 * Map a Prisma CampaignRun record to a CampaignRunProgress object
 */
function toProgress(run: {
  campaignId: string
  state: string
  startedAt: Date | null
  completedAt: Date | null
  emailsFindingTotal: number
  emailsFindingComplete: number
  insertsTotal: number
  insertsComplete: number
  draftsTotal: number
  draftsComplete: number
  sendingTotal: number
  sendingComplete: number
  errorMessage: string | null
}): CampaignRunProgress {
  const state = run.state as CampaignRunStateType
  const { processedCount, totalCount } = getCountsForState(state, run)

  return {
    campaignId: run.campaignId,
    state,
    processedCount,
    totalCount,
    errors: run.errorMessage
      ? [{ contactId: '', error: run.errorMessage, stage: state }]
      : [],
    startedAt: run.startedAt ?? undefined,
    completedAt: run.completedAt ?? undefined,
  }
}

/**
 * Get the relevant processed/total counts based on current state
 */
function getCountsForState(
  state: CampaignRunStateType,
  run: {
    emailsFindingTotal: number
    emailsFindingComplete: number
    insertsTotal: number
    insertsComplete: number
    draftsTotal: number
    draftsComplete: number
    sendingTotal: number
    sendingComplete: number
  }
): { processedCount: number; totalCount: number } {
  switch (state) {
    case CampaignRunState.EMAIL_FINDING_RUNNING:
      return { processedCount: run.emailsFindingComplete, totalCount: run.emailsFindingTotal }
    case CampaignRunState.INSERTS_RUNNING:
      return { processedCount: run.insertsComplete, totalCount: run.insertsTotal }
    case CampaignRunState.DRAFTS_RUNNING:
      return { processedCount: run.draftsComplete, totalCount: run.draftsTotal }
    case CampaignRunState.SENDING_RUNNING:
      return { processedCount: run.sendingComplete, totalCount: run.sendingTotal }
    case CampaignRunState.COMPLETE:
      return { processedCount: run.sendingComplete, totalCount: run.sendingTotal }
    default:
      return { processedCount: 0, totalCount: 0 }
  }
}

/**
 * Map progress state back to Prisma update fields
 */
function toUpdateData(progress: CampaignRunProgress) {
  const base: Record<string, unknown> = {
    state: progress.state,
    completedAt: progress.completedAt ?? null,
    errorMessage: progress.errors.length > 0
      ? progress.errors.map((e) => e.error).join('; ')
      : null,
  }

  switch (progress.state) {
    case CampaignRunState.EMAIL_FINDING_RUNNING:
      return { ...base, emailsFindingTotal: progress.totalCount, emailsFindingComplete: progress.processedCount }
    case CampaignRunState.INSERTS_RUNNING:
      return { ...base, insertsTotal: progress.totalCount, insertsComplete: progress.processedCount }
    case CampaignRunState.DRAFTS_RUNNING:
      return { ...base, draftsTotal: progress.totalCount, draftsComplete: progress.processedCount }
    case CampaignRunState.SENDING_RUNNING:
      return { ...base, sendingTotal: progress.totalCount, sendingComplete: progress.processedCount }
    default:
      return base
  }
}

/**
 * Create a Prisma-backed CampaignRunStore
 */
export function createPrismaCampaignRunStore(prisma: PrismaClient): CampaignRunStore {
  return {
    async getActiveRun(userId: string): Promise<CampaignRunProgress | null> {
      const run = await prisma.campaignRun.findFirst({
        where: {
          campaign: { userId },
          state: { notIn: TERMINAL_STATES as CampaignRunStateType[] },
        },
        orderBy: { createdAt: 'desc' },
      })

      return run ? toProgress(run) : null
    },

    async getRun(campaignId: string): Promise<CampaignRunProgress | null> {
      const run = await prisma.campaignRun.findFirst({
        where: { campaignId },
        orderBy: { createdAt: 'desc' },
      })

      return run ? toProgress(run) : null
    },

    async createRun(progress: CampaignRunProgress): Promise<void> {
      await prisma.campaignRun.create({
        data: {
          campaignId: progress.campaignId,
          state: progress.state,
          startedAt: progress.startedAt ?? new Date(),
          ...toUpdateData(progress),
        },
      })
    },

    async updateRun(progress: CampaignRunProgress): Promise<void> {
      const existing = await prisma.campaignRun.findFirst({
        where: { campaignId: progress.campaignId },
        orderBy: { createdAt: 'desc' },
      })

      if (!existing) {
        throw new Error(`No run found for campaign ${progress.campaignId}`)
      }

      await prisma.campaignRun.update({
        where: { id: existing.id },
        data: toUpdateData(progress),
      })
    },
  }
}
