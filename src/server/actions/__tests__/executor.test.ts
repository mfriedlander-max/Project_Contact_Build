import { describe, it, expect } from 'vitest'
import {
  validateModeForAction,
  requiresConfirmation,
  executeAction,
  type ExecutorContext,
} from '../executor'
import { AiActionType, AiMode, type AiActionRequest } from '../types'

describe('AI Action Executor', () => {
  describe('validateModeForAction', () => {
    it('should allow FIND_CONTACTS in CONTACT_FINDER mode', () => {
      const result = validateModeForAction(AiActionType.FIND_CONTACTS, AiMode.CONTACT_FINDER)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject FIND_CONTACTS in GENERAL_MANAGER mode', () => {
      const result = validateModeForAction(AiActionType.FIND_CONTACTS, AiMode.GENERAL_MANAGER)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('FIND_CONTACTS')
      expect(result.error).toContain('CONTACT_FINDER')
    })

    it('should reject FIND_CONTACTS in ASSISTANT mode', () => {
      const result = validateModeForAction(AiActionType.FIND_CONTACTS, AiMode.ASSISTANT)
      expect(result.valid).toBe(false)
    })

    it('should allow QUERY_CONTACTS in GENERAL_MANAGER mode', () => {
      const result = validateModeForAction(AiActionType.QUERY_CONTACTS, AiMode.GENERAL_MANAGER)
      expect(result.valid).toBe(true)
    })

    it('should allow QUERY_CONTACTS in ASSISTANT mode', () => {
      const result = validateModeForAction(AiActionType.QUERY_CONTACTS, AiMode.ASSISTANT)
      expect(result.valid).toBe(true)
    })

    it('should reject MOVE_STAGE in GENERAL_MANAGER mode', () => {
      const result = validateModeForAction(AiActionType.MOVE_STAGE, AiMode.GENERAL_MANAGER)
      expect(result.valid).toBe(false)
    })

    it('should allow MOVE_STAGE in ASSISTANT mode', () => {
      const result = validateModeForAction(AiActionType.MOVE_STAGE, AiMode.ASSISTANT)
      expect(result.valid).toBe(true)
    })

    it('should allow SHOW_STAGED_RESULTS in multiple modes', () => {
      const contactFinderResult = validateModeForAction(
        AiActionType.SHOW_STAGED_RESULTS,
        AiMode.CONTACT_FINDER
      )
      const generalManagerResult = validateModeForAction(
        AiActionType.SHOW_STAGED_RESULTS,
        AiMode.GENERAL_MANAGER
      )

      expect(contactFinderResult.valid).toBe(true)
      expect(generalManagerResult.valid).toBe(true)
    })

    it('should allow campaign runner actions only in ASSISTANT mode', () => {
      const emailFinding = validateModeForAction(AiActionType.RUN_EMAIL_FINDING, AiMode.ASSISTANT)
      const inserts = validateModeForAction(AiActionType.RUN_INSERTS, AiMode.ASSISTANT)
      const drafts = validateModeForAction(AiActionType.RUN_DRAFTS, AiMode.ASSISTANT)
      const sending = validateModeForAction(AiActionType.SEND_EMAILS, AiMode.ASSISTANT)

      expect(emailFinding.valid).toBe(true)
      expect(inserts.valid).toBe(true)
      expect(drafts.valid).toBe(true)
      expect(sending.valid).toBe(true)
    })

    it('should reject campaign runner actions in GENERAL_MANAGER mode', () => {
      const result = validateModeForAction(AiActionType.RUN_EMAIL_FINDING, AiMode.GENERAL_MANAGER)
      expect(result.valid).toBe(false)
    })
  })

  describe('requiresConfirmation', () => {
    it('should return true for APPROVE_STAGED_LIST', () => {
      expect(requiresConfirmation(AiActionType.APPROVE_STAGED_LIST)).toBe(true)
    })

    it('should return true for SEND_EMAILS', () => {
      expect(requiresConfirmation(AiActionType.SEND_EMAILS)).toBe(true)
    })

    it('should return true for DELETE_CONTACTS', () => {
      expect(requiresConfirmation(AiActionType.DELETE_CONTACTS)).toBe(true)
    })

    it('should return true for BULK_UPDATE', () => {
      expect(requiresConfirmation(AiActionType.BULK_UPDATE)).toBe(true)
    })

    it('should return false for FIND_CONTACTS', () => {
      expect(requiresConfirmation(AiActionType.FIND_CONTACTS)).toBe(false)
    })

    it('should return false for QUERY_CONTACTS', () => {
      expect(requiresConfirmation(AiActionType.QUERY_CONTACTS)).toBe(false)
    })

    it('should return false for MOVE_STAGE', () => {
      expect(requiresConfirmation(AiActionType.MOVE_STAGE)).toBe(false)
    })
  })

  describe('executeAction', () => {
    const baseContext: ExecutorContext = {
      userId: 'test-user-123',
      currentMode: AiMode.ASSISTANT,
    }

    it('should reject action when mode is invalid', async () => {
      const request: AiActionRequest<typeof AiActionType.FIND_CONTACTS> = {
        type: AiActionType.FIND_CONTACTS,
        payload: { query: 'tech founders' },
      }

      const result = await executeAction(request, baseContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('CONTACT_FINDER')
    })

    it('should return requiresConfirmation when action needs confirmation', async () => {
      const request: AiActionRequest<typeof AiActionType.DELETE_CONTACTS> = {
        type: AiActionType.DELETE_CONTACTS,
        payload: { contactIds: ['id1', 'id2'] },
      }

      const result = await executeAction(request, baseContext)

      expect(result.success).toBe(false)
      expect(result.requiresConfirmation).toBe(true)
      expect(result.confirmationMessage).toBeDefined()
    })

    it('should provide confirmation message for APPROVE_STAGED_LIST', async () => {
      const request: AiActionRequest<typeof AiActionType.APPROVE_STAGED_LIST> = {
        type: AiActionType.APPROVE_STAGED_LIST,
        payload: {
          campaignName: 'Test Campaign',
          keptContactIds: ['id1', 'id2', 'id3'],
        },
      }

      const context: ExecutorContext = {
        ...baseContext,
        currentMode: AiMode.CONTACT_FINDER,
      }

      const result = await executeAction(request, context)

      expect(result.requiresConfirmation).toBe(true)
      expect(result.confirmationMessage).toContain('Test Campaign')
      expect(result.confirmationMessage).toContain('3')
    })

    it('should provide confirmation message for DELETE_CONTACTS', async () => {
      const request: AiActionRequest<typeof AiActionType.DELETE_CONTACTS> = {
        type: AiActionType.DELETE_CONTACTS,
        payload: { contactIds: ['id1', 'id2'] },
      }

      const result = await executeAction(request, baseContext)

      expect(result.requiresConfirmation).toBe(true)
      expect(result.confirmationMessage).toContain('2')
      expect(result.confirmationMessage).toContain('cannot be undone')
    })

    it('should provide confirmation message for SEND_EMAILS', async () => {
      const request: AiActionRequest<typeof AiActionType.SEND_EMAILS> = {
        type: AiActionType.SEND_EMAILS,
        payload: { campaignId: 'campaign-123' },
      }

      const result = await executeAction(request, baseContext)

      expect(result.requiresConfirmation).toBe(true)
      expect(result.confirmationMessage).toContain('Send emails')
    })

    it('should provide confirmation message for BULK_UPDATE', async () => {
      const request: AiActionRequest<typeof AiActionType.BULK_UPDATE> = {
        type: AiActionType.BULK_UPDATE,
        payload: {
          contactIds: ['id1', 'id2', 'id3', 'id4'],
          updates: { industry: 'Tech' },
        },
      }

      const result = await executeAction(request, baseContext)

      expect(result.requiresConfirmation).toBe(true)
      expect(result.confirmationMessage).toContain('4')
    })

    it('should attempt execution when userConfirmed is true for confirmation-required action', async () => {
      const request: AiActionRequest<typeof AiActionType.DELETE_CONTACTS> = {
        type: AiActionType.DELETE_CONTACTS,
        payload: { contactIds: ['id1'] },
        userConfirmed: true,
      }

      const result = await executeAction(request, baseContext)

      // Phase 0: execution throws "not implemented" error
      expect(result.success).toBe(false)
      expect(result.error).toContain('not implemented')
      expect(result.requiresConfirmation).toBeUndefined()
    })

    it('should attempt execution for action not requiring confirmation', async () => {
      const request: AiActionRequest<typeof AiActionType.QUERY_CONTACTS> = {
        type: AiActionType.QUERY_CONTACTS,
        payload: { filters: { stage: 'LEAD' } },
      }

      const result = await executeAction(request, baseContext)

      // Phase 0: execution throws "not implemented" error
      expect(result.success).toBe(false)
      expect(result.error).toContain('not implemented')
    })

    it('should handle FIND_CONTACTS action stub', async () => {
      const request: AiActionRequest<typeof AiActionType.FIND_CONTACTS> = {
        type: AiActionType.FIND_CONTACTS,
        payload: { query: 'tech founders' },
      }

      const context: ExecutorContext = {
        ...baseContext,
        currentMode: AiMode.CONTACT_FINDER,
      }

      const result = await executeAction(request, context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('FIND_CONTACTS')
      expect(result.error).toContain('not implemented')
    })

    it('should handle APPROVE_STAGED_LIST action stub when confirmed', async () => {
      const request: AiActionRequest<typeof AiActionType.APPROVE_STAGED_LIST> = {
        type: AiActionType.APPROVE_STAGED_LIST,
        payload: {
          campaignName: 'Test Campaign',
          keptContactIds: ['id1'],
        },
        userConfirmed: true,
      }

      const context: ExecutorContext = {
        ...baseContext,
        currentMode: AiMode.CONTACT_FINDER,
      }

      const result = await executeAction(request, context)

      expect(result.success).toBe(false)
      expect(result.error).toContain('APPROVE_STAGED_LIST')
      expect(result.error).toContain('not implemented')
    })

    it('should handle RUN_EMAIL_FINDING action stub', async () => {
      const request: AiActionRequest<typeof AiActionType.RUN_EMAIL_FINDING> = {
        type: AiActionType.RUN_EMAIL_FINDING,
        payload: { campaignId: 'campaign-123' },
      }

      const result = await executeAction(request, baseContext)

      expect(result.success).toBe(false)
      expect(result.error).toContain('RUN_EMAIL_FINDING')
      expect(result.error).toContain('not implemented')
    })
  })

  describe('ExecutorContext type', () => {
    it('should have required userId and currentMode', () => {
      const context: ExecutorContext = {
        userId: 'user-123',
        currentMode: AiMode.GENERAL_MANAGER,
      }

      expect(context.userId).toBe('user-123')
      expect(context.currentMode).toBe(AiMode.GENERAL_MANAGER)
    })
  })
})
