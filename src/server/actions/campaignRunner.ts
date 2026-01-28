/**
 * Campaign Runner State Machine
 * Manages sequential execution of campaign pipeline stages
 */

import {
  CampaignRunState,
  CAMPAIGN_RUN_STATE_TRANSITIONS,
  type CampaignRunStateType,
} from '@/lib/types/enums'

// Re-export for consumers
export { CampaignRunState }
export type { CampaignRunStateType }

/**
 * Valid state transitions - using central definition
 */
export const VALID_TRANSITIONS: Record<CampaignRunStateType, CampaignRunStateType[]> =
  CAMPAIGN_RUN_STATE_TRANSITIONS

export interface CampaignRunProgress {
  campaignId: string
  state: CampaignRunStateType
  processedCount: number
  totalCount: number
  errors: Array<{ contactId: string; error: string; stage: CampaignRunStateType }>
  startedAt?: Date
  completedAt?: Date
}

const MAX_CONTACTS = 30

const TERMINAL_STATES: ReadonlyArray<CampaignRunStateType> = [
  CampaignRunState.COMPLETE,
  CampaignRunState.FAILED,
  CampaignRunState.IDLE,
]

/**
 * Dependency interfaces for testability
 */
export interface CampaignRunStore {
  getActiveRun(userId: string): Promise<CampaignRunProgress | null>
  getRun(campaignId: string): Promise<CampaignRunProgress | null>
  createRun(progress: CampaignRunProgress): Promise<void>
  updateRun(progress: CampaignRunProgress): Promise<void>
}

export interface CampaignService {
  getContactCount(campaignId: string): Promise<number>
}

interface CampaignRunnerDeps {
  store: CampaignRunStore
  campaignService?: CampaignService
}

function isTerminalState(state: CampaignRunStateType): boolean {
  return TERMINAL_STATES.includes(state)
}

async function ensureNotRunning(store: CampaignRunStore, userId: string): Promise<void> {
  const active = await store.getActiveRun(userId)
  if (active && !isTerminalState(active.state)) {
    throw new Error('Another campaign is already running')
  }
}

async function startStage(
  deps: CampaignRunnerDeps,
  userId: string,
  campaignId: string,
  state: CampaignRunStateType
): Promise<CampaignRunProgress> {
  const { store, campaignService } = deps
  await ensureNotRunning(store, userId)

  const contactCount = campaignService
    ? await campaignService.getContactCount(campaignId)
    : 0

  if (state === CampaignRunState.EMAIL_FINDING_RUNNING && contactCount > MAX_CONTACTS) {
    throw new Error(`Campaign contact count (${contactCount}) exceeds maximum of 30`)
  }

  const progress: CampaignRunProgress = {
    campaignId,
    state,
    processedCount: 0,
    totalCount: contactCount,
    errors: [],
    startedAt: new Date(),
  }

  await store.createRun(progress)
  return progress
}

/**
 * Create a campaign runner with injected dependencies
 */
export function createCampaignRunner(deps: CampaignRunnerDeps) {
  return {
    isRunning: async (userId: string): Promise<boolean> => {
      const active = await deps.store.getActiveRun(userId)
      return active !== null && !isTerminalState(active.state)
    },

    getStatus: async (campaignId: string): Promise<CampaignRunProgress | null> => {
      return deps.store.getRun(campaignId)
    },

    startEmailFinding: (userId: string, campaignId: string) =>
      startStage(deps, userId, campaignId, CampaignRunState.EMAIL_FINDING_RUNNING),

    startInserts: (userId: string, campaignId: string) =>
      startStage(deps, userId, campaignId, CampaignRunState.INSERTS_RUNNING),

    startDrafts: (userId: string, campaignId: string, _templateId: string) =>
      startStage(deps, userId, campaignId, CampaignRunState.DRAFTS_RUNNING),

    startSending: (userId: string, campaignId: string) =>
      startStage(deps, userId, campaignId, CampaignRunState.SENDING_RUNNING),

    transition: async (
      campaignId: string,
      from: CampaignRunStateType,
      to: CampaignRunStateType
    ): Promise<CampaignRunProgress> => {
      const existing = await deps.store.getRun(campaignId)
      if (!existing) {
        throw new Error('No run found for campaign')
      }

      if (existing.state !== from) {
        throw new Error(
          `Current state mismatch: expected ${from}, got ${existing.state}`
        )
      }

      if (!VALID_TRANSITIONS[from].includes(to)) {
        throw new Error(`Invalid state transition from ${from} to ${to}`)
      }

      const updated: CampaignRunProgress = {
        ...existing,
        state: to,
        completedAt: to === CampaignRunState.COMPLETE ? new Date() : existing.completedAt,
      }

      await deps.store.updateRun(updated)
      return updated
    },

    canTransition: (from: CampaignRunStateType, to: CampaignRunStateType): boolean => {
      return VALID_TRANSITIONS[from].includes(to)
    },
  }
}

/**
 * Default campaign runner with Prisma-backed store
 */
import { prismadb } from '@/lib/prisma'
import { createPrismaCampaignRunStore } from '@/src/server/services/campaignRunStore'

const defaultStore = createPrismaCampaignRunStore(prismadb)
const defaultCampaignService = {
  getContactCount: async (campaignId: string) => {
    return prismadb.crm_Contacts.count({ where: { campaignId } })
  },
}

export const campaignRunner = createCampaignRunner({
  store: defaultStore,
  campaignService: defaultCampaignService,
})
