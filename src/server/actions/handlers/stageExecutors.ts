/**
 * Stage Executors - stub implementation
 * TODO: Implement full stage executors for campaign pipeline
 */

import type { StageExecutors, StageResult } from './interfaces'

export const stageExecutors: StageExecutors = {
  emailFinding: async (campaignId: string): Promise<StageResult> => {
    console.log('📧 Email finding stage - stub implementation', { campaignId })
    return {
      processedCount: 0,
      errors: [],
    }
  },

  inserts: async (campaignId: string): Promise<StageResult> => {
    console.log('📝 Inserts stage - stub implementation', { campaignId })
    return {
      processedCount: 0,
      errors: [],
    }
  },

  drafts: async (campaignId: string, templateId: string): Promise<StageResult> => {
    console.log('✏️ Drafts stage - stub implementation', { campaignId, templateId })
    return {
      processedCount: 0,
      errors: [],
    }
  },

  send: async (campaignId: string): Promise<StageResult> => {
    console.log('📤 Send stage - stub implementation', { campaignId })
    return {
      processedCount: 0,
      errors: [],
    }
  },
}
