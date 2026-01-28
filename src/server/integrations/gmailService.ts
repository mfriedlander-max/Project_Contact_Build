/**
 * Gmail Service
 * Handles OAuth, draft creation, sending, and sync
 *
 * Implementation in Phase 2 (Tasks 29, 30, 31)
 */

export interface GmailDraft {
  id: string
  threadId: string
  messageId: string
}

export interface CreateDraftOptions {
  to: string
  subject: string
  body: string
  labelNames: string[] // e.g., ['Student Networking CRM', 'Campaign — Tech PMs']
}

export interface SendOptions {
  draftId: string
}

export const gmailService = {
  /**
   * Check if Gmail is connected for user
   */
  isConnected: async (_userId: string): Promise<boolean> => {
    // TODO: Check IntegrationConnection for GMAIL with valid tokens
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Ensure labels exist, create if needed
   */
  ensureLabels: async (
    _userId: string,
    _labelNames: string[]
  ): Promise<void> => {
    // TODO: Use Gmail API to create labels
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Create a draft email
   */
  createDraft: async (
    _userId: string,
    _options: CreateDraftOptions
  ): Promise<GmailDraft> => {
    // TODO: Use Gmail API to create draft with labels
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Send a draft
   */
  sendDraft: async (_userId: string, _options: SendOptions): Promise<void> => {
    // TODO: Use Gmail API to send draft
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Check if a draft has been sent (for polling sync)
   */
  isDraftSent: async (_userId: string, _draftId: string): Promise<boolean> => {
    // TODO: Check if draft no longer exists (means it was sent)
    throw new Error('Not implemented - Phase 2')
  },

  /**
   * Sync sent status for contacts
   * Called by polling job
   */
  syncSentStatus: async (
    _userId: string
  ): Promise<{ updatedCount: number }> => {
    // TODO: Check contacts with gmailDraftId, update to MESSAGE_SENT if sent
    throw new Error('Not implemented - Phase 2')
  },
}
