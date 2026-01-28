/**
 * Campaign Runner State Machine
 * Manages sequential execution of campaign pipeline stages
 *
 * Implementation in Phase 2 (Task 17)
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
 * Note: We expose a local alias for backward compatibility
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

/**
 * Campaign Runner
 * Enforces single active campaign and sequential processing
 */
export const campaignRunner = {
  /**
   * Check if any campaign is currently running
   */
  isRunning: async (_userId: string): Promise<boolean> => {
    // TODO: Check CampaignRun table for active runs
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Get current run status
   */
  getStatus: async (_campaignId: string): Promise<CampaignRunProgress | null> => {
    // TODO: Fetch from CampaignRun table
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Start email finding stage
   * Validates no other campaign is running, max 30 contacts
   */
  startEmailFinding: async (
    _userId: string,
    _campaignId: string
  ): Promise<CampaignRunProgress> => {
    // TODO:
    // 1. Check no other campaign running
    // 2. Check campaign has <= 30 contacts
    // 3. Create/update CampaignRun to EMAIL_FINDING_RUNNING
    // 4. Process contacts sequentially with Hunter
    // 5. Update progress after each contact
    // 6. Transition to INSERTS_RUNNING or FAILED
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Start inserts generation stage
   */
  startInserts: async (_userId: string, _campaignId: string): Promise<CampaignRunProgress> => {
    // TODO:
    // 1. Fetch pages for each contact
    // 2. Generate insert with Anthropic
    // 3. Update contact with personalized_insert
    // 4. Transition to DRAFTS_RUNNING or FAILED
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Start draft creation stage
   */
  startDrafts: async (
    _userId: string,
    _campaignId: string,
    _templateId: string
  ): Promise<CampaignRunProgress> => {
    // TODO:
    // 1. Render template with inserts + availability
    // 2. Create Gmail drafts with labels
    // 3. Update contacts with gmailDraftId
    // 4. Transition to COMPLETE or FAILED
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Start sending stage (Assistant mode only)
   */
  startSending: async (_userId: string, _campaignId: string): Promise<CampaignRunProgress> => {
    // TODO:
    // 1. Send each draft via Gmail
    // 2. Move contacts to MESSAGE_SENT stage
    // 3. Set lastContactedAt
    // 4. Transition to COMPLETE or FAILED
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Validate state transition
   */
  canTransition: (from: CampaignRunStateType, to: CampaignRunStateType): boolean => {
    return VALID_TRANSITIONS[from].includes(to)
  },
}
