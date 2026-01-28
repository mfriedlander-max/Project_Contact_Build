import { describe, it, expect } from 'vitest'
import {
  // Types
  AiMode,
  AiActionType,
  ACTION_MODE_REQUIREMENTS,
  ACTIONS_REQUIRING_CONFIRMATION,
  FindContactsPayloadSchema,
  ApproveListPayloadSchema,
  // Executor
  executeAction,
  validateModeForAction,
  requiresConfirmation,
  // Campaign Runner
  campaignRunner,
  CampaignRunState,
  // Types (re-exported)
  type AiActionRequest,
  type AiActionResult,
  type AiActionPayloads,
  type ExecutorContext,
  type CampaignRunProgress,
} from '../index'

describe('Action System Barrel Exports', () => {
  describe('Types exports', () => {
    it('should export AiMode enum', () => {
      expect(AiMode.CONTACT_FINDER).toBeDefined()
      expect(AiMode.GENERAL_MANAGER).toBeDefined()
      expect(AiMode.ASSISTANT).toBeDefined()
    })

    it('should export AiActionType enum', () => {
      expect(AiActionType.FIND_CONTACTS).toBeDefined()
      expect(AiActionType.QUERY_CONTACTS).toBeDefined()
      expect(AiActionType.MOVE_STAGE).toBeDefined()
    })

    it('should export ACTION_MODE_REQUIREMENTS', () => {
      expect(ACTION_MODE_REQUIREMENTS).toBeDefined()
      expect(ACTION_MODE_REQUIREMENTS[AiActionType.FIND_CONTACTS]).toContain(AiMode.CONTACT_FINDER)
    })

    it('should export ACTIONS_REQUIRING_CONFIRMATION', () => {
      expect(ACTIONS_REQUIRING_CONFIRMATION).toBeDefined()
      expect(ACTIONS_REQUIRING_CONFIRMATION).toContain(AiActionType.DELETE_CONTACTS)
    })

    it('should export Zod schemas', () => {
      expect(FindContactsPayloadSchema).toBeDefined()
      expect(ApproveListPayloadSchema).toBeDefined()
    })
  })

  describe('Executor exports', () => {
    it('should export executeAction', () => {
      expect(executeAction).toBeDefined()
      expect(typeof executeAction).toBe('function')
    })

    it('should export validateModeForAction', () => {
      expect(validateModeForAction).toBeDefined()
      expect(typeof validateModeForAction).toBe('function')
    })

    it('should export requiresConfirmation', () => {
      expect(requiresConfirmation).toBeDefined()
      expect(typeof requiresConfirmation).toBe('function')
    })
  })

  describe('Campaign Runner exports', () => {
    it('should export campaignRunner object', () => {
      expect(campaignRunner).toBeDefined()
      expect(campaignRunner.isRunning).toBeDefined()
      expect(campaignRunner.getStatus).toBeDefined()
      expect(campaignRunner.startEmailFinding).toBeDefined()
      expect(campaignRunner.startInserts).toBeDefined()
      expect(campaignRunner.startDrafts).toBeDefined()
      expect(campaignRunner.startSending).toBeDefined()
      expect(campaignRunner.canTransition).toBeDefined()
    })

    it('should export CampaignRunState enum', () => {
      expect(CampaignRunState).toBeDefined()
      expect(CampaignRunState.IDLE).toBe('IDLE')
      expect(CampaignRunState.COMPLETE).toBe('COMPLETE')
    })
  })

  describe('Type exports (compile-time check)', () => {
    it('should allow using AiActionRequest type', () => {
      const request: AiActionRequest<typeof AiActionType.FIND_CONTACTS> = {
        type: AiActionType.FIND_CONTACTS,
        payload: { query: 'test' },
      }
      expect(request.type).toBe(AiActionType.FIND_CONTACTS)
    })

    it('should allow using AiActionResult type', () => {
      const result: AiActionResult<string> = {
        success: true,
        data: 'test',
      }
      expect(result.success).toBe(true)
    })

    it('should allow using ExecutorContext type', () => {
      const context: ExecutorContext = {
        userId: 'user-123',
        currentMode: AiMode.ASSISTANT,
      }
      expect(context.userId).toBe('user-123')
    })

    it('should allow using CampaignRunProgress type', () => {
      const progress: CampaignRunProgress = {
        campaignId: 'campaign-123',
        state: CampaignRunState.IDLE,
        processedCount: 0,
        totalCount: 10,
        errors: [],
      }
      expect(progress.state).toBe(CampaignRunState.IDLE)
    })

    it('should allow using AiActionPayloads type', () => {
      const payload: AiActionPayloads[typeof AiActionType.FIND_CONTACTS] = {
        query: 'test',
        maxResults: 20,
      }
      expect(payload.query).toBe('test')
    })
  })
})
